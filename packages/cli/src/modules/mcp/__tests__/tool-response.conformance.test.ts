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
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InstanceSettings } from 'n8n-core';
import { z } from 'zod';

import { McpService } from '../mcp.service';
import { errorResult, successResult } from '../tools/tool-response';

import { NodeCatalogService } from '@/node-catalog';

import { ActiveExecutions } from '@/active-executions';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { ExecutionService } from '@/executions/execution.service';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
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

// mcp-apps registration is exercised by mcp.service.test.ts; here we only need
// the tool surface, so registering the preview app should be a no-op.
vi.mock('@n8n/mcp-apps/server', () => ({
	WORKFLOW_PREVIEW_APP_URI: 'ui://workflow-preview/workflow-preview.html',
	registerWorkflowPreviewApp: vi.fn(),
	registerMcpAppTool: vi.fn(
		(server: { registerTool: (...args: unknown[]) => unknown }, name, config, handler) =>
			server.registerTool(name, config, handler),
	),
}));

/**
 * Connect a freshly-registered `McpServer` to a `Client` over an in-memory
 * transport so assertions run through the SDK's real registration and output
 * validation path (the same code that raises `-32602` against strict clients).
 */
async function connectServer(register: (server: McpServer) => void) {
	const server = new McpServer({ name: 'test', version: '1.0.0' });
	register(server);
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	const client = new Client({ name: 'test-client', version: '1.0.0' });
	await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
	return { server, client };
}

// A strict, multi-field schema mirroring the real tools that historically
// produced `-32602` when their error path returned a divergent shape.
const strictSchema = {
	workflowId: z.string(),
	name: z.string(),
	nodeCount: z.number(),
	url: z.string(),
	appliedOperations: z.number(),
} satisfies z.ZodRawShape;

const strictData = {
	workflowId: 'wf-1',
	name: 'My workflow',
	nodeCount: 3,
	url: 'https://n8n.example/workflow/wf-1',
	appliedOperations: 2,
};

describe('successResult', () => {
	const schema = {
		a: z.string(),
		b: z.number(),
		note: z.string().optional(),
	} satisfies z.ZodRawShape;

	it('returns structuredContent equal to the data and compact JSON text by default', () => {
		const result = successResult(schema, { a: 'x', b: 1 });

		expect(result.isError).toBeUndefined();
		expect(result.structuredContent).toEqual({ a: 'x', b: 1 });
		expect(result.content).toEqual([{ type: 'text', text: JSON.stringify({ a: 'x', b: 1 }) }]);
	});

	it('supports a human-readable text override while keeping structured content', () => {
		const result = successResult(schema, { a: 'x', b: 1 }, { text: 'human readable' });

		expect(result.content).toEqual([{ type: 'text', text: 'human readable' }]);
		expect(result.structuredContent).toEqual({ a: 'x', b: 1 });
	});

	it('throws when a required field is missing (self-check)', () => {
		expect(() =>
			successResult(schema, { a: 'x' } as unknown as z.infer<z.ZodObject<typeof schema>>),
		).toThrow();
	});

	it('throws when an undeclared extra field is present (strict self-check)', () => {
		expect(() =>
			successResult(schema, { a: 'x', b: 1, extra: true } as unknown as z.infer<
				z.ZodObject<typeof schema>
			>),
		).toThrow();
	});
});

describe('errorResult', () => {
	it('omits structuredContent and flags isError', () => {
		const result = errorResult('something failed');

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toBeUndefined();
		expect(result.content).toEqual([{ type: 'text', text: 'something failed' }]);
	});

	it('appends a hint to the message on its own paragraph', () => {
		const result = errorResult('something failed', { hint: 'try X' });

		expect(result.content).toEqual([{ type: 'text', text: 'something failed\n\ntry X' }]);
	});

	it('renders executionId and hint deterministically into the text', () => {
		const result = errorResult('something failed', { executionId: 'exec-1', hint: 'try X' });

		expect(result.content).toEqual([
			{ type: 'text', text: 'something failed\nExecution ID: exec-1\n\ntry X' },
		]);
		expect(result.structuredContent).toBeUndefined();
	});
});

describe('SDK output validation (real McpServer/Client over InMemoryTransport)', () => {
	it('lets errorResult through with the real message and no -32602, even under a strict outputSchema', async () => {
		const { client } = await connectServer((server) => {
			server.registerTool('failing', { outputSchema: strictSchema }, () =>
				errorResult('the real failure reason'),
			);
		});

		const result = await client.callTool({ name: 'failing', arguments: {} });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toBeUndefined();
		const text = (result.content as Array<{ text: string }>)[0].text;
		expect(text).toContain('the real failure reason');
		// The historical bug surfaced as an opaque schema-validation error instead.
		expect(text).not.toContain('validation');
	});

	it('accepts successResult structuredContent against the published outputSchema', async () => {
		const { client } = await connectServer((server) => {
			server.registerTool('ok', { outputSchema: strictSchema }, () =>
				successResult(strictSchema, strictData),
			);
		});

		const result = await client.callTool({ name: 'ok', arguments: {} });

		expect(result.isError).toBeFalsy();
		expect(result.structuredContent).toMatchObject({ workflowId: 'wf-1' });
	});

	it('rejects a hand-rolled response that drifts from the schema (the bug the helpers prevent)', async () => {
		const { client } = await connectServer((server) => {
			server.registerTool('drift', { outputSchema: strictSchema }, () => ({
				// The pre-fix antipattern: a divergent structuredContent with no isError.
				content: [{ type: 'text' as const, text: '{"error":"boom"}' }],
				structuredContent: { error: 'boom' },
			}));
		});

		const result = await client.callTool({ name: 'drift', arguments: {} });

		// The SDK turns the schema mismatch into an error result — exactly the
		// opaque failure the helpers + non-prod self-check catch earlier.
		expect(result.isError).toBe(true);
		expect((result.content as Array<{ text: string }>)[0].text.toLowerCase()).toContain(
			'validation',
		);
	});
});

describe('all registered MCP tools conform to the envelope contract', () => {
	function buildService() {
		return new McpService(
			mockLogger(),
			mockInstance(ExecutionsConfig, { mode: 'regular' }),
			mockInstance(InstanceSettings, { instanceId: 'test-instance' }),
			mockInstance(WorkflowFinderService),
			mockInstance(WorkflowService),
			mockInstance(UrlService),
			mockInstance(CredentialsService),
			mockInstance(ActiveExecutions),
			mockInstance(GlobalConfig, {
				endpoints: {
					webhook: '/webhook',
					webhookTest: '/webhook-test',
					mcpBuilderEnabled: true,
					mcpAppsEnabled: false,
				},
				tags: { disabled: false },
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
		);
	}

	async function listRegisteredTools() {
		const service = buildService();
		const user = Object.assign(new User(), { id: 'user-1' });
		const server = await service.getServer(user, false);
		const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
		const client = new Client({ name: 'test-client', version: '1.0.0' });
		await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
		const { tools } = await client.listTools();
		return tools;
	}

	// `test_workflow` reports the executed workflow's own failure via a top-level
	// `error` on a SUCCESSFUL tool call — a domain field, not the tool-failure
	// envelope. Tool-call failures everywhere go through errorResult (text only).
	const TOOLS_WITH_DOMAIN_ERROR_FIELD = new Set(['test_workflow']);

	it('every tool publishes a strict outputSchema with no leftover error envelope field', async () => {
		const tools = await listRegisteredTools();

		expect(tools.length).toBeGreaterThan(0);

		for (const tool of tools) {
			const outputSchema = tool.outputSchema as
				| { properties?: Record<string, unknown>; additionalProperties?: boolean }
				| undefined;

			// Every built-in tool declares structured output.
			expect(outputSchema).toBeDefined();

			// Strict success schema: undeclared keys are forbidden, which is what
			// makes a drifting structuredContent fail against a strict client.
			expect(outputSchema?.additionalProperties).toBe(false);

			// Regression guard: failures travel in text content via errorResult, so
			// no tool should reintroduce a top-level `error` envelope field. A new
			// tool tripping this must either route errors through errorResult or
			// justify a genuine domain field by adding it to the allowlist above.
			if (!TOOLS_WITH_DOMAIN_ERROR_FIELD.has(tool.name)) {
				expect(Object.keys(outputSchema?.properties ?? {})).not.toContain('error');
			}
		}
	});
});
