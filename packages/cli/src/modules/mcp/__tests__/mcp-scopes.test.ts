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
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { InstanceContextService } from '@/modules/instance-ai/instance-context.service';
import { WorkflowDependencyQueryService } from '@/modules/workflow-index/workflow-dependency-query.service';
import { NodeCatalogService } from '@/node-catalog';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
import { AiGatewayService } from '@/services/ai-gateway.service';
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

import { registerWorkflowPreviewApp } from '@n8n/mcp-apps/server';

import {
	AGENT_TOOLS,
	BUILDER_TOOLS,
	getAllowedToolNames,
	INSTANCE_CONTEXT_TOOLS,
	TOOLS_BY_SCOPE,
} from '../mcp-scopes';
import { McpService, type McpFeatureFlags } from '../mcp.service';

vi.mock('@n8n/mcp-apps/server', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/mcp-apps/server')>()),
	registerWorkflowPreviewApp: vi.fn(),
}));

const ALL_MAPPED_TOOLS = new Set(Object.values(TOOLS_BY_SCOPE).flat());

const mcpFeatureFlags = (overrides: Partial<McpFeatureFlags> = {}): McpFeatureFlags => ({
	mcpApps: { enabled: false, variant: 'unassigned' },
	canvasGroupsEnabled: false,
	instanceContextEnabled: false,
	...overrides,
});

const getRegisteredToolNames = (server: unknown): Set<string> =>
	new Set(Object.keys((server as { _registeredTools: Record<string, unknown> })._registeredTools));

describe('getAllowedToolNames', () => {
	it('returns undefined for non-scope-bearing credentials (full access)', () => {
		expect(getAllowedToolNames(undefined)).toBeUndefined();
	});

	it('returns an empty set for an empty grant', () => {
		expect(getAllowedToolNames([])).toEqual(new Set());
	});

	it('unions the tools of all granted scopes', () => {
		const allowed = getAllowedToolNames(['execution:read', 'tag:read']);
		expect(allowed).toEqual(
			new Set(['get_workflow_execution', 'search_workflow_executions', 'list_workflow_tags']),
		);
	});

	it('ignores unknown scopes', () => {
		expect(getAllowedToolNames(['tool:listWorkflows', 'openid'])).toEqual(new Set());
	});

	it('allows integration updates and publishing with agent:write', () => {
		const allowed = getAllowedToolNames(['agent:write']);

		expect(allowed).toContain('update_agent_integration');
		expect(allowed).toContain('publish_agent');
		expect(allowed).toContain('unpublish_agent');
	});

	it('grants only call_agent with agent:execute', () => {
		expect(getAllowedToolNames(['agent:execute'])).toEqual(new Set(['call_agent']));
	});

	it('exposes the renamed list_n8n_gateway_services tool via credential:read', () => {
		expect(getAllowedToolNames(['credential:read'])).toContain('list_n8n_gateway_services');
	});
});

describe('McpService scope enforcement', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const buildService = ({
		builderEnabled = true,
		foldersLicensed = true,
		instanceAiActive = false,
	} = {}) =>
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
			mockInstance(DataTableProxyService),
			mockInstance(CollaborationService),
			mockInstance(NodeResourceExplorerService),
			mockInstance(TagService),
			mockInstance(LicenseState, {
				isFoldersLicensed: vi.fn().mockReturnValue(foldersLicensed),
			}),
			mockInstance(PostHogClient),
			mockInstance(WorkflowHistoryService),
			mockInstance(WorkflowsConfig),
			mockInstance(WorkflowPublishedDataService),
			mockInstance(SubworkflowPolicyChecker),
			mockInstance(AiGatewayService, {
				isAvailable: vi.fn().mockResolvedValue({ available: false }),
			}),
			mockInstance(ModuleRegistry, {
				isActive: vi
					.fn()
					.mockImplementation((name: string) => instanceAiActive && name === 'instance-ai'),
			}),
			mockInstance(EventService),
			mockInstance(FolderService),
		);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('every tool registered by getServer is covered by the scope map (drift guard)', async () => {
		const server = await buildService().getServer(user, mcpFeatureFlags());
		const registered = getRegisteredToolNames(server);

		const unmapped = [...registered].filter((name) => !ALL_MAPPED_TOOLS.has(name));
		expect(unmapped).toEqual([]);
	});

	it('every tool in the scope map is registered when all tools are enabled (drift guard)', async () => {
		const server = await buildService().getServer(user, mcpFeatureFlags());
		const registered = getRegisteredToolNames(server);

		// Agent tools require the agents module (inactive here); their own
		// drift guard lives in agent-tools.service.test.ts. Instance-context
		// tools need the `instance-ai` module, inactive here for the same reason.
		const unregistered = [...ALL_MAPPED_TOOLS].filter(
			(name) =>
				!registered.has(name) && !AGENT_TOOLS.has(name) && !INSTANCE_CONTEXT_TOOLS.has(name),
		);
		expect(unregistered).toEqual([]);
	});

	/**
	 * The registration branch itself, which every other test here leaves dark. It resolves the
	 * reader out of the container behind a dynamic import, so a wrong path or a missing binding
	 * would otherwise only surface at runtime on a real instance.
	 */
	it('registers the instance-context tools when the flag and the module are both on', async () => {
		mockInstance(InstanceContextService);
		mockInstance(WorkflowDependencyQueryService);

		const server = await buildService({ instanceAiActive: true }).getServer(
			user,
			mcpFeatureFlags({ instanceContextEnabled: true }),
		);

		const registered = getRegisteredToolNames(server);
		for (const name of INSTANCE_CONTEXT_TOOLS) expect(registered).toContain(name);
	});

	it('registers none of them with the module active but the flag off', async () => {
		const server = await buildService({ instanceAiActive: true }).getServer(
			user,
			mcpFeatureFlags({ instanceContextEnabled: false }),
		);

		const registered = getRegisteredToolNames(server);
		for (const name of INSTANCE_CONTEXT_TOOLS) expect(registered).not.toContain(name);
	});

	/**
	 * Node usage reads the dependency index, which belongs to no module, so it does not follow the
	 * activity tools off the instance when the AI assistant is disabled.
	 */
	it('keeps node usage but drops the activity tools when the module is inactive', async () => {
		mockInstance(WorkflowDependencyQueryService);

		const server = await buildService({ instanceAiActive: false }).getServer(
			user,
			mcpFeatureFlags({ instanceContextEnabled: true }),
		);

		const registered = getRegisteredToolNames(server);
		expect(registered).toContain('get_node_usage');
		expect(registered).not.toContain('get_instance_activity');
		expect(registered).not.toContain('expand_instance_activity');
	});

	/** They ride on `workflow:read`, so a grant without it must not reach them. */
	it('withholds them from a grant that does not cover them', async () => {
		mockInstance(InstanceContextService);
		mockInstance(WorkflowDependencyQueryService);

		const server = await buildService({ instanceAiActive: true }).getServer(
			user,
			mcpFeatureFlags({ instanceContextEnabled: true }),
			undefined,
			{ grantedScopes: ['execution:read'] },
		);

		const registered = getRegisteredToolNames(server);
		for (const name of INSTANCE_CONTEXT_TOOLS) expect(registered).not.toContain(name);
	});

	it('BUILDER_TOOLS matches the tools gated behind the builder flag (drift guard)', async () => {
		const withBuilder = getRegisteredToolNames(
			await buildService().getServer(user, mcpFeatureFlags()),
		);
		const withoutBuilder = getRegisteredToolNames(
			await buildService({ builderEnabled: false }).getServer(user, mcpFeatureFlags()),
		);

		const gated = [...withBuilder].filter((name) => !withoutBuilder.has(name)).sort();
		expect(gated).toEqual([...BUILDER_TOOLS].sort());
	});

	it('does not register folder tools when folders are not licensed', async () => {
		const server = await buildService({ foldersLicensed: false }).getServer(
			user,
			mcpFeatureFlags(),
		);
		const registered = getRegisteredToolNames(server);

		expect(registered).not.toContain('search_folders');
		expect(registered).not.toContain('create_folder');
		expect(registered).not.toContain('update_folder');
		expect(registered).not.toContain('move_workflows_to_folder');
		expect(registered).toContain('search_projects');
	});

	it('registers all tools when no scopes are provided (API keys, legacy tokens)', async () => {
		const service = buildService();
		const unscoped = await service.getServer(user, mcpFeatureFlags());
		const fullyScoped = await service.getServer(user, mcpFeatureFlags(), undefined, {
			grantedScopes: Object.keys(TOOLS_BY_SCOPE),
		});

		expect(getRegisteredToolNames(fullyScoped)).toEqual(getRegisteredToolNames(unscoped));
	});

	it('registers only the tools covered by the granted scopes', async () => {
		const server = await buildService().getServer(user, mcpFeatureFlags(), undefined, {
			grantedScopes: ['workflow:read'],
		});

		// Instance-context tools ride on this scope but need their own flag and the `instance-ai`
		// module, neither of which is on here.
		expect(getRegisteredToolNames(server)).toEqual(
			new Set(TOOLS_BY_SCOPE['workflow:read'].filter((name) => !INSTANCE_CONTEXT_TOOLS.has(name))),
		);
	});

	it('filters builder tools out of a scope when the builder is disabled', async () => {
		const server = await buildService({ builderEnabled: false }).getServer(
			user,
			mcpFeatureFlags(),
			undefined,
			{ grantedScopes: ['workflow:read'] },
		);

		expect(getRegisteredToolNames(server)).toEqual(
			new Set([
				'search_workflows',
				'get_workflow_details',
				'get_workflow_history',
				'get_workflow_version',
				'get_workflow_versions_diff',
			]),
		);
	});

	it('registers no tools for an empty grant', async () => {
		const server = await buildService().getServer(user, mcpFeatureFlags(), undefined, {
			grantedScopes: [],
		});

		expect(getRegisteredToolNames(server)).toEqual(new Set());
	});

	it('does not register the MCP app when the create tool is out of scope', async () => {
		const server = await buildService().getServer(
			user,
			mcpFeatureFlags({ mcpApps: { enabled: true, variant: 'variant' } }),
			undefined,
			{ grantedScopes: ['workflow:read'] },
		);

		expect(getRegisteredToolNames(server)).not.toContain('create_workflow_from_code');
		expect(registerWorkflowPreviewApp).not.toHaveBeenCalled();
	});

	it('registers the MCP app and the marked create tool when it is in scope', async () => {
		const server = await buildService().getServer(
			user,
			mcpFeatureFlags({ mcpApps: { enabled: true, variant: 'variant' } }),
			undefined,
			{ grantedScopes: ['workflow:write'] },
		);

		expect(getRegisteredToolNames(server)).toContain('create_workflow_from_code');
		expect(registerWorkflowPreviewApp).toHaveBeenCalledTimes(1);
	});
});
