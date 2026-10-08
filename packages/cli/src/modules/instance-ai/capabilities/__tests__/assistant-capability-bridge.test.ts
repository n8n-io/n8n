import type { CallToolResult } from '@modelcontextprotocol/server';
import type { BuiltTool, InterruptibleToolContext, ToolContext } from '@n8n/agents';
import {
	applyBranchReadOnlyOverrides,
	confirmationRequestPayloadSchema,
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	type InstanceAiPermissions,
} from '@n8n/api-types';
import type { EventService } from '@n8n/backend-services';
import { User } from '@n8n/db';
import { isRecord } from '@n8n/utils/is-record';
import fc from 'fast-check';
import { jsonParse, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import z from 'zod';

// The provider only converts card answers here. Keep the Assistant runtime out of this test.
vi.mock('../../instance-ai.service', () => ({ InstanceAiService: class {} }));
vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

import type { RegisterToolFn, ToolDefinition, ToolHandlerResult } from '@/modules/mcp/mcp.types';
import {
	type CapabilityAnswer,
	type CapabilityAssistantOptions,
	type CapabilityCard,
	type CapabilityContext,
	type CapabilityToolDefinition,
	defineCapability,
} from '@/services/capabilities/capability';
import { BLOCKED_MESSAGE, DENIED_MESSAGE } from '@/services/capabilities/capability-confirmation';

import { AssistantAgentProvider } from '../../assistant-agent.provider';
import { ASSISTANT_CLIENT_NAME, toAssistantTool } from '../assistant-capability-bridge';

const makeUser = (id: string) => Object.assign(new User(), { id });

const echoShape = {
	text: z.string().min(1),
	workflowId: z.string().optional(),
} satisfies z.ZodRawShape;

type EchoArgs = { text: string; workflowId?: string };
type EchoHandler = (
	args: EchoArgs,
	extra: unknown,
	context: CapabilityContext,
) => CallToolResult | Promise<CallToolResult>;

/** A capability whose handler the test controls. It records the context of each call. */
const echoCapability = (handler: EchoHandler) =>
	defineCapability({
		name: 'echo_tool',
		scope: 'workflow:read',
		build: (context): CapabilityToolDefinition<typeof echoShape> => ({
			name: 'echo_tool',
			config: {
				description: 'Echoes the text',
				inputSchema: echoShape,
				annotations: { title: 'Echo', readOnlyHint: true, destructiveHint: false },
			},
			handler: async (args, extra) => await handler(args, extra, context),
		}),
	});

const textResult = (text: string): CallToolResult => ({ content: [{ type: 'text', text }] });

describe('toAssistantTool', () => {
	let eventService: ReturnType<typeof mock<EventService>>;
	const handler = vi.fn<EchoHandler>();
	const user = makeUser('alice');

	const buildTool = (forUser: User = user) =>
		toAssistantTool(echoCapability(handler), { user: forUser }, eventService).tool;

	const run = async (tool: BuiltTool, input: unknown, ctx: ToolContext = {}) => {
		if (!tool.handler) throw new Error('The tool has no handler');
		return await tool.handler(input, ctx);
	};

	beforeEach(() => {
		eventService = mock<EventService>();
		handler.mockReset();
	});

	describe('tool shape', () => {
		it('has the name, description and MCP annotations of the definition', () => {
			const { tool, alwaysLoaded } = toAssistantTool(
				echoCapability(handler),
				{ user },
				eventService,
			);

			expect(tool.name).toBe('echo_tool');
			expect(tool.description).toBe('Echoes the text');
			expect(tool.mcpAnnotations).toEqual({
				title: 'Echo',
				readOnlyHint: true,
				destructiveHint: false,
			});
			expect(alwaysLoaded).toBe(false);
			expect(handler).not.toHaveBeenCalled();
		});

		it('does not suspend when the capability asks for no confirmation', () => {
			const tool = buildTool();

			expect(tool.suspendSchema).toBeUndefined();
			expect(tool.resumeSchema).toBeUndefined();
		});

		it('declares the input shape as a zod schema for the runtime', () => {
			const schema = buildTool().inputSchema as z.ZodType;

			expect(schema.safeParse({ text: 'hi' }).success).toBe(true);
			expect(schema.safeParse({ text: '' }).success).toBe(false);
			expect(schema.safeParse({}).success).toBe(false);
		});
	});

	describe('input validation', () => {
		it.each([
			[{ text: '' }, 'text'],
			[{}, 'text'],
			[{ text: 42 }, 'text'],
			[{ text: 'hi', workflowId: 7 }, 'workflowId'],
		])('rejects %j without running the handler', async (input, field) => {
			const result = run(buildTool(), input);

			await expect(result).rejects.toThrow(UserError);
			await expect(result).rejects.toThrow(`Invalid input for echo_tool: ${field}`);
			expect(handler).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('drops keys that the input shape does not declare', async () => {
			handler.mockReturnValue(textResult('ok'));

			await run(buildTool(), { text: 'hi', admin: true });

			expect(handler.mock.calls[0][0]).toEqual({ text: 'hi' });
		});
	});

	describe('result mapping', () => {
		it('returns the structured content of the result', async () => {
			const structured = { found: true, cron: '0 9 * * 1' };
			handler.mockReturnValue({ ...textResult('ignored'), structuredContent: structured });

			await expect(run(buildTool(), { text: 'hi' })).resolves.toEqual(structured);
		});

		it('returns the text parsed as JSON when there is no structured content', async () => {
			handler.mockReturnValue(textResult('{"found":false}'));

			await expect(run(buildTool(), { text: 'hi' })).resolves.toEqual({ found: false });
		});

		it('returns plain text that is not JSON as it is', async () => {
			handler.mockReturnValue({
				content: [
					{ type: 'text', text: 'line one' },
					{ type: 'text', text: 'line two' },
				],
			});

			await expect(run(buildTool(), { text: 'hi' })).resolves.toBe('line one\nline two');
		});

		it('surfaces an error result as a UserError with its text', async () => {
			handler.mockReturnValue({ ...textResult('Workflow not found'), isError: true });

			const result = run(buildTool(), { text: 'hi' });

			await expect(result).rejects.toThrow(UserError);
			await expect(result).rejects.toThrow('Workflow not found');
		});

		it('gives an error result without text a fixed message', async () => {
			handler.mockReturnValue({ content: [], isError: true });

			await expect(run(buildTool(), { text: 'hi' })).rejects.toThrow(
				'The tool failed without an error message',
			);
		});

		it('gives images to the model as content parts', async () => {
			const result: CallToolResult = {
				content: [
					{ type: 'image', data: 'aGk=', mimeType: 'image/png' },
					{ type: 'text', text: 'A chart' },
				],
			};
			handler.mockReturnValue(result);
			const tool = buildTool();

			const output = await run(tool, { text: 'hi' });

			expect(output).toBe(result);
			expect(tool.toModelOutput?.(output)).toEqual({
				type: 'content',
				value: [
					{ type: 'image-data', data: 'aGk=', mediaType: 'image/png' },
					{ type: 'text', text: 'A chart' },
				],
			});
		});

		it('gives a result without media to the model unchanged', () => {
			const tool = buildTool();
			const output = { content: [{ type: 'text', text: 'no media' }] };

			expect(tool.toModelOutput?.(output)).toBe(output);
			expect(tool.toModelOutput?.('plain')).toBe('plain');
		});
	});

	describe('request context', () => {
		it('runs the handler as the user of the request on the assistant surface', async () => {
			handler.mockImplementation((_args, _extra, context) => textResult(context.user.id));
			const bob = makeUser('bob');

			await expect(run(buildTool(user), { text: 'hi' })).resolves.toBe('alice');
			await expect(run(buildTool(bob), { text: 'hi' })).resolves.toBe('bob');

			expect(handler.mock.calls.map(([, , context]) => context)).toEqual([
				{ user, surface: 'assistant' },
				{ user: bob, surface: 'assistant' },
			]);
		});

		it('passes the abort signal of the run to the handler', async () => {
			handler.mockReturnValue(textResult('ok'));
			const controller = new AbortController();

			await run(buildTool(), { text: 'hi' }, { abortSignal: controller.signal });

			expect(handler.mock.calls[0][1]).toEqual({
				mcpReq: { _meta: {}, signal: controller.signal },
			});
		});
	});

	describe('audit event', () => {
		const emittedEvent = () => {
			expect(eventService.emit).toHaveBeenCalledTimes(1);
			const [name, payload] = eventService.emit.mock.calls[0];
			expect(name).toBe('mcp-tool-called');
			return payload;
		};

		it('emits mcp-tool-called for the n8n Assistant client without the arguments', async () => {
			handler.mockReturnValue({ ...textResult('ok'), structuredContent: { ok: true } });

			await run(buildTool(), { text: 'secret input' });

			const payload = emittedEvent();
			expect(payload).toEqual({
				user,
				toolName: 'echo_tool',
				workflowId: undefined,
				status: 'success',
				errorMessage: undefined,
				clientName: ASSISTANT_CLIENT_NAME,
			});
			expect(ASSISTANT_CLIENT_NAME).toBe('n8n-assistant');
			expect(JSON.stringify(payload)).not.toContain('secret input');
			expect(payload).not.toHaveProperty('authType');
		});

		it('records the target workflow as the MCP registrar does', async () => {
			handler.mockReturnValue(textResult('ok'));

			await run(buildTool(), { text: 'hi', workflowId: 'wf-7' });

			expect(emittedEvent()).toMatchObject({ workflowId: 'wf-7', status: 'success' });
		});

		it('emits an error event for an error result', async () => {
			handler.mockReturnValue({ ...textResult('Workflow not found'), isError: true });

			await expect(run(buildTool(), { text: 'hi' })).rejects.toThrow(UserError);

			expect(emittedEvent()).toMatchObject({
				status: 'error',
				errorMessage: 'Workflow not found',
				clientName: ASSISTANT_CLIENT_NAME,
			});
		});

		it('emits an error event and rethrows when the handler throws', async () => {
			const failure = new Error('database is down');
			handler.mockRejectedValue(failure);

			await expect(run(buildTool(), { text: 'hi' })).rejects.toBe(failure);

			expect(emittedEvent()).toMatchObject({
				toolName: 'echo_tool',
				status: 'error',
				errorMessage: 'database is down',
			});
		});
	});
});

// A test-only capability that asks for confirmation before it deploys a workflow.
const deployShape = {
	workflowId: z.string().min(1),
	target: z.enum(['staging', 'production']).optional(),
} satisfies z.ZodRawShape;

type DeployArgs = { workflowId: string; target?: 'staging' | 'production' };
type DeployHandler = (args: DeployArgs, context: CapabilityContext) => CallToolResult;
type DeployOptions = CapabilityAssistantOptions<typeof deployShape>;

/** Uses the chosen target, or staging when the user chose none. */
const applyTarget = (args: DeployArgs, answer: CapabilityAnswer): DeployArgs => {
	const chosen = isRecord(answer.values) ? answer.values.target : undefined;
	return { ...args, target: chosen === 'production' || chosen === 'staging' ? chosen : 'staging' };
};

const deployCapability = (handler: DeployHandler, assistant: DeployOptions) =>
	defineCapability({
		name: 'deploy_workflow',
		scope: 'workflow:execute',
		assistant,
		build: (context): CapabilityToolDefinition<typeof deployShape> => ({
			name: 'deploy_workflow',
			config: {
				description: 'Deploys a workflow',
				inputSchema: deployShape,
				annotations: { title: 'Deploy workflow', destructiveHint: true },
			},
			handler: async (args) => handler(args, context),
		}),
	});

const targetCard = (
	offered: CapabilityCard['offered'] = { target: ['staging'] },
): CapabilityCard => ({
	message: 'Deploy "Invoices"?',
	severity: 'warning',
	resourceName: 'Invoices',
	fields: { targets: ['staging', 'production'] },
	offered,
});

const withMode = (
	key: keyof InstanceAiPermissions,
	mode: InstanceAiPermissions[keyof InstanceAiPermissions],
): InstanceAiPermissions => ({ ...DEFAULT_INSTANCE_AI_PERMISSIONS, [key]: mode });

const SUSPENDED = { suspended: true };

describe('toAssistantTool with confirmation', () => {
	const provider = new AssistantAgentProvider(mock(), mock(), mock(), mock());
	const handler = vi.fn<DeployHandler>();
	const confirm = vi.fn<NonNullable<DeployOptions['confirm']>>();
	const user = makeUser('alice');
	const input = { workflowId: 'wf-1' };
	let eventService: ReturnType<typeof mock<EventService>>;

	const buildTool = (options: DeployOptions, permissions?: InstanceAiPermissions) =>
		toAssistantTool(deployCapability(handler, options), { user, permissions }, eventService).tool;

	const callTool = async (tool: BuiltTool, args: unknown, ctx: InterruptibleToolContext) => {
		if (!tool.handler) throw new Error('The tool has no handler');
		return await tool.handler(args, ctx);
	};

	/** The first call of a tool, as the runtime makes it. */
	const firstCall = async (tool: BuiltTool, args: unknown = input) => {
		const suspend = vi.fn(async (_payload: unknown) => SUSPENDED as never);
		const output = await callTool(tool, args, { suspend, resumeData: undefined });
		return { output, suspend, payload: suspend.mock.calls[0]?.[0] };
	};

	/**
	 * Suspends, then answers the card the way the chat does: the card body goes through the
	 * real `normalizeResumeData` and the resume schema, and a tool built again (as after a
	 * reload) resumes with the suspend payload restored from the JSON checkpoint.
	 */
	const answerCard = async (
		options: DeployOptions,
		confirmation: unknown,
		permissions: { before?: InstanceAiPermissions; after?: InstanceAiPermissions } = {},
	) => {
		const { payload } = await firstCall(buildTool(options, permissions.before));
		expect(payload).toBeDefined();
		const suspendPayload = jsonParse<unknown>(JSON.stringify(payload));
		const tool = buildTool(options, permissions.after ?? permissions.before);
		const resumeData = (tool.resumeSchema as z.ZodType).parse(
			provider.normalizeResumeData(confirmation),
		);
		return await callTool(tool, input, { suspend: vi.fn(), resumeData, suspendPayload });
	};

	beforeEach(() => {
		eventService = mock<EventService>();
		handler.mockReset();
		handler.mockReturnValue({ ...textResult('deployed'), structuredContent: { deployed: true } });
		confirm.mockReset();
		confirm.mockResolvedValue(targetCard());
	});

	describe('first call', () => {
		it('suspends with the card of the capability and does not run the handler', async () => {
			const { output, suspend, payload } = await firstCall(buildTool({ confirm }));

			expect(output).toBe(SUSPENDED);
			expect(suspend).toHaveBeenCalledTimes(1);
			expect(payload).toEqual({
				targets: ['staging', 'production'],
				requestId: expect.any(String),
				message: 'Deploy "Invoices"?',
				severity: 'warning',
				resourceName: 'Invoices',
				offered: { target: ['staging'] },
			});
			expect(confirm).toHaveBeenCalledWith(input, { user, surface: 'assistant' });
			expect(handler).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('sends a payload that the frontend shows as the Assistant confirmation card', async () => {
			const first = await firstCall(buildTool({ confirm }));
			const second = await firstCall(buildTool({ confirm }));

			// The frontend shows the approval card for a payload with these three fields.
			expect(first.payload).toMatchObject({
				requestId: expect.any(String),
				message: expect.any(String),
				severity: expect.any(String),
			});
			expect(
				confirmationRequestPayloadSchema.partial().passthrough().safeParse(first.payload).success,
			).toBe(true);
			expect(first.payload).not.toEqual(second.payload);
		});

		it('keeps the fixed card keys when the renderer fields repeat them', async () => {
			confirm.mockResolvedValue({
				...targetCard(),
				fields: { requestId: 'forged', message: 'forged', offered: { target: ['production'] } },
			});

			const { payload } = await firstCall(buildTool({ confirm }));

			expect(payload).toMatchObject({
				message: 'Deploy "Invoices"?',
				offered: { target: ['staging'] },
			});
			expect(payload).not.toMatchObject({ requestId: 'forged' });
		});

		it('runs at once when confirm returns no card', async () => {
			confirm.mockResolvedValue(undefined);

			const { output, suspend } = await firstCall(buildTool({ confirm }));

			expect(output).toEqual({ deployed: true });
			expect(suspend).not.toHaveBeenCalled();
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith(input, { user, surface: 'assistant' });
		});

		it('rejects invalid input before it asks for confirmation', async () => {
			const result = firstCall(buildTool({ confirm }), { workflowId: '' });

			await expect(result).rejects.toThrow(UserError);
			await expect(result).rejects.toThrow('Invalid input for deploy_workflow: workflowId');
			expect(confirm).not.toHaveBeenCalled();
		});
	});

	describe('answer', () => {
		it('runs the handler once with the applied arguments after approval', async () => {
			const output = await answerCard(
				{ confirm, applyAnswer: applyTarget },
				{ kind: 'approval', approved: true },
			);

			expect(output).toEqual({ deployed: true });
			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith(
				{ workflowId: 'wf-1', target: 'staging' },
				{ user, surface: 'assistant' },
			);
			expect(eventService.emit).toHaveBeenCalledTimes(1);
			expect(eventService.emit.mock.calls[0][1]).toMatchObject({
				toolName: 'deploy_workflow',
				status: 'success',
				clientName: ASSISTANT_CLIENT_NAME,
			});
		});

		it('gives the handler the value that the user chose on the card', async () => {
			confirm.mockResolvedValue(targetCard({ target: ['staging', 'production'] }));

			await answerCard(
				{ confirm, applyAnswer: applyTarget },
				{ kind: 'capabilityDecision', approved: true, values: { target: 'production' } },
			);

			expect(handler).toHaveBeenCalledWith(
				{ workflowId: 'wf-1', target: 'production' },
				expect.anything(),
			);
		});

		it('keeps the arguments unchanged without applyAnswer', async () => {
			await answerCard({ confirm }, { kind: 'approval', approved: true });

			expect(handler).toHaveBeenCalledWith(input, expect.anything());
		});

		it.each([
			['an approval card', { kind: 'approval', approved: false }],
			['a capability card', { kind: 'capabilityDecision', approved: false }],
			[
				'a capability card with values',
				{ kind: 'capabilityDecision', approved: false, values: { target: 'production' } },
			],
		])('returns a denial from %s and does not run the handler', async (_label, confirmation) => {
			const output = await answerCard({ confirm, applyAnswer: applyTarget }, confirmation);

			expect(output).toEqual({ denied: true, message: DENIED_MESSAGE });
			expect(handler).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it.each([
			['a value that the card did not offer', { target: 'production' }, 'target'],
			['a field that the card did not offer', { region: 'eu' }, 'region'],
			['a boolean in place of an offered text', { target: true }, 'target'],
		])('rejects %s and does not run the handler', async (_label, values, field) => {
			const result = answerCard(
				{ confirm, applyAnswer: applyTarget },
				{ kind: 'capabilityDecision', approved: true, values },
			);

			await expect(result).rejects.toThrow(UserError);
			await expect(result).rejects.toThrow(`did not offer this value for "${field}"`);
			expect(handler).not.toHaveBeenCalled();
		});

		it('rejects an answer when the checkpoint holds no card', async () => {
			const tool = buildTool({ confirm });

			const result = callTool(tool, input, {
				suspend: vi.fn(),
				resumeData: { approved: true },
				suspendPayload: undefined,
			});

			await expect(result).rejects.toThrow('The confirmation card of this call is missing');
			expect(handler).not.toHaveBeenCalled();
		});

		it.each([
			['an approval that is not a boolean', { approved: 'yes' }],
			['values of an unknown type', { approved: true, values: { target: 3 } }],
		])('rejects %s', async (_label, resumeData) => {
			const { payload } = await firstCall(buildTool({ confirm }));

			const result = callTool(buildTool({ confirm }), input, {
				suspend: vi.fn(),
				resumeData: resumeData as CapabilityAnswer,
				suspendPayload: payload,
			});

			await expect(result).rejects.toThrow('The answer to the confirmation card is not valid');
			expect(handler).not.toHaveBeenCalled();
		});

		it('validates the arguments again after it applies the answer', async () => {
			const result = answerCard(
				{ confirm, applyAnswer: (args) => ({ ...args, workflowId: '' }) },
				{ kind: 'approval', approved: true },
			);

			await expect(result).rejects.toThrow('Invalid input for deploy_workflow: workflowId');
			expect(handler).not.toHaveBeenCalled();
		});

		it('resumes with the answer schema of the capability', async () => {
			const answerSchema = z.object({ approved: z.boolean(), note: z.string().optional() });
			const applyAnswer = vi.fn((args: DeployArgs) => args);
			const tool = buildTool({ confirm, answerSchema, applyAnswer });
			const { payload } = await firstCall(tool);

			await callTool(tool, input, {
				suspend: vi.fn(),
				resumeData: { approved: true, note: 'ship it' },
				suspendPayload: payload,
			});

			expect(tool.resumeSchema).toBe(answerSchema);
			// The third argument is the card of the checkpoint.
			expect(applyAnswer).toHaveBeenCalledWith(input, { approved: true, note: 'ship it' }, payload);
		});
	});

	describe('admin permission modes', () => {
		const runWorkflow = () => 'runWorkflow' as const;

		it('refuses a blocked action without a card or the handler', async () => {
			const tool = buildTool(
				{ confirm, permission: runWorkflow },
				withMode('runWorkflow', 'blocked'),
			);

			const { output, suspend } = await firstCall(tool);

			expect(output).toEqual({ denied: true, message: BLOCKED_MESSAGE });
			expect(confirm).not.toHaveBeenCalled();
			expect(suspend).not.toHaveBeenCalled();
			expect(handler).not.toHaveBeenCalled();
		});

		it('refuses an approved action that an admin blocked while the card waited', async () => {
			const output = await answerCard(
				{ confirm, permission: runWorkflow },
				{ kind: 'approval', approved: true },
				{
					before: withMode('runWorkflow', 'always_allow'),
					after: withMode('runWorkflow', 'blocked'),
				},
			);

			expect(output).toEqual({ denied: true, message: BLOCKED_MESSAGE });
			expect(handler).not.toHaveBeenCalled();
		});

		it('shows a default card for require_approval when confirm returns no card', async () => {
			confirm.mockResolvedValue(undefined);
			const tool = buildTool(
				{ confirm, permission: runWorkflow },
				withMode('runWorkflow', 'require_approval'),
			);

			const { payload } = await firstCall(tool);

			expect(payload).toEqual({
				requestId: expect.any(String),
				message: 'Allow the n8n Assistant to run "Deploy workflow"?',
				severity: 'destructive',
				offered: {},
			});
			expect(confirm).toHaveBeenCalledTimes(1);
			expect(handler).not.toHaveBeenCalled();
		});

		it('shows the default card for require_approval without confirm', async () => {
			const output = await answerCard(
				{ permission: runWorkflow },
				{ kind: 'approval', approved: true },
				{ before: withMode('runWorkflow', 'require_approval') },
			);

			expect(output).toEqual({ deployed: true });
			expect(handler).toHaveBeenCalledTimes(1);
		});

		it('shows the card of the capability for require_approval', async () => {
			const tool = buildTool(
				{ confirm, permission: runWorkflow },
				withMode('runWorkflow', 'require_approval'),
			);

			const { payload } = await firstCall(tool);

			expect(payload).toMatchObject({ message: 'Deploy "Invoices"?', severity: 'warning' });
		});

		it('runs at once for always_allow when confirm returns no card', async () => {
			confirm.mockResolvedValue(undefined);
			const tool = buildTool(
				{ confirm, permission: runWorkflow },
				withMode('runWorkflow', 'always_allow'),
			);

			const { output, suspend } = await firstCall(tool);

			expect(output).toEqual({ deployed: true });
			expect(suspend).not.toHaveBeenCalled();
		});

		it('still shows the card of the capability for always_allow', async () => {
			const tool = buildTool(
				{ confirm, permission: runWorkflow },
				withMode('runWorkflow', 'always_allow'),
			);

			const { output, payload } = await firstCall(tool);

			expect(output).toBe(SUSPENDED);
			expect(payload).toMatchObject({ message: 'Deploy "Invoices"?' });
			expect(handler).not.toHaveBeenCalled();
		});

		it('uses the default modes when the run has no permissions', async () => {
			confirm.mockResolvedValue(undefined);

			const { payload } = await firstCall(buildTool({ confirm, permission: runWorkflow }));

			expect(DEFAULT_INSTANCE_AI_PERMISSIONS.runWorkflow).toBe('require_approval');
			expect(payload).toMatchObject({ severity: 'destructive' });
			expect(handler).not.toHaveBeenCalled();
		});

		it('refuses a write action on a branch that is read-only', async () => {
			const readOnly = applyBranchReadOnlyOverrides(withMode('runWorkflow', 'always_allow'));

			const { output } = await firstCall(buildTool({ confirm, permission: runWorkflow }, readOnly));

			expect(output).toEqual({ denied: true, message: BLOCKED_MESSAGE });
			expect(handler).not.toHaveBeenCalled();
		});

		it('reads the permission for the arguments of each call', async () => {
			const permission = vi.fn((args: DeployArgs) =>
				args.target === 'production' ? ('publishWorkflow' as const) : ('runWorkflow' as const),
			);
			const permissions = {
				...withMode('runWorkflow', 'always_allow'),
				publishWorkflow: 'blocked' as const,
			};
			confirm.mockResolvedValue(undefined);
			const tool = buildTool({ confirm, permission }, permissions);

			await expect(
				firstCall(tool, { workflowId: 'wf-1', target: 'production' }),
			).resolves.toMatchObject({
				output: { denied: true, message: BLOCKED_MESSAGE },
			});
			await expect(
				firstCall(tool, { workflowId: 'wf-1', target: 'staging' }),
			).resolves.toMatchObject({
				output: { deployed: true },
			});
			expect(permission).toHaveBeenCalledWith({ workflowId: 'wf-1', target: 'staging' });
		});
	});

	describe('MCP surface', () => {
		it('runs at once without confirm or the permission check', async () => {
			const permission = vi.fn(() => 'runWorkflow' as const);
			const tools: ToolDefinition<z.ZodRawShape, ToolHandlerResult>[] = [];
			const register: RegisterToolFn = (tool) => {
				tools.push(tool);
			};

			deployCapability(handler, { confirm, permission }).registerOn(register, { user });
			const result = await tools[0].handler(input);

			expect(result).toMatchObject({ structuredContent: { deployed: true } });
			expect(handler).toHaveBeenCalledWith(input, { user, surface: 'mcp' });
			expect(confirm).not.toHaveBeenCalled();
			expect(permission).not.toHaveBeenCalled();
		});
	});

	describe('offered values (property)', () => {
		const field = fc.constantFrom('target', 'region', 'notify');
		const value = fc.oneof(fc.constantFrom('a', 'b', 'c'), fc.boolean());

		it('runs the handler only with values that the card offered', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.dictionary(field, fc.array(value, { maxLength: 3 })),
					fc.dictionary(field, value),
					async (offered, values) => {
						handler.mockClear();
						confirm.mockResolvedValue({ message: 'Choose', severity: 'info', offered });
						const wasOffered = Object.entries(values).every(
							([key, chosen]) => Object.hasOwn(offered, key) && offered[key].includes(chosen),
						);

						const result = answerCard(
							{ confirm },
							{ kind: 'capabilityDecision', approved: true, values },
						);

						if (wasOffered) {
							await expect(result).resolves.toEqual({ deployed: true });
							expect(handler).toHaveBeenCalledTimes(1);
						} else {
							await expect(result).rejects.toThrow(UserError);
							expect(handler).not.toHaveBeenCalled();
						}
					},
				),
				{ numRuns: 200 },
			);
		});
	});
});
