import type { CallToolResult } from '@modelcontextprotocol/server';
import type { BuiltTool, ToolContext } from '@n8n/agents';
import type { EventService } from '@n8n/backend-services';
import { User } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import z from 'zod';

import {
	type CapabilityContext,
	type CapabilityToolDefinition,
	defineCapability,
} from '@/services/capabilities/capability';

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
