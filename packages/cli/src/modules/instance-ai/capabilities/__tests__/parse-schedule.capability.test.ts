import type { CallToolResult } from '@modelcontextprotocol/server';
import { User } from '@n8n/db';
import fc from 'fast-check';
import z from 'zod';

import type { RegisterToolFn, ToolDefinition, ToolHandlerResult } from '@/modules/mcp/mcp.types';

import {
	PARSE_SCHEDULE_CAPABILITY_NAME,
	PARSE_SCHEDULE_MAX_TEXT_LENGTH,
	parseSchedule,
	parseScheduleCapability,
} from '../parse-schedule.capability';

/** The tool exactly as the MCP server receives it. */
const registeredTool = () => {
	const tools: ToolDefinition<z.ZodRawShape, ToolHandlerResult>[] = [];
	const register: RegisterToolFn = (tool) => {
		tools.push(tool);
	};
	parseScheduleCapability.registerOn(register, { user: Object.assign(new User(), { id: 'u1' }) });
	return tools[0];
};

const call = async (text: string) => (await registeredTool().handler({ text })) as CallToolResult;

const inputSchema = () => z.object(registeredTool().config.inputSchema ?? {});
const outputSchema = () => z.object(registeredTool().config.outputSchema ?? {});

describe('parse_schedule capability', () => {
	it('is a read-only capability for workflow:read clients on every surface', () => {
		expect(parseScheduleCapability.name).toBe(PARSE_SCHEDULE_CAPABILITY_NAME);
		expect(parseScheduleCapability.scope).toBe('workflow:read');
		expect(parseScheduleCapability.surfaces).toEqual(['mcp', 'assistant']);
		expect(registeredTool().name).toBe('parse_schedule');
		expect(registeredTool().config.annotations).toEqual({
			title: 'Parse schedule',
			readOnlyHint: true,
			idempotentHint: true,
			openWorldHint: false,
		});
	});

	it('turns "every weekday at 8" into a weekday trigger, cron and description', async () => {
		const result = await call('every weekday at 8');

		expect(result.isError).toBeUndefined();
		expect(result.structuredContent).toEqual({
			found: true,
			trigger: { mode: 'weekdays', hour: 8, minute: 0 },
			cron: '0 8 * * 1-5',
			description: 'Every weekday at 08:00',
			matchedText: 'every weekday at 8',
		});
	});

	it('returns the same result as text JSON for clients that read only text', async () => {
		const result = await call('Can you send me this every Monday at 9 please?');

		expect(result.content).toEqual([
			{ type: 'text', text: JSON.stringify(result.structuredContent) },
		]);
		expect(result.structuredContent).toMatchObject({
			found: true,
			cron: '0 9 * * 1',
			description: 'Every Monday at 09:00',
			matchedText: 'every Monday at 9',
		});
	});

	it('reports found: false when the text has no schedule', async () => {
		const result = await call('hello');

		expect(result.structuredContent).toEqual({ found: false });
		expect(result.content).toEqual([{ type: 'text', text: '{"found":false}' }]);
	});

	it.each([
		['every minute', '* * * * *'],
		['every 15 minutes', '*/15 * * * *'],
		['every 2 hours', '0 */2 * * *'],
		['hourly', '0 * * * *'],
		['every day at 6pm', '0 18 * * *'],
		['every Sunday at noon', '0 12 * * 0'],
		['on the 15th of every month', '0 9 15 * *'],
	])('gives a result for "%s" that matches the output schema', async (text, cron) => {
		const { structuredContent } = await call(text);

		expect(structuredContent).toMatchObject({ found: true, cron });
		expect(outputSchema().safeParse(structuredContent).success).toBe(true);
	});

	it('accepts text of up to 2,000 characters and rejects longer or empty text', () => {
		const schema = inputSchema();

		expect(schema.safeParse({ text: 'a'.repeat(PARSE_SCHEDULE_MAX_TEXT_LENGTH) }).success).toBe(
			true,
		);
		expect(schema.safeParse({ text: 'a'.repeat(PARSE_SCHEDULE_MAX_TEXT_LENGTH + 1) }).success).toBe(
			false,
		);
		expect(schema.safeParse({ text: '' }).success).toBe(false);
		expect(schema.safeParse({}).success).toBe(false);
	});

	it('gives the same result through parseSchedule and the tool', async () => {
		const text = 'each Monday morning';

		expect((await call(text)).structuredContent).toEqual(await parseSchedule(text));
	});

	it('always returns a result that matches the output schema (property)', async () => {
		const schema = outputSchema();
		const scheduleWords = fc.constantFrom(
			'every weekday at 8',
			'every 5 minutes',
			'monthly',
			'each Friday evening',
			'at 7 every day',
		);
		const textArb = fc
			.tuple(fc.string({ maxLength: 900 }), fc.option(scheduleWords), fc.string({ maxLength: 900 }))
			.map(([before, phrase, after]) => `${before} ${phrase ?? ''} ${after}`);

		await fc.assert(
			fc.asyncProperty(textArb, async (text) => {
				const result = await call(text);
				expect(schema.safeParse(result.structuredContent).success).toBe(true);
				expect(result.content).toEqual([
					{ type: 'text', text: JSON.stringify(result.structuredContent) },
				]);
			}),
			{ numRuns: 200 },
		);
	});
});
