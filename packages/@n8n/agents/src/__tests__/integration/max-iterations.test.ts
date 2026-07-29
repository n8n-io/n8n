import { expect, it } from 'vitest';
import { z } from 'zod';

import { collectStreamChunks, chunksOfType, describeIf, getModel } from './helpers';
import { Agent, Tool } from '../../index';
import type { CheckpointStore, SerializableAgentState } from '../../types';

const describe = describeIf('anthropic');

class InMemoryCheckpointStore implements CheckpointStore {
	private store = new Map<string, SerializableAgentState>();

	async save(key: string, state: SerializableAgentState): Promise<void> {
		this.store.set(key, structuredClone(state));
	}

	async load(key: string): Promise<SerializableAgentState | undefined> {
		const state = this.store.get(key);
		return state ? structuredClone(state) : undefined;
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
	}
}

function createInterruptibleDeleteAgent(
	checkpointStore: 'memory' | CheckpointStore = 'memory',
): Agent {
	const deleteTool = new Tool('delete_file')
		.description('Delete a file at the given path')
		.input(z.object({ path: z.string().describe('File path to delete') }))
		.output(z.object({ deleted: z.boolean(), path: z.string() }))
		.suspend(z.object({ message: z.string(), severity: z.string() }))
		.resume(z.object({ approved: z.boolean() }))
		.handler(async ({ path }, ctx) => {
			if (!ctx.resumeData) {
				return await ctx.suspend({ message: `Delete "${path}"?`, severity: 'destructive' });
			}
			if (!ctx.resumeData.approved) return { deleted: false, path };
			return { deleted: true, path };
		});

	return new Agent('max-iterations-test-agent')
		.model(getModel('anthropic'))
		.instructions(
			'You are a file manager. When asked to delete a file, always call delete_file first.',
		)
		.tool(deleteTool)
		.checkpoint(checkpointStore);
}

type RunMethod = 'generate' | 'stream';

type PendingSuspendSummary = {
	runId: string;
	toolCallId: string;
	toolName: string;
};

type ToolResultSummary = {
	toolName: string;
	output: unknown;
	isError?: boolean;
};

type RunSummary = {
	finishReason: string | undefined;
	pendingSuspend: PendingSuspendSummary[];
	toolResults: ToolResultSummary[];
	error: unknown;
};

type SettledToolCallContent = {
	type: 'tool-call';
	state: 'resolved' | 'rejected';
	toolName: string;
	output?: unknown;
	error?: unknown;
};

function isSettledToolCallContent(value: unknown): value is SettledToolCallContent {
	if (value === null || typeof value !== 'object') return false;
	const record = value as Record<string, unknown>;
	const type = record.type;
	const state = record.state;
	const toolName = record.toolName;
	return (
		type === 'tool-call' &&
		(state === 'resolved' || state === 'rejected') &&
		typeof toolName === 'string'
	);
}

function extractToolResultsFromMessages(messages: unknown[]): ToolResultSummary[] {
	return messages
		.flatMap((message) => {
			if (message === null || typeof message !== 'object') return [];
			const content = (message as Record<string, unknown>).content;
			return Array.isArray(content) ? (content as unknown[]) : [];
		})
		.filter(isSettledToolCallContent)
		.map((toolCall) => ({
			toolName: toolCall.toolName,
			output: toolCall.state === 'resolved' ? toolCall.output : toolCall.error,
			isError: toolCall.state === 'rejected',
		}));
}

async function runAgent(
	agent: Agent,
	method: RunMethod,
	input: string,
	options?: { maxIterations?: number },
): Promise<RunSummary> {
	if (method === 'generate') {
		const result = await agent.generate(input, options);
		const toolResults = [
			...(result.toolCalls ?? []).map((t) => ({
				toolName: t.tool,
				output: t.output,
			})),
			...extractToolResultsFromMessages(result.messages),
		];
		return {
			finishReason: result.finishReason,
			pendingSuspend: (result.pendingSuspend ?? []).map((s) => ({
				runId: s.runId,
				toolCallId: s.toolCallId,
				toolName: s.toolName,
			})),
			toolResults,
			error: result.error,
		};
	}

	const result = await agent.stream(input, options);
	const chunks = await collectStreamChunks(result.stream);
	const finishChunks = chunksOfType(chunks, 'finish');
	const errorChunks = chunksOfType(chunks, 'error');
	return {
		finishReason: finishChunks[finishChunks.length - 1]?.finishReason,
		pendingSuspend: chunksOfType(chunks, 'tool-call-suspended').map((s) => ({
			runId: s.runId,
			toolCallId: s.toolCallId,
			toolName: s.toolName,
		})),
		toolResults: chunksOfType(chunks, 'tool-result').map((t) => ({
			toolName: t.toolName,
			output: t.output,
			isError: t.isError,
		})),
		error: errorChunks[0]?.error,
	};
}

async function resumeAgent(
	agent: Agent,
	method: RunMethod,
	data: { approved: boolean },
	options: { runId: string; toolCallId: string; maxIterations?: number },
): Promise<RunSummary> {
	if (method === 'generate') {
		const result = await agent.resume('generate', data, options);
		const toolResults = [
			...(result.toolCalls ?? []).map((t) => ({
				toolName: t.tool,
				output: t.output,
			})),
			...extractToolResultsFromMessages(result.messages),
		];
		return {
			finishReason: result.finishReason,
			pendingSuspend: (result.pendingSuspend ?? []).map((s) => ({
				runId: s.runId,
				toolCallId: s.toolCallId,
				toolName: s.toolName,
			})),
			toolResults,
			error: result.error,
		};
	}

	const result = await agent.resume('stream', data, options);
	const chunks = await collectStreamChunks(result.stream);
	const finishChunks = chunksOfType(chunks, 'finish');
	const errorChunks = chunksOfType(chunks, 'error');
	return {
		finishReason: finishChunks[finishChunks.length - 1]?.finishReason,
		pendingSuspend: chunksOfType(chunks, 'tool-call-suspended').map((s) => ({
			runId: s.runId,
			toolCallId: s.toolCallId,
			toolName: s.toolName,
		})),
		toolResults: chunksOfType(chunks, 'tool-result').map((t) => ({
			toolName: t.toolName,
			output: t.output,
			isError: t.isError,
		})),
		error: errorChunks[0]?.error,
	};
}

describe('maxIterations integration', () => {
	const methods: RunMethod[] = ['generate', 'stream'];

	it.each(methods)(
		'returns "length" (not error) when iteration limit is reached in resumed %s()',
		async (method) => {
			const agent = createInterruptibleDeleteAgent();

			const first = await runAgent(agent, method, 'Delete the file /tmp/test.txt', {
				maxIterations: 1,
			});
			expect(first.finishReason).toBe('tool-calls');
			expect(first.pendingSuspend).toBeDefined();

			const { runId, toolCallId } = first.pendingSuspend[0];
			const resumed = await resumeAgent(
				agent,
				method,
				{ approved: true },
				{ runId, toolCallId, maxIterations: 1 },
			);

			expect(resumed.finishReason).toBe('max-iterations');
			expect(resumed.error).toBeUndefined();
		},
	);

	it.each(methods)(
		'persists maxIterations together with completed iteration count in checkpoints (%s)',
		async (method) => {
			const checkpointStore = new InMemoryCheckpointStore();
			const agent = createInterruptibleDeleteAgent(checkpointStore);

			const first = await runAgent(agent, method, 'Delete the file /tmp/checkpoint-test.txt', {
				maxIterations: 3,
			});
			expect(first.finishReason).toBe('tool-calls');
			expect(first.pendingSuspend).toBeDefined();

			const runId = first.pendingSuspend[0].runId;
			const state = await checkpointStore.load(runId);

			expect(state).toBeDefined();
			expect(state!.executionOptions).toEqual({ maxIterations: 3 });
			expect(state!.iterationCount).toBe(1);
		},
	);

	it.each(methods)(
		'deletes two files sequentially and stops after second resume with "length" in %s()',
		async (method) => {
			const checkpointStore = new InMemoryCheckpointStore();
			const agent1 = createInterruptibleDeleteAgent(checkpointStore);

			const first = await runAgent(
				agent1,
				method,
				'In your first response, call delete_file exactly twice in this order: /tmp/first.txt then /tmp/second.txt. Do not output text before tool calls.',
				{
					maxIterations: 1,
				},
			);
			expect(first.finishReason).toBe('tool-calls');
			expect(first.pendingSuspend).toHaveLength(1);

			// Recreate agent to ensure resume relies on persisted execution options.
			const agent2 = createInterruptibleDeleteAgent(checkpointStore);
			const firstSuspended = first.pendingSuspend[0];
			const resumed1 = await resumeAgent(agent2, method, { approved: true }, firstSuspended);

			expect(resumed1.finishReason).toBe('tool-calls');
			expect(resumed1.pendingSuspend).toHaveLength(1);
			expect(resumed1.toolResults.length).toBeGreaterThan(0);
			expect(resumed1.toolResults.find((t) => t.toolName === 'delete_file')).toBeDefined();

			const secondSuspended = resumed1.pendingSuspend[0];
			const resumed2 = await resumeAgent(agent2, method, { approved: true }, secondSuspended);

			expect(resumed2.finishReason).toBe('max-iterations');
			expect(resumed2.error).toBeUndefined();
			expect(resumed2.pendingSuspend).toHaveLength(0);

			const allDeleteResults = [...resumed1.toolResults, ...resumed2.toolResults]
				.filter((t) => t.toolName === 'delete_file')
				.map((t) => t.output as { deleted?: boolean; path?: string });

			expect(allDeleteResults.length).toBeGreaterThanOrEqual(2);
			expect(allDeleteResults.some((t) => t.deleted === true && t.path === '/tmp/first.txt')).toBe(
				true,
			);
			expect(allDeleteResults.some((t) => t.deleted === true && t.path === '/tmp/second.txt')).toBe(
				true,
			);
		},
	);
});
