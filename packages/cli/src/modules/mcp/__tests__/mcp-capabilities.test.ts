import { createMcpHandler } from '@modelcontextprotocol/server';
import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { EventService, UrlService, RoleService, FolderFinderService } from '@n8n/backend-services';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { EndpointsConfig, ExecutionsConfig, GlobalConfig, WorkflowsConfig } from '@n8n/config';
import {
	ExecutionRepository,
	GLOBAL_MEMBER_ROLE,
	ProjectRepository,
	SharedWorkflowRepository,
	User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { McpPostSaveMetricsService } from '../mcp-post-save-metrics.service';
import { McpConfig } from '../mcp.config';
import { McpProtectedResource } from '../mcp-protected-resource';
import { McpModule } from '../mcp.module';
import { McpService, type McpFeatureFlags } from '../mcp.service';
import type { McpAuthContext } from '../mcp.types';

import { ActiveExecutions } from '@/active-executions';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { ExecutionListService } from '@/executions/execution-list.service';
import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';
import { ExecutionService } from '@/executions/execution.service';
import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { registerInstanceAiCapabilities } from '@/modules/instance-ai/capabilities/instance-ai-capabilities';
import { registerN8nPackagesCapabilities } from '@/modules/n8n-packages/capabilities/n8n-packages-capabilities';
import { PackageImportConfig } from '@/modules/n8n-packages/n8n-packages.config';
import { NodeCatalogService } from '@/node-catalog';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
import { AiGatewayService } from '@/services/ai-gateway.service';
import { AiPreferenceService } from '@/services/ai-preference.service';
import { defineCapability } from '@/services/capabilities/capability';
import { CapabilityRegistry } from '@/services/capabilities/capability-registry.service';
import { FolderService } from '@/services/folder.service';
import { NodeResourceExplorerService } from '@/services/node-resource-explorer.service';
import { ProjectService } from '@/services/project.service.ee';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { TagService } from '@/services/tag.service';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { ErrorWorkflowValidationService } from '@/workflows/error-workflow-validation.service';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import { WorkflowService } from '@/workflows/workflow.service';

// Importing the controllers resolves their middleware from the container, which needs a database.
vi.mock('../mcp.controller', () => ({}));
vi.mock('../mcp.settings.controller', () => ({}));

const flags: McpFeatureFlags = {
	mcpApps: { enabled: false, variant: 'unassigned' },
	instanceContextEnabled: false,
	aiPreferencesEnabled: false,
};

const API_KEY_CALLER: McpAuthContext = { grantedScopes: undefined };

type ToolSummary = { name: string; annotations?: Record<string, unknown> };
type CallResult = {
	content: { type: string; text?: string }[];
	structuredContent?: Record<string, unknown>;
	isError?: boolean;
};
type RpcResponse<T> = { result?: T; error?: { code: number; message: string } };

const buildService = (eventService: EventService) =>
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
			endpoints: { ...new EndpointsConfig(), mcpBuilderEnabled: false },
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
		mockInstance(ExecutionListService),
		mockInstance(DataTableProxyService),
		mockInstance(CollaborationService),
		mockInstance(NodeResourceExplorerService),
		mockInstance(TagService),
		mockInstance(LicenseState, { isFoldersLicensed: vi.fn().mockReturnValue(true) }),
		mockInstance(PostHogClient),
		mockInstance(WorkflowHistoryService),
		mockInstance(WorkflowsConfig),
		mockInstance(WorkflowPublishedDataService),
		mockInstance(ErrorWorkflowValidationService),
		mockInstance(AiGatewayService, {
			isAvailable: vi.fn().mockResolvedValue({ available: false }),
		}),
		mockInstance(McpPostSaveMetricsService),
		mockInstance(ModuleRegistry, { isActive: vi.fn().mockReturnValue(false) }),
		eventService,
		mockInstance(FolderService),
		mockInstance(AiPreferenceService),
		mockInstance(McpConfig),
		mockInstance(ExecutionRedactionServiceProxy),
	);

describe('McpService capabilities', () => {
	const user = Object.assign(new User(), { id: 'user-1', role: GLOBAL_MEMBER_ROLE });
	let eventService: EventService;
	let service: McpService;

	beforeEach(() => {
		vi.clearAllMocks();
		// What the instance-ai and n8n-packages modules register in their init.
		Container.set(CapabilityRegistry, new CapabilityRegistry());
		registerInstanceAiCapabilities(Container.get(CapabilityRegistry));
		// The service below runs without the builder tools. The package flag is set here on its own.
		registerN8nPackagesCapabilities(Container.get(CapabilityRegistry), true);
		eventService = mockInstance(EventService);
		service = buildService(eventService);
	});

	/** Sends one JSON-RPC request to a per-request server, as the MCP controller does. */
	const send = async <T>(
		auth: McpAuthContext,
		method: string,
		params: Record<string, unknown> = {},
	): Promise<RpcResponse<T>> => {
		const handler = createMcpHandler(
			async () => await service.getServer(user, flags, undefined, auth),
			{ legacy: 'stateless' },
		);
		const name: Record<string, string> =
			typeof params.name === 'string' ? { 'mcp-name': params.name } : {};
		const response = await handler.fetch(
			new Request('http://n8n.local/mcp-server/http', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					accept: 'application/json, text/event-stream',
					'mcp-method': method,
					...name,
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method,
					params: {
						...params,
						_meta: {
							'io.modelcontextprotocol/protocolVersion': '2026-07-28',
							'io.modelcontextprotocol/clientCapabilities': {},
							'io.modelcontextprotocol/clientInfo': { name: 'vitest', version: '1.0.0' },
						},
					},
				}),
			}),
		);
		expect(response.status).toBe(200);
		return (await response.json()) as RpcResponse<T>;
	};

	const listToolNames = async (auth: McpAuthContext) => {
		const { result } = await send<{ tools: ToolSummary[] }>(auth, 'tools/list');
		return result?.tools.map((tool) => tool.name) ?? [];
	};

	const callParseSchedule = async (auth: McpAuthContext, text: string) =>
		await send<CallResult>(auth, 'tools/call', {
			name: 'parse_schedule',
			arguments: { text },
		});

	describe('API key caller (no scopes on the token)', () => {
		it('lists parse_schedule with its read-only annotations', async () => {
			const { result } = await send<{ tools: ToolSummary[] }>(API_KEY_CALLER, 'tools/list');

			const tool = result?.tools.find((entry) => entry.name === 'parse_schedule');
			expect(tool?.annotations).toEqual({
				title: 'Parse schedule',
				readOnlyHint: true,
				idempotentHint: true,
				openWorldHint: false,
			});
		});

		it('calls parse_schedule and returns the structured schedule', async () => {
			const { result } = await callParseSchedule(API_KEY_CALLER, 'every weekday at 8');

			expect(result?.isError).toBeFalsy();
			expect(result?.structuredContent).toEqual({
				found: true,
				trigger: { mode: 'weekdays', hour: 8, minute: 0 },
				cron: '0 8 * * 1-5',
				description: 'Every weekday at 08:00',
				matchedText: 'every weekday at 8',
			});
		});

		it('emits mcp-tool-called for the call, as for every other tool', async () => {
			await callParseSchedule(API_KEY_CALLER, 'hello');

			expect(eventService.emit).toHaveBeenCalledWith(
				'mcp-tool-called',
				expect.objectContaining({ user, toolName: 'parse_schedule', status: 'success' }),
			);
		});

		it('rejects text over 2,000 characters before the tool runs', async () => {
			const response = await callParseSchedule(API_KEY_CALLER, 'a'.repeat(2001));

			expect(response.result?.isError).toBe(true);
			expect(response.result?.content[0]?.text).toContain('at most 2000 character');
			expect(response.result?.structuredContent).toBeUndefined();
			expect(eventService.emit).not.toHaveBeenCalledWith('mcp-tool-called', expect.anything());
		});
	});

	describe('OAuth caller', () => {
		it('does not offer parse_schedule without workflow:read', async () => {
			const auth: McpAuthContext = { grantedScopes: ['tag:read', 'execution:read'] };

			const names = await listToolNames(auth);
			const call = await callParseSchedule(auth, 'every weekday at 8');

			expect(names).toContain('list_workflow_tags');
			expect(names).not.toContain('parse_schedule');
			expect(call.result).toBeUndefined();
			expect(call.error?.message).toBe('Tool parse_schedule not found');
		});

		// The scope must match exactly: a write grant does not imply the read scope here.
		it('does not offer parse_schedule for a workflow:write grant', async () => {
			const names = await listToolNames({ grantedScopes: ['workflow:write'] });

			expect(names).toContain('publish_workflow');
			expect(names).not.toContain('parse_schedule');
		});

		it('offers and runs parse_schedule with workflow:read', async () => {
			const auth: McpAuthContext = { grantedScopes: ['workflow:read'] };

			const names = await listToolNames(auth);
			const { result } = await callParseSchedule(auth, 'hello');

			expect(names).toContain('parse_schedule');
			expect(names).toContain('search_workflows');
			expect(result?.structuredContent).toEqual({ found: false });
		});
	});

	describe('workflow package tools', () => {
		const PACKAGE_TOOLS = ['export_workflow_package', 'import_workflow_package'];

		afterEach(() => {
			Container.set(PackageImportConfig, new PackageImportConfig());
		});

		it('offers both to an API key caller, with their annotations', async () => {
			const { result } = await send<{ tools: ToolSummary[] }>(API_KEY_CALLER, 'tools/list');

			const annotationsOf = (name: string) =>
				result?.tools.find((tool) => tool.name === name)?.annotations;
			expect(annotationsOf('export_workflow_package')).toEqual({
				title: 'Export workflow package',
				readOnlyHint: true,
				openWorldHint: false,
			});
			expect(annotationsOf('import_workflow_package')).toEqual({
				title: 'Import workflow package',
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: false,
			});
		});

		it.each<[string, McpAuthContext, string[]]>([
			[
				'workflow:read offers export only',
				{ grantedScopes: ['workflow:read'] },
				['export_workflow_package'],
			],
			[
				'workflow:write offers import only',
				{ grantedScopes: ['workflow:write'] },
				['import_workflow_package'],
			],
			[
				'both scopes offer both',
				{ grantedScopes: ['workflow:read', 'workflow:write'] },
				PACKAGE_TOOLS,
			],
			['other scopes offer neither', { grantedScopes: ['execution:read', 'tag:read'] }, []],
		])('OAuth: %s', async (_case, auth, expected) => {
			const names = await listToolNames(auth);

			expect(names.filter((name) => PACKAGE_TOOLS.includes(name))).toEqual(expected);
		});

		it('rejects a package over the import limit before the tool runs', async () => {
			Container.get(PackageImportConfig).maxUncompressedBytes = 3;

			const { result } = await send<CallResult>(API_KEY_CALLER, 'tools/call', {
				name: 'import_workflow_package',
				arguments: { packageBase64: 'YWJjZA==' },
			});

			expect(result?.isError).toBe(true);
			expect(result?.content[0]?.text).toContain('Input validation error');
			expect(result?.content[0]?.text).toContain('packageBase64');
			expect(result?.content[0]?.text).toContain(
				'The workflow package is larger than the limit of 3B. An admin can change the limit with N8N_IMPORT_MAX_UNCOMPRESSED_BYTES.',
			);
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('offers export but not import when the module registered without the workflow builder', async () => {
			Container.set(CapabilityRegistry, new CapabilityRegistry());
			registerN8nPackagesCapabilities(Container.get(CapabilityRegistry), false);

			const names = await listToolNames(API_KEY_CALLER);

			expect(names).toContain('export_workflow_package');
			expect(names).not.toContain('import_workflow_package');
		});

		it('offers neither when the n8n-packages module registered nothing', async () => {
			Container.set(CapabilityRegistry, new CapabilityRegistry());
			registerInstanceAiCapabilities(Container.get(CapabilityRegistry));

			const names = await listToolNames(API_KEY_CALLER);

			expect(names).toContain('parse_schedule');
			expect(names.filter((name) => PACKAGE_TOOLS.includes(name))).toEqual([]);
		});
	});

	it('does not offer a capability that has only the assistant surface', async () => {
		Container.get(CapabilityRegistry).register(
			defineCapability({
				name: 'assistant_only_tool',
				scope: 'workflow:read',
				surfaces: ['assistant'],
				build: () => ({
					name: 'assistant_only_tool',
					config: { inputSchema: {} },
					handler: () => ({ content: [] }),
				}),
			}),
		);

		const names = await listToolNames(API_KEY_CALLER);

		expect(names).toContain('parse_schedule');
		expect(names).not.toContain('assistant_only_tool');
	});

	// The instance-ai module registers parse_schedule, so with that module off no caller gets it.
	describe('when no module registered parse_schedule', () => {
		beforeEach(() => {
			Container.set(CapabilityRegistry, new CapabilityRegistry());
		});

		it.each<[string, McpAuthContext]>([
			['an API key caller', API_KEY_CALLER],
			['an OAuth caller with workflow:read', { grantedScopes: ['workflow:read'] }],
		])('does not offer it to %s', async (_caller, auth) => {
			const names = await listToolNames(auth);
			const call = await callParseSchedule(auth, 'every weekday at 8');

			expect(names).toContain('search_workflows');
			expect(names).not.toContain('parse_schedule');
			expect(call.error?.message).toBe('Tool parse_schedule not found');
		});
	});
});

describe('McpModule', () => {
	// Each capability follows the module that owns it, not the mcp module.
	it('registers no capability', async () => {
		Container.set(CapabilityRegistry, new CapabilityRegistry());
		mockInstance(McpProtectedResource);
		const protectedResources = mockInstance(ProtectedResourceRegistry);

		await Container.get(McpModule).init();

		expect(protectedResources.register).toHaveBeenCalledTimes(1);
		expect(Container.get(CapabilityRegistry).list('mcp')).toEqual([]);
		expect(Container.get(CapabilityRegistry).list('assistant')).toEqual([]);
	});
});
