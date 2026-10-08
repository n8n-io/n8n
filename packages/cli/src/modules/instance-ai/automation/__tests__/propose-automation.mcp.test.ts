// Only DI tokens. The test gives the real proposal service mocks of these services.
vi.mock('@/workflows/workflow-finder.service', () => ({ WorkflowFinderService: class {} }));
vi.mock('@/workflows/workflow.service', () => ({ WorkflowService: class {} }));
vi.mock('@/collaboration/collaboration.service', () => ({ CollaborationService: class {} }));
vi.mock('../../provenance/workflow-provenance.service', () => ({
	WorkflowProvenanceService: class {},
}));

import { type CallToolResult, createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { automationProposalResultSchema } from '@n8n/api-types';
import type { EventService } from '@n8n/backend-services';
import { mock } from 'vitest-mock-extended';
import z from 'zod';

import { McpService } from '@/modules/mcp/mcp.service';
import type { RegisterToolFn, ToolDefinition, ToolHandlerResult } from '@/modules/mcp/mcp.types';
import { CAPABILITY_TOOLS_BY_SCOPE } from '@/services/capabilities/capability-scopes';

import {
	PROPOSE_AUTOMATION_CAPABILITY_NAME,
	proposeAutomationCapability,
} from '../propose-automation.capability';
import {
	BASE_URL,
	createAutomationWorld,
	makeUser,
	manualNodes,
	storedWorkflow,
	THREAD_ID,
} from './propose-automation.test-helpers';

const user = makeUser('mcp-user');

/** The tool exactly as the MCP server receives it. */
const registeredTool = () => {
	const tools: ToolDefinition<z.ZodRawShape, ToolHandlerResult>[] = [];
	const register: RegisterToolFn = (tool) => {
		tools.push(tool);
	};
	proposeAutomationCapability.registerOn(register, { user });
	return tools[0];
};

const call = async (args: Record<string, unknown>) =>
	(await registeredTool().handler(args)) as CallToolResult;

const inputSchema = () => z.object(registeredTool().config.inputSchema ?? {});

/** Calls the tool through the MCP protocol and the instrumented registrar of the MCP server. */
const callOverMcp = async (args: Record<string, unknown>): Promise<CallToolResult> => {
	// Only the registrar runs here, and it reads nothing but the event service.
	const mcpService = Object.create(McpService.prototype) as McpService;
	Object.assign(mcpService, { eventService: mock<EventService>() });
	const handler = createMcpHandler(
		async () => {
			const server = new McpServer({ name: 'propose-automation', version: '1.0.0' });
			const registerTool = mcpService.createToolRegistrar(server, user, { name: 'vitest' });
			proposeAutomationCapability.registerOn(registerTool, { user });
			return server;
		},
		{ legacy: 'stateless' },
	);
	const response = await handler.fetch(
		new Request('http://n8n.local/mcp-server/http', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				accept: 'application/json, text/event-stream',
				'mcp-method': 'tools/call',
				'mcp-name': PROPOSE_AUTOMATION_CAPABILITY_NAME,
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/call',
				params: {
					name: PROPOSE_AUTOMATION_CAPABILITY_NAME,
					arguments: args,
					_meta: {
						'io.modelcontextprotocol/protocolVersion': '2026-07-28',
						'io.modelcontextprotocol/clientCapabilities': {},
						'io.modelcontextprotocol/clientInfo': { name: 'vitest', version: '1.0.0' },
					},
				},
			}),
		}),
	);
	return ((await response.json()) as { result: CallToolResult }).result;
};

const textOf = (result: CallToolResult) =>
	result.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n');

describe('propose_automation over MCP', () => {
	const world = createAutomationWorld();

	beforeEach(() => {
		world.reset();
	});

	describe('definition', () => {
		it('is a workflow:write capability for MCP clients and the n8n Assistant', () => {
			expect(proposeAutomationCapability.name).toBe(PROPOSE_AUTOMATION_CAPABILITY_NAME);
			expect(proposeAutomationCapability.scope).toBe('workflow:write');
			expect(proposeAutomationCapability.surfaces).toEqual(['assistant', 'mcp']);
			expect(CAPABILITY_TOOLS_BY_SCOPE['workflow:write']).toContain('propose_automation');
		});

		it('registers a tool without reading any workflow', () => {
			const tool = registeredTool();

			expect(tool.name).toBe('propose_automation');
			expect(tool.config.annotations).toEqual({
				title: 'Propose automation',
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			});
			expect(world.finder.findWorkflowForUser).not.toHaveBeenCalled();
		});

		it('fills in an empty list of reasons and trims the text', () => {
			expect(inputSchema().parse({ workflowId: 'wf-1', title: '  Digest  ' })).toEqual({
				workflowId: 'wf-1',
				title: 'Digest',
				why: [],
			});
		});

		it.each([
			['no workflow id', { title: 'Digest' }],
			['a blank title', { workflowId: 'wf-1', title: '   ' }],
			['a title over 120 characters', { workflowId: 'wf-1', title: 'x'.repeat(121) }],
			['six reasons', { workflowId: 'wf-1', title: 'D', why: ['a', 'b', 'c', 'd', 'e', 'f'] }],
			['a reason over 200 characters', { workflowId: 'wf-1', title: 'D', why: ['x'.repeat(201)] }],
			['a blank reason', { workflowId: 'wf-1', title: 'D', why: [' '] }],
			['a target other than this instance', { workflowId: 'wf-1', title: 'D', target: 'cloud-1' }],
			['a cron over 200 characters', { workflowId: 'wf-1', title: 'D', cron: '*'.repeat(201) }],
			['an activation that is not a boolean', { workflowId: 'wf-1', title: 'D', activate: 'yes' }],
			['an empty version id', { workflowId: 'wf-1', title: 'D', versionId: '' }],
		])('rejects input with %s', (_label, args) => {
			expect(inputSchema().safeParse(args).success).toBe(false);
		});
	});

	describe('calls', () => {
		it('keeps and turns on the workflow at once, without a card', async () => {
			const result = await call({ workflowId: 'wf-1', title: 'Digest', activate: true });

			const expected = {
				workflowId: 'wf-1',
				url: `${BASE_URL}/workflow/wf-1`,
				active: true,
				kept: true,
			};
			expect(result.isError).toBeUndefined();
			expect(result.structuredContent).toEqual(expected);
			expect(JSON.parse(textOf(result))).toEqual(expected);
			expect(automationProposalResultSchema.parse(result.structuredContent)).toEqual(expected);
			expect(world.provenance.record).toHaveBeenCalledWith('wf-1', THREAD_ID, 'mcp-user');
			expect(world.temporaryWorkflows.unmark).toHaveBeenCalledWith('wf-1');
			expect(world.workflowService.activateWorkflow).toHaveBeenCalledWith(user, 'wf-1', {
				source: 'n8n-mcp',
				versionId: 'v-1',
			});
		});

		it('keeps the workflow without turning it on by default', async () => {
			const result = await call({ workflowId: 'wf-1', title: 'Digest' });

			expect(result.structuredContent).toMatchObject({ active: false, kept: true });
			expect(world.temporaryWorkflows.unmark).toHaveBeenCalledTimes(1);
			expect(world.workflowService.activateWorkflow).not.toHaveBeenCalled();
		});

		it('turns on the workflow when the version that the client names is the saved one', async () => {
			const result = await call({
				workflowId: 'wf-1',
				title: 'Digest',
				activate: true,
				versionId: 'v-1',
			});

			expect(result.structuredContent).toMatchObject({ active: true, kept: true });
			expect(world.workflowService.activateWorkflow).toHaveBeenCalledTimes(1);
		});

		it('returns a tool error for a version that is no longer the saved one, and changes nothing', async () => {
			const result = await call({
				workflowId: 'wf-1',
				title: 'Digest',
				activate: true,
				versionId: 'v-0',
			});

			expect(result.isError).toBe(true);
			expect(textOf(result)).toContain('changed after the automation was proposed');
			expect(world.nothingChanged()).toBe(true);
		});

		it('warns about a cron that it ignored, and says that it is not valid', async () => {
			const result = await call({ workflowId: 'wf-1', title: 'Digest', cron: 'every day' });

			expect(result.structuredContent).toMatchObject({
				warnings: [
					'Ignored the cron expression "every day", because the schedule trigger uses the cron expression "0 8 * * 1-5". The cron expression "every day" is not a valid five-field cron expression.',
				],
			});
		});

		it('describes the rules of MCP: no archived workflows, and activate turns it on', () => {
			const { description } = registeredTool().config;

			expect(description).toContain('must not be archived');
			expect(description).toContain('Set activate to true');
			expect(description).not.toContain('answers on a card');
		});

		it.each([
			[
				'a workflow that is not available in MCP',
				storedWorkflow({ settings: {} }),
				'Workflow is not available in MCP',
			],
			[
				'an archived workflow',
				storedWorkflow({ isArchived: true }),
				"Workflow 'wf-1' is archived and cannot be accessed.",
			],
			[
				'a manual workflow to turn on',
				storedWorkflow({ nodes: manualNodes }),
				'"Digest builder" has no trigger that starts it on its own',
			],
		])('returns a tool error for %s and changes nothing', async (_label, workflow, message) => {
			world.grant(workflow);

			const result = await call({ workflowId: 'wf-1', title: 'Digest', activate: true });

			expect(result.isError).toBe(true);
			expect(textOf(result)).toContain(message);
			expect(result.structuredContent).toBeUndefined();
			expect(world.nothingChanged()).toBe(true);
		});

		it('returns a tool error without the publish scope and leaves the workflow off', async () => {
			world.grant(storedWorkflow(), ['workflow:read', 'workflow:update']);

			const result = await call({ workflowId: 'wf-1', title: 'Digest', activate: true });

			expect(result.isError).toBe(true);
			expect(textOf(result)).toBe(
				'You do not have permission to turn on "Digest builder". Ask the owner of the workflow to turn it on. Nothing was changed.',
			);
			expect(world.nothingChanged()).toBe(true);
		});

		it('passes the output validation of the MCP server', async () => {
			const result = await callOverMcp({ workflowId: 'wf-1', title: 'Digest', activate: true });

			expect(result.isError).toBeFalsy();
			expect(result.structuredContent).toEqual({
				workflowId: 'wf-1',
				url: `${BASE_URL}/workflow/wf-1`,
				active: true,
				kept: true,
			});
		});

		it('rejects a target other than this instance before it acts', async () => {
			const result = await callOverMcp({ workflowId: 'wf-1', title: 'Digest', target: 'cloud-1' });

			expect(result.isError).toBe(true);
			expect(textOf(result)).toContain('target');
			expect(world.nothingChanged()).toBe(true);
		});

		it('lets an unexpected failure reach the MCP server', async () => {
			world.temporaryWorkflows.existsForWorkflow.mockRejectedValue(new Error('database is down'));

			await expect(call({ workflowId: 'wf-1', title: 'Digest' })).rejects.toThrow(
				'database is down',
			);
		});
	});
});
