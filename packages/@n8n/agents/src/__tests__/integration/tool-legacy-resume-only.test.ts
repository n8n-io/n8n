/**
 * A tool can keep its former names for resume only. A suspended call under a
 * former name resumes in the tool with its input converted. A new model call
 * under a former name fails as an unknown tool.
 *
 * The model is scripted with `MockLanguageModelV3`, so the real `streamText`
 * tool-call parsing and repair run.
 */
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { chunksOfType, collectStreamChunks } from './helpers';
import {
	Agent,
	Tool,
	type BuiltTool,
	type CheckpointStore,
	type SerializableAgentState,
} from '../../index';

type MockStreamResult = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
type MockStreamPart = MockStreamResult['stream'] extends ReadableStream<infer P> ? P : never;

const USAGE: Extract<MockStreamPart, { type: 'finish' }>['usage'] = {
	inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 5, text: 5, reasoning: 0 },
};

function toolCallTurn(toolName: string, args: Record<string, unknown>): MockStreamResult {
	const parts: MockStreamPart[] = [
		{ type: 'stream-start', warnings: [] },
		{ type: 'tool-call', toolCallId: 'tc-1', toolName, input: JSON.stringify(args) },
		{ type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage: USAGE },
	];
	return { stream: convertArrayToReadableStream(parts) };
}

function textTurn(text: string): MockStreamResult {
	const parts: MockStreamPart[] = [
		{ type: 'stream-start', warnings: [] },
		{ type: 'text-start', id: 'txt-1' },
		{ type: 'text-delta', id: 'txt-1', delta: text },
		{ type: 'text-end', id: 'txt-1' },
		{ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE },
	];
	return { stream: convertArrayToReadableStream(parts) };
}

function scriptedModel(...turns: MockStreamResult[]) {
	let next = 0;
	return new MockLanguageModelV3({
		provider: 'mock',
		modelId: 'scripted',
		doStream: async () => await Promise.resolve(turns[next++]),
	});
}

/** One store that two agents share, like two deploys on one database. */
function sharedCheckpointStore(): CheckpointStore {
	const store = new Map<string, SerializableAgentState>();
	return {
		save: async (key, state) => {
			await Promise.resolve(store.set(key, state));
		},
		load: async (key) => await Promise.resolve(store.get(key)),
		delete: async (key) => {
			await Promise.resolve(store.delete(key));
		},
	};
}

const approvalResume = z.object({ approved: z.boolean() });

/** The former tool: it suspends for approval and never runs on resume in these tests. */
function formerTool(name: string, input: z.ZodTypeAny) {
	return new Tool(name)
		.description(`Former ${name}`)
		.input(input)
		.suspend(z.object({ message: z.string() }))
		.resume(approvalResume)
		.handler(async (_input, ctx) => {
			if (!ctx.resumeData) return await ctx.suspend({ message: 'approve?' });
			throw new Error('The former tool must not run on resume');
		})
		.build();
}

interface Seen {
	converted: Array<{ formerName: string; input: unknown }>;
	handled: Array<{ input: unknown; resumeData: unknown }>;
}

/** The current tool. Its former names are for resume only. */
function currentTool(seen: Seen, former: { names?: string[]; actions?: [string, string] } = {}) {
	const tool = new Tool('change_items')
		.description('Change items')
		.input(z.object({ text: z.string() }))
		.suspend(z.object({ message: z.string() }))
		.resume(approvalResume);
	if (former.names) tool.legacyNames(...former.names);
	if (former.actions) tool.legacyActions(...former.actions);
	return tool
		.legacyForResumeOnly((formerName, input) => {
			seen.converted.push({ formerName, input });
			return { text: `${formerName}:${JSON.stringify(input)}` };
		})
		.handler(async (input, ctx) => {
			seen.handled.push({ input, resumeData: ctx.resumeData });
			if (!ctx.resumeData) return await ctx.suspend({ message: 'approve?' });
			return { ok: true };
		})
		.build();
}

type Placement = 'core' | 'deferred';

function agentWith(
	name: string,
	tool: BuiltTool,
	placement: Placement,
	model: MockLanguageModelV3,
	checkpoint: CheckpointStore | 'memory' = 'memory',
) {
	const agent = new Agent(name).model(model).instructions('Use the tools.').checkpoint(checkpoint);
	if (placement === 'core') return agent.tool(tool);
	return agent.toolDeferral({ mode: 'tool-catalog' }).deferredTool(tool, { group: 'items' });
}

/** Suspend a call in agent A, then resume it in agent B on the same checkpoint store. */
async function suspendThenResume(options: {
	placement: Placement;
	former: BuiltTool;
	current: BuiltTool;
	call: { toolName: string; args: Record<string, unknown> };
}) {
	const checkpoint = sharedCheckpointStore();
	const first = await agentWith(
		'agent-a',
		options.former,
		options.placement,
		scriptedModel(toolCallTurn(options.call.toolName, options.call.args)),
		checkpoint,
	).stream('Go');
	const pending = chunksOfType(await collectStreamChunks(first.stream), 'tool-call-suspended')[0];
	if (!pending?.runId || !pending.toolCallId) throw new Error('Expected agent A to suspend');

	const resumed = await agentWith(
		'agent-b',
		options.current,
		options.placement,
		scriptedModel(textTurn('Done.')),
		checkpoint,
	).resume('stream', { approved: true }, { runId: pending.runId, toolCallId: pending.toolCallId });
	return await collectStreamChunks(resumed.stream);
}

describe('former tool names for resume only', () => {
	describe('a suspended call under a former name', () => {
		it('resumes a call_tool call of a deferred tool with the converted input', async () => {
			const seen: Seen = { converted: [], handled: [] };
			const chunks = await suspendThenResume({
				placement: 'deferred',
				former: formerTool('approve', z.object({ question: z.string() })),
				current: currentTool(seen, { names: ['approve'] }),
				call: { toolName: 'call_tool', args: { tool: 'approve', arguments: { question: 'q' } } },
			});

			expect(chunksOfType(chunks, 'error')).toEqual([]);
			expect(seen.converted).toEqual([{ formerName: 'approve', input: { question: 'q' } }]);
			expect(seen.handled).toEqual([
				{ input: { text: 'approve:{"question":"q"}' }, resumeData: { approved: true } },
			]);
		});

		it('resumes a direct call of a core tool with the converted input', async () => {
			const seen: Seen = { converted: [], handled: [] };
			const chunks = await suspendThenResume({
				placement: 'core',
				former: formerTool('approve', z.object({ question: z.string() })),
				current: currentTool(seen, { names: ['approve'] }),
				call: { toolName: 'approve', args: { question: 'q' } },
			});

			expect(chunksOfType(chunks, 'error')).toEqual([]);
			expect(seen.converted).toEqual([{ formerName: 'approve', input: { question: 'q' } }]);
			expect(seen.handled).toEqual([
				{ input: { text: 'approve:{"question":"q"}' }, resumeData: { approved: true } },
			]);
		});

		it.each<{ placement: Placement; call: { toolName: string; args: Record<string, unknown> } }>([
			{ placement: 'core', call: { toolName: 'items', args: { action: 'create', id: '1' } } },
			{
				placement: 'deferred',
				call: {
					toolName: 'call_tool',
					args: { tool: 'items', arguments: { action: 'create', id: '1' } },
				},
			},
		])(
			'gives the converter the action of a former split tool call ($placement)',
			async ({ placement, call }) => {
				const seen: Seen = { converted: [], handled: [] };
				await suspendThenResume({
					placement,
					former: formerTool('items', z.object({ action: z.string(), id: z.string() })),
					current: currentTool(seen, { actions: ['items', 'create'] }),
					call,
				});

				expect(seen.converted).toEqual([
					{ formerName: 'items', input: { action: 'create', id: '1' } },
				]);
				expect(seen.handled).toHaveLength(1);
			},
		);
	});

	describe('a new model call under a former name', () => {
		it.each<{
			name: string;
			placement: Placement;
			toolName: string;
			args: Record<string, unknown>;
		}>([
			{ name: 'a former name', placement: 'core', toolName: 'approve', args: { text: 'x' } },
			{
				name: 'a former split tool action',
				placement: 'core',
				toolName: 'items',
				args: { action: 'create', text: 'x' },
			},
			{ name: 'a former name', placement: 'deferred', toolName: 'approve', args: { text: 'x' } },
			{
				name: 'a former name through call_tool',
				placement: 'deferred',
				toolName: 'call_tool',
				args: { tool: 'approve', arguments: { text: 'x' } },
			},
			{
				name: 'a former split tool action through call_tool',
				placement: 'deferred',
				toolName: 'call_tool',
				args: { tool: 'items', arguments: { action: 'create', text: 'x' } },
			},
		])('does not run the tool for $name ($placement)', async ({ placement, toolName, args }) => {
			const seen: Seen = { converted: [], handled: [] };
			const tool = currentTool(seen, { names: ['approve'], actions: ['items', 'create'] });
			const agent = agentWith(
				'fresh-call-agent',
				tool,
				placement,
				scriptedModel(toolCallTurn(toolName, args), textTurn('Done.')),
			);

			const chunks = await collectStreamChunks((await agent.stream('Go')).stream);

			expect(seen).toEqual({ converted: [], handled: [] });
			const results = chunksOfType(chunks, 'tool-result');
			expect(results.length).toBeGreaterThan(0);
			expect(
				results.every((chunk) => chunk.isError === true || chunk.toolName === 'call_tool'),
			).toBe(true);
		});
	});
});
