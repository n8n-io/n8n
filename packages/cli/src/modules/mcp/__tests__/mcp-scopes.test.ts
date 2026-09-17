import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { ExecutionsConfig, GlobalConfig, WorkflowsConfig } from '@n8n/config';
import {
	ExecutionRepository,
	GLOBAL_MEMBER_ROLE,
	ProjectRepository,
	SharedWorkflowRepository,
	User,
} from '@n8n/db';
import { registerWorkflowPreviewApp } from '@n8n/mcp-apps/server';
import { InstanceSettings } from 'n8n-core';

import { McpPostSaveMetricsService } from '../mcp-post-save-metrics.service';
import {
	AGENT_TOOLS,
	BUILDER_TOOLS,
	getAllowedToolNames,
	INSTANCE_CONTEXT_TOOLS,
	TOOLS_BY_SCOPE,
} from '../mcp-scopes';
import { McpService } from '../mcp.service';
import type { McpFeatureFlags } from '../mcp.service';

import { ActiveExecutions } from '@/active-executions';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { EventService } from '@/events/event.service';
import { ExecutionListService } from '@/executions/execution-list.service';
import { ExecutionService } from '@/executions/execution.service';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { InstanceContextService } from '@/modules/instance-ai/instance-context.service';
import {
	EMPTY_INSTANCE_CONTEXT_TEXT,
	INSTANCE_CONTEXT_RESOURCE_URI,
	NOTHING_EXPOSED_TEXT,
} from '../tools/get-instance-context.tool';
import { WorkflowDependencyQueryService } from '@/modules/workflow-index/workflow-dependency-query.service';
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

vi.mock('@n8n/mcp-apps/server', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/mcp-apps/server')>()),
	registerWorkflowPreviewApp: vi.fn(),
}));

const ALL_MAPPED_TOOLS = new Set(Object.values(TOOLS_BY_SCOPE).flat());

const mcpFeatureFlags = (overrides: Partial<McpFeatureFlags> = {}): McpFeatureFlags => ({
	mcpApps: { enabled: false, variant: 'unassigned' },
	instanceContextEnabled: false,
	// On by default so the drift guards below cover `get_user_preferences`. Its own
	// registration tests set it explicitly either way.
	aiPreferencesEnabled: true,
	...overrides,
});

/** Reaches the resource's own read callback, which registration assertions never touch. */
const readResourceText = async (server: unknown, uri: string): Promise<string> => {
	const registered = (
		server as {
			_registeredResources: Record<string, { readCallback: () => Promise<unknown> }>;
		}
	)._registeredResources[uri];
	const result = (await registered.readCallback()) as { contents: Array<{ text: string }> };
	return result.contents[0].text;
};

const getRegisteredResourceUris = (server: unknown): Set<string> =>
	new Set(
		Object.keys((server as { _registeredResources: Record<string, unknown> })._registeredResources),
	);

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

	it('resolves the preferences scope to its one tool', () => {
		expect(getAllowedToolNames(['aiPreference:read'])).toEqual(new Set(['get_user_preferences']));
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
	// A real MCP caller always arrives with its role loaded: `get_user_preferences` and
	// `list_workflow_tags` both read the role to check a scope.
	const user = Object.assign(new User(), { id: 'user-1', role: GLOBAL_MEMBER_ROLE });

	const buildService = ({
		builderEnabled = true,
		foldersLicensed = true,
		instanceAiActive = false,
		activityLogEnabled = true,
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
				activityLog: { enabled: activityLogEnabled },
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
			mockInstance(ExecutionListService),
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
			mockInstance(McpPostSaveMetricsService),
			mockInstance(ModuleRegistry, {
				isActive: vi
					.fn()
					.mockImplementation((name: string) => instanceAiActive && name === 'instance-ai'),
			}),
			mockInstance(EventService),
			mockInstance(FolderService),
			mockInstance(AiPreferenceService),
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
		// Driven off the set so a fifth tool cannot be added without this case noticing.
		const moduleBound = [...INSTANCE_CONTEXT_TOOLS].filter((name) => name !== 'get_node_usage');

		expect(registered).toContain('get_node_usage');
		for (const name of moduleBound) expect(registered).not.toContain(name);
		expect(getRegisteredResourceUris(server)).not.toContain(INSTANCE_CONTEXT_RESOURCE_URI);
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

	/** The resource is how a client that reads resources gets the opening context without asking. */
	it('registers the instance-context resource alongside the tool', async () => {
		mockInstance(InstanceContextService);
		mockInstance(WorkflowDependencyQueryService);

		const server = await buildService({ instanceAiActive: true }).getServer(
			user,
			mcpFeatureFlags({ instanceContextEnabled: true }),
		);

		expect(getRegisteredResourceUris(server)).toContain(INSTANCE_CONTEXT_RESOURCE_URI);
		expect(getRegisteredToolNames(server)).toContain('get_instance_context');
	});

	it('registers no instance-context resource with the flag off', async () => {
		const server = await buildService({ instanceAiActive: true }).getServer(
			user,
			mcpFeatureFlags({ instanceContextEnabled: false }),
		);

		expect(getRegisteredResourceUris(server)).not.toContain(INSTANCE_CONTEXT_RESOURCE_URI);
	});

	/**
	 * The read callback, not just the registration. It is not a pass-through — it maps an empty
	 * read to its own text and emits its own telemetry — so the two paths can drift silently.
	 */
	it('serves the block through the resource, and the withheld text when nothing is exposed', async () => {
		const instanceContext = mockInstance(InstanceContextService);
		mockInstance(WorkflowDependencyQueryService);

		const server = await buildService({ instanceAiActive: true }).getServer(
			user,
			mcpFeatureFlags({ instanceContextEnabled: true }),
		);

		instanceContext.buildBlock.mockResolvedValue({
			block: 'Workflows that already exist here: 2',
			cursor: {
				activityMark: 1,
				activityFloor: 0,
				activityCategories: ['workflow', 'credential'],
				activitySeen: [],
				runsThrough: '2026-09-16T00:00:00.000Z',
			},
		});
		expect(await readResourceText(server, INSTANCE_CONTEXT_RESOURCE_URI)).toBe(
			'Workflows that already exist here: 2',
		);

		// Empty read plus an estate that exists: the client must not be told the instance is empty.
		instanceContext.buildBlock.mockResolvedValue(null);
		instanceContext.hasWithheldWorkflows.mockResolvedValue(true);
		expect(await readResourceText(server, INSTANCE_CONTEXT_RESOURCE_URI)).toBe(
			NOTHING_EXPOSED_TEXT,
		);

		instanceContext.hasWithheldWorkflows.mockResolvedValue(false);
		expect(await readResourceText(server, INSTANCE_CONTEXT_RESOURCE_URI)).toBe(
			EMPTY_INSTANCE_CONTEXT_TEXT,
		);
	});

	/**
	 * The resource carries the same instance data as the tool, so a grant that cannot call the
	 * tool must not be able to read it instead. `registerResource` does no filtering of its own.
	 */
	it('withholds the resource from a grant that does not cover the tool', async () => {
		mockInstance(InstanceContextService);
		mockInstance(WorkflowDependencyQueryService);

		const server = await buildService({ instanceAiActive: true }).getServer(
			user,
			mcpFeatureFlags({ instanceContextEnabled: true }),
			undefined,
			{ grantedScopes: ['execution:read'] },
		);

		expect(getRegisteredToolNames(server)).not.toContain('get_instance_context');
		expect(getRegisteredResourceUris(server)).not.toContain(INSTANCE_CONTEXT_RESOURCE_URI);
	});

	/**
	 * The log is off by default, and a tool answering from a store nothing writes to reports an
	 * empty feed — which an agent reads as "nothing has happened here".
	 */
	it('withholds the activity tools when the activity log is not being written', async () => {
		mockInstance(InstanceContextService);
		mockInstance(WorkflowDependencyQueryService);

		const server = await buildService({
			instanceAiActive: true,
			activityLogEnabled: false,
		}).getServer(user, mcpFeatureFlags({ instanceContextEnabled: true }));

		const registered = getRegisteredToolNames(server);
		expect(registered).not.toContain('get_instance_activity');
		expect(registered).not.toContain('expand_instance_activity');
		// Node usage reads its own index, so the log has no bearing on it.
		expect(registered).toContain('get_node_usage');
	});

	/**
	 * The outer half of the credential gate, observed through `getServer` rather than restated:
	 * a copy of `allowedToolNames?.has('list_credentials') ?? true` in a test would still pass if
	 * the service stopped deriving it, read the wrong tool name, or hard-coded the value.
	 */
	it('derives the credential grant from the token, not from a hard-coded value', async () => {
		const instanceContext = mockInstance(InstanceContextService);
		mockInstance(WorkflowDependencyQueryService);
		instanceContext.listPage.mockResolvedValue({ entries: [], hasMore: false });

		const grantedScopeOf = async (grantedScopes: string[]) => {
			const server = await buildService({ instanceAiActive: true }).getServer(
				user,
				mcpFeatureFlags({ instanceContextEnabled: true }),
				undefined,
				{ grantedScopes },
			);
			const tool = (
				server as unknown as {
					_registeredTools: Record<
						string,
						{ handler: (args: unknown, extra: unknown) => Promise<unknown> }
					>;
				}
			)._registeredTools.get_instance_activity;

			await tool.handler({}, {});
			const call = instanceContext.listPage.mock.calls.at(-1)?.[0];
			return (call?.scope as { credentialGranted: boolean }).credentialGranted;
		};

		expect(await grantedScopeOf(['workflow:read', 'credential:read'])).toBe(true);
		expect(await grantedScopeOf(['workflow:read'])).toBe(false);
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

	describe('get_user_preferences registration', () => {
		it('registers the tool when the preferences flag is on', async () => {
			const server = await buildService().getServer(
				user,
				mcpFeatureFlags({ aiPreferencesEnabled: true }),
			);

			expect(getRegisteredToolNames(server)).toContain('get_user_preferences');
		});

		it('does not register the tool when the preferences flag is off', async () => {
			const server = await buildService().getServer(
				user,
				mcpFeatureFlags({ aiPreferencesEnabled: false }),
			);

			expect(getRegisteredToolNames(server)).not.toContain('get_user_preferences');
		});

		// Preferences cover Agents, data tables and folders too, none of which are
		// builder-gated, so the tool must not disappear with the builder.
		it('registers the tool with the builder disabled', async () => {
			const server = await buildService({ builderEnabled: false }).getServer(
				user,
				mcpFeatureFlags({ aiPreferencesEnabled: true }),
			);

			expect(getRegisteredToolNames(server)).toContain('get_user_preferences');
		});

		it('is not a builder tool, so it stays out of the builder-gated set', () => {
			expect(BUILDER_TOOLS.has('get_user_preferences')).toBe(false);
		});

		it('is out of reach of a grant that does not hold the preferences scope', async () => {
			const server = await buildService().getServer(user, mcpFeatureFlags(), undefined, {
				grantedScopes: ['workflow:read', 'workflow:write'],
			});

			expect(getRegisteredToolNames(server)).not.toContain('get_user_preferences');
		});
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
