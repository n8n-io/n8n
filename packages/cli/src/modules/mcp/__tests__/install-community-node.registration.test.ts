import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { ExecutionsConfig, GlobalConfig, WorkflowsConfig } from '@n8n/config';
import { ExecutionRepository, ProjectRepository, SharedWorkflowRepository, User } from '@n8n/db';
import { InstanceSettings } from 'n8n-core';

import { ActiveExecutions } from '@/active-executions';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { EventService } from '@/events/event.service';
import { ExecutionService } from '@/executions/execution.service';
import { ExecutionListService } from '@/executions/execution-list.service';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { NodeCatalogService } from '@/node-catalog';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
import { AiGatewayService } from '@/services/ai-gateway.service';
import { AiPreferenceService } from '@/services/ai-preference.service';
import { FolderFinderService } from '@/services/folder-finder.service';
import { FolderService } from '@/services/folder.service';
import { NodeResourceExplorerService } from '@/services/node-resource-explorer.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { TagService } from '@/services/tag.service';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { McpPostSaveMetricsService } from '../mcp-post-save-metrics.service';
import { BUILDER_TOOLS, TOOLS_BY_SCOPE } from '../mcp-scopes';
import { McpConfig } from '../mcp.config';
import { McpService, type McpFeatureFlags } from '../mcp.service';

vi.mock('@n8n/mcp-apps/server', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/mcp-apps/server')>()),
	registerWorkflowPreviewApp: vi.fn(),
}));

import { MCP_INSTANCE_SCOPES } from '@n8n/api-types';
import { Container } from '@n8n/di';
import * as permissions from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { CommunityNodeTypesService } from '@/modules/community-packages/community-node-types.service';
import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';
import { CommunityPackagesLifecycleService } from '@/modules/community-packages/community-packages.lifecycle.service';

import type { McpAuthContext } from '../mcp.types';

vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof permissions>()),
	hasGlobalScope: vi.fn(),
}));

const hasGlobalScope = vi.mocked(permissions.hasGlobalScope);

const mcpFeatureFlags = (overrides: Partial<McpFeatureFlags> = {}): McpFeatureFlags => ({
	mcpApps: { enabled: false, variant: 'unassigned' },
	instanceContextEnabled: false,
	aiPreferencesEnabled: false,
	...overrides,
});

const getRegisteredToolNames = (server: unknown): Set<string> =>
	new Set(Object.keys((server as { _registeredTools: Record<string, unknown> })._registeredTools));

const TOOL = 'install_community_node';

/** A scope-bearing grant that includes the install scope. */
const OAUTH_WITH_INSTALL: McpAuthContext = {
	grantedScopes: [...MCP_INSTANCE_SCOPES],
};

/**
 * Registration guard for `install_community_node`.
 *
 * `COMMUNITY_PACKAGE_TOOLS` exempts this tool from the scope-map drift guards
 * in mcp-scopes.test.ts, because none of its conditions hold in that bare
 * harness. Without this file that exemption would mean nothing checks the tool
 * ever registers, so renaming it would silently remove it for every client.
 */
describe('install_community_node registration', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const buildService = ({
		builderEnabled = true,
		managedByEnv = false,
	}: { builderEnabled?: boolean; managedByEnv?: boolean } = {}) =>
		new McpService(
			mockLogger(),
			mockInstance(ExecutionsConfig, { mode: 'regular' }),
			mockInstance(InstanceSettings, { hostId: 'test-host-id', instanceId: 'test-instance-id' }),
			mockInstance(WorkflowFinderService),
			mockInstance(WorkflowService),
			mockInstance(UrlService),
			mockInstance(CredentialsService),
			mockInstance(ActiveExecutions),
			mockInstance(GlobalConfig, {
				endpoints: {
					webhook: '/webhook',
					webhookTest: '/webhook-test',
					rest: 'rest',
					mcpBuilderEnabled: builderEnabled,
				},
				tags: { disabled: false },
				diagnostics: { enabled: false, frontendConfig: '' },
				instanceSettingsLoader: { communityPackagesManagedByEnv: managedByEnv },
			}),
			mockInstance(Telemetry),
			mockInstance(WorkflowRunner),
			mockInstance(RoleService),
			mockInstance(ProjectService),
			mockInstance(NodeCatalogService),
			mockInstance(WorkflowCreationService),
			mockInstance(NodeTypes),
			mockInstance(ProjectRepository),
			mockInstance(FolderFinderService),
			mockInstance(SharedWorkflowRepository),
			mockInstance(ExecutionRepository),
			mockInstance(ExecutionService),
			mockInstance(ExecutionListService),
			mockInstance(DataTableProxyService),
			mockInstance(CollaborationService),
			mockInstance(NodeResourceExplorerService),
			mockInstance(TagService),
			mockInstance(LicenseState, {
				isFoldersLicensed: vi.fn().mockReturnValue(true),
			}),
			mockInstance(PostHogClient),
			mockInstance(WorkflowHistoryService),
			mockInstance(WorkflowsConfig),
			mockInstance(WorkflowPublishedDataService),
			mockInstance(SubworkflowPolicyChecker),
			mockInstance(AiGatewayService, {
				isAvailable: vi.fn().mockResolvedValue({ available: false }),
			}),
			mockInstance(McpPostSaveMetricsService),
			mockInstance(ModuleRegistry, {
				isActive: vi.fn().mockImplementation((name: string) => name === 'community-packages'),
			}),
			mockInstance(EventService),
			mockInstance(FolderService),
			mockInstance(AiPreferenceService),
			mockInstance(McpConfig, { communityNodeDiscoveryEnabled: true }),
		);

	beforeEach(() => {
		vi.clearAllMocks();
		hasGlobalScope.mockReturnValue(true);
		Container.set(
			CommunityPackagesConfig,
			mock<CommunityPackagesConfig>({ enabled: true, verifiedEnabled: true }),
		);
		// Resolved through dynamic imports inside registerInstallCommunityNodeTool,
		// so they have to be in the container before getServer runs.
		Container.set(CommunityNodeTypesService, mock<CommunityNodeTypesService>());
		Container.set(CommunityPackagesLifecycleService, mock<CommunityPackagesLifecycleService>());
	});

	const registeredWith = async (
		auth: McpAuthContext | undefined,
		opts: { builderEnabled?: boolean; managedByEnv?: boolean } = {},
	) => {
		const server = await buildService(opts).getServer(user, mcpFeatureFlags(), undefined, auth);
		return getRegisteredToolNames(server);
	};

	it('registers the tool when every condition holds', async () => {
		expect(await registeredWith(OAUTH_WITH_INSTALL)).toContain(TOOL);
	});

	it('is listed in the scope map under communityPackage:install', async () => {
		// Pins the name against the map, so a rename cannot pass by changing the
		// constant alone.
		expect(TOOLS_BY_SCOPE['communityPackage:install']).toContain(TOOL);
		expect(await registeredWith(OAUTH_WITH_INSTALL)).toContain(TOOL);
	});

	it('does not register for a non-scope-bearing credential', async () => {
		// API keys and legacy tokens report no granted scopes, which grants every
		// other tool by default. Installing code onto the instance must not be
		// reachable that way: a key minted before this feature existed would
		// otherwise gain the capability on upgrade, with no consent screen.
		expect(await registeredWith({ grantedScopes: undefined })).not.toContain(TOOL);
		expect(await registeredWith(undefined)).not.toContain(TOOL);
	});

	it('does not register when the grant omits the install scope', async () => {
		const withoutInstall = MCP_INSTANCE_SCOPES.filter(
			(scope) => scope !== 'communityPackage:install',
		);

		expect(await registeredWith({ grantedScopes: [...withoutInstall] })).not.toContain(TOOL);
	});

	it('does not register without the communityPackage:install global scope', async () => {
		hasGlobalScope.mockReturnValue(false);

		expect(await registeredWith(OAUTH_WITH_INSTALL)).not.toContain(TOOL);
	});

	it('does not register when verified packages are disabled', async () => {
		Container.set(
			CommunityPackagesConfig,
			mock<CommunityPackagesConfig>({ enabled: true, verifiedEnabled: false }),
		);

		expect(await registeredWith(OAUTH_WITH_INSTALL)).not.toContain(TOOL);
	});

	it('does not register when packages are managed from the environment', async () => {
		expect(await registeredWith(OAUTH_WITH_INSTALL, { managedByEnv: true })).not.toContain(TOOL);
	});

	it('is builder-gated, which is what BUILDER_TOOLS records', async () => {
		expect(BUILDER_TOOLS.has(TOOL)).toBe(true);
		expect(await registeredWith(OAUTH_WITH_INSTALL, { builderEnabled: false })).not.toContain(TOOL);
	});
});
