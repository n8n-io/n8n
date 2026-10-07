import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import type { EventService } from '@n8n/backend-services';
import { User } from '@n8n/db';
import fc from 'fast-check';
import { mock } from 'vitest-mock-extended';

import { toAssistantTool } from '@/modules/instance-ai/capabilities/assistant-capability-bridge';
import { McpService } from '@/modules/mcp/mcp.service';

import {
	PARSE_SCHEDULE_MAX_TEXT_LENGTH,
	parseScheduleCapability,
} from '../parse-schedule.capability';

type CallResult = {
	content: { type: string; text?: string }[];
	structuredContent?: unknown;
	isError?: boolean;
};

const user = Object.assign(new User(), { id: 'user-1' });

/**
 * One capability, two surfaces: the MCP server (through the instrumented registrar and the
 * MCP protocol) and the n8n Assistant (through the bridge). Both must give the same answer.
 */
describe('parse_schedule surface parity', () => {
	const eventService = mock<EventService>();

	// Only the registrar runs here, and it reads nothing but the event service.
	const mcpService = Object.create(McpService.prototype) as McpService;
	Object.assign(mcpService, { eventService });

	const callOverMcp = async (text: string): Promise<CallResult> => {
		const handler = createMcpHandler(
			async () => {
				const server = new McpServer({ name: 'parity', version: '1.0.0' });
				const registerTool = mcpService.createToolRegistrar(server, user, { name: 'vitest' });
				parseScheduleCapability.registerOn(registerTool, { user });
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
					'mcp-name': 'parse_schedule',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: {
						name: 'parse_schedule',
						arguments: { text },
						_meta: {
							'io.modelcontextprotocol/protocolVersion': '2026-07-28',
							'io.modelcontextprotocol/clientCapabilities': {},
							'io.modelcontextprotocol/clientInfo': { name: 'vitest', version: '1.0.0' },
						},
					},
				}),
			}),
		);
		const body = (await response.json()) as { result: CallResult };
		return body.result;
	};

	const callOverAssistant = async (text: string): Promise<unknown> => {
		const { tool } = toAssistantTool(parseScheduleCapability, { user }, eventService);
		return await tool.handler?.({ text }, {});
	};

	beforeEach(() => {
		eventService.emit.mockReset();
	});

	it.each(['every Monday at 9', 'nothing', 'Remind me every weekday at 8:30 please'])(
		'gives the same structured result for %j on both surfaces',
		async (text) => {
			const overMcp = await callOverMcp(text);
			const overAssistant = await callOverAssistant(text);

			expect(overMcp.isError).toBeFalsy();
			expect(overAssistant).toEqual(overMcp.structuredContent);
		},
	);

	it('finds the Monday schedule on both surfaces', async () => {
		const expected = {
			found: true,
			trigger: { mode: 'everyWeek', hour: 9, minute: 0, weekday: 1 },
			cron: '0 9 * * 1',
			description: 'Every Monday at 09:00',
			matchedText: 'every Monday at 9',
		};

		expect((await callOverMcp('every Monday at 9')).structuredContent).toEqual(expected);
		expect(await callOverAssistant('every Monday at 9')).toEqual(expected);
	});

	it('emits the same audit event on both surfaces, apart from the client name', async () => {
		await callOverMcp('every Monday at 9');
		await callOverAssistant('every Monday at 9');

		const [overMcp, overAssistant] = eventService.emit.mock.calls.map(([name, payload]) => ({
			name,
			payload,
		}));
		expect(overMcp.name).toBe('mcp-tool-called');
		expect(overAssistant.name).toBe('mcp-tool-called');
		expect({ ...overAssistant.payload, clientName: 'vitest' }).toEqual(overMcp.payload);
		expect(overAssistant.payload).toMatchObject({ clientName: 'n8n-assistant' });
	});

	it.each(['', 'a'.repeat(PARSE_SCHEDULE_MAX_TEXT_LENGTH + 1)])(
		'refuses invalid input on both surfaces without running the tool (length %#)',
		async (text) => {
			const overMcp = await callOverMcp(text);

			expect(overMcp.isError).toBe(true);
			await expect(callOverAssistant(text)).rejects.toThrow('Invalid input for parse_schedule');
			expect(eventService.emit).not.toHaveBeenCalled();
		},
	);

	it('gives the same result for any text on both surfaces', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.oneof(
					fc.string({ minLength: 1, maxLength: 80 }),
					fc.constantFrom('every 15 minutes', 'hourly', 'each Friday at 17:45', 'daily at noon'),
				),
				async (text) => {
					const overMcp = await callOverMcp(text);
					expect(await callOverAssistant(text)).toEqual(overMcp.structuredContent);
				},
			),
			{ numRuns: 40 },
		);
	});
});
