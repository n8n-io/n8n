import { LicenseState } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { ExecutionsConfig, GlobalConfig, WorkflowsConfig } from '@n8n/config';
import {
	ExecutionRepository,
	FolderRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	User,
} from '@n8n/db';
import { InstanceSettings } from 'n8n-core';

vi.mock('@n8n/mcp-apps/server', () => ({
	WORKFLOW_PREVIEW_APP_URI: 'ui://workflow-preview/workflow-preview.html',
	registerWorkflowPreviewApp: vi.fn(),
	registerMcpAppTool: vi.fn(
		(server: { registerTool: (...args: unknown[]) => unknown }, name, config, handler) =>
			server.registerTool(name, config, handler),
	),
}));

import { registerMcpAppTool, registerWorkflowPreviewApp } from '@n8n/mcp-apps/server';

import { ActiveExecutions } from '@/active-executions';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { ExecutionService } from '@/executions/execution.service';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { NodeCatalogService } from '@/node-catalog';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
import { AiGatewayService } from '@/services/ai-gateway.service';
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

import { BUILDER_TOOLS, getAllowedToolNames, TOOLS_BY_SCOPE } from '../mcp-scopes';
import { McpService } from '../mcp.service';

const ALL_MAPPED_TOOLS = new Set(Object.values(TOOLS_BY_SCOPE).flat());

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
		expect(allowed).toEqual(new Set(['get_execution', 'search_executions', 'list_tags']));
	});

	it('ignores unknown scopes', () => {
		expect(getAllowedToolNames(['tool:listWorkflows', 'openid'])).toEqual(new Set());
	});
});

describe('McpService scope enforcement', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const buildService = ({ builderEnabled = true } = {}) =>
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
			mockInstance(FolderRepository),
			mockInstance(SharedWorkflowRepository),
			mockInstance(ExecutionRepository),
			mockInstance(ExecutionService),
			mockInstance(DataTableProxyService),
			mockInstance(CollaborationService),
			mockInstance(NodeResourceExplorerService),
			mockInstance(TagService),
			mockInstance(LicenseState),
			mockInstance(PostHogClient),
			mockInstance(WorkflowHistoryService),
			mockInstance(WorkflowsConfig),
			mockInstance(WorkflowPublishedDataService),
			mockInstance(SubworkflowPolicyChecker),
			mockInstance(AiGatewayService, {
				isAvailable: vi.fn().mockResolvedValue({ available: false }),
			}),
		);

	beforeEach(() => {
		(registerWorkflowPreviewApp as ReturnType<typeof vi.fn>).mockClear();
		(registerMcpAppTool as ReturnType<typeof vi.fn>).mockClear();
	});

	it('every tool registered by getServer is covered by the scope map (drift guard)', async () => {
		const server = await buildService().getServer(user, false);
		const registered = getRegisteredToolNames(server);

		const unmapped = [...registered].filter((name) => !ALL_MAPPED_TOOLS.has(name));
		expect(unmapped).toEqual([]);
	});

	it('every tool in the scope map is registered when all tools are enabled (drift guard)', async () => {
		const server = await buildService().getServer(user, false);
		const registered = getRegisteredToolNames(server);

		const unregistered = [...ALL_MAPPED_TOOLS].filter((name) => !registered.has(name));
		expect(unregistered).toEqual([]);
	});

	it('BUILDER_TOOLS matches the tools gated behind the builder flag (drift guard)', async () => {
		const withBuilder = getRegisteredToolNames(await buildService().getServer(user, false));
		const withoutBuilder = getRegisteredToolNames(
			await buildService({ builderEnabled: false }).getServer(user, false),
		);

		const gated = [...withBuilder].filter((name) => !withoutBuilder.has(name)).sort();
		expect(gated).toEqual([...BUILDER_TOOLS].sort());
	});

	it('registers all tools when no scopes are provided (API keys, legacy tokens)', async () => {
		const service = buildService();
		const unscoped = await service.getServer(user, false);
		const fullyScoped = await service.getServer(
			user,
			false,
			undefined,
			Object.keys(TOOLS_BY_SCOPE),
		);

		expect(getRegisteredToolNames(fullyScoped)).toEqual(getRegisteredToolNames(unscoped));
	});

	it('registers only the tools covered by the granted scopes', async () => {
		const server = await buildService().getServer(user, false, undefined, ['workflow:read']);

		expect(getRegisteredToolNames(server)).toEqual(new Set(TOOLS_BY_SCOPE['workflow:read']));
	});

	it('filters builder tools out of a scope when the builder is disabled', async () => {
		const server = await buildService({ builderEnabled: false }).getServer(user, false, undefined, [
			'workflow:read',
		]);

		expect(getRegisteredToolNames(server)).toEqual(
			new Set([
				'search_workflows',
				'get_workflow_details',
				'get_workflow_history',
				'get_workflow_version',
			]),
		);
	});

	it('registers no tools for an empty grant', async () => {
		const server = await buildService().getServer(user, false, undefined, []);

		expect(getRegisteredToolNames(server)).toEqual(new Set());
	});

	it('does not register the MCP app when the create tool is out of scope', async () => {
		await buildService().getServer(user, true, undefined, ['workflow:read']);

		expect(registerWorkflowPreviewApp).not.toHaveBeenCalled();
		expect(registerMcpAppTool).not.toHaveBeenCalled();
	});

	it('registers the MCP app when the create tool is in scope', async () => {
		await buildService().getServer(user, true, undefined, ['workflow:write']);

		expect(registerWorkflowPreviewApp).toHaveBeenCalledTimes(1);
		expect(registerMcpAppTool).toHaveBeenCalledTimes(1);
	});
});
