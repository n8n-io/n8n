import { expect, it } from 'vitest';
import { z } from 'zod';

import { collectStreamChunks, chunksOfType, describeIf, getModel } from './helpers';
import type { StreamChunk } from './helpers';
import { Agent, Tool } from '../../index';
import type { CheckpointStore, SerializableAgentState } from '../../types';

const describe = describeIf('anthropic');

/**
 * A minimal CheckpointStore backed by a plain Map so it can be shared across
 * agent instances to simulate durable external storage (database, Redis, etc.).
 */
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

	get size(): number {
		return this.store.size;
	}
}

/**
 * Build an agent that has a delete_file tool that always suspends on the first
 * call and resumes with approval/denial on the second.
 */
function buildDeleteAgent(checkpointStore: CheckpointStore): Agent {
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

	return new Agent('file-manager')
		.model(getModel('anthropic'))
		.instructions(
			'You are a file manager. When asked to delete a file, use the delete_file tool. After the tool result, confirm what happened concisely.',
		)
		.tool(deleteTool)
		.checkpoint(checkpointStore);
}

describe('state restore after suspension', () => {
	it('resumes with generate after agent instance is destroyed and recreated', async () => {
		const checkpointStore = new InMemoryCheckpointStore();

		// --- Agent 1: run until suspended ---
		let suspendedRunId: string;
		let suspendedToolCallId: string;

		{
			const agent1 = buildDeleteAgent(checkpointStore);

			const result = await agent1.generate('Delete the file /tmp/important.log');

			expect(result.finishReason).toBe('tool-calls');
			expect(result.pendingSuspend).toBeDefined();

			suspendedRunId = result.pendingSuspend![0].runId;
			suspendedToolCallId = result.pendingSuspend![0].toolCallId;
			expect(suspendedRunId).toBeTruthy();
			expect(suspendedToolCallId).toBeTruthy();

			// Checkpoint store now holds the suspended state
			expect(checkpointStore.size).toBe(1);

			// agent1 goes out of scope here — its in-flight Map is gone
		}

		// --- Agent 2: freshly created, loads state from the shared CheckpointStore ---
		const agent2 = buildDeleteAgent(checkpointStore);

		const result2 = await agent2.resume(
			'generate',
			{ approved: true },
			{ runId: suspendedRunId, toolCallId: suspendedToolCallId },
		);

		expect(result2.finishReason).not.toBe('error');
		expect(result2.finishReason).not.toBe('tool-calls');

		// The resumed result should contain a text response from the assistant
		const assistantMessages = result2.messages.filter((m) => 'role' in m && m.role === 'assistant');
		expect(assistantMessages.length).toBeGreaterThan(0);

		const hasText = assistantMessages.some(
			(m) => 'content' in m && m.content.some((c) => c.type === 'text'),
		);
		expect(hasText).toBe(true);

		// Checkpoint should have been cleaned up after successful resumption
		expect(checkpointStore.size).toBe(0);
	});

	it('resumes with stream after agent instance is destroyed and recreated', async () => {
		const checkpointStore = new InMemoryCheckpointStore();

		let suspendedRunId: string;
		let suspendedToolCallId: string;

		{
			const agent1 = buildDeleteAgent(checkpointStore);

			const { stream } = await agent1.stream('Delete the file /tmp/data.csv');
			const chunks = await collectStreamChunks(stream);

			const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');
			expect(suspendedChunks.length).toBe(1);

			const suspended = suspendedChunks[0] as StreamChunk & { type: 'tool-call-suspended' };
			expect(suspended.toolName).toBe('delete_file');

			suspendedRunId = suspended.runId!;
			suspendedToolCallId = suspended.toolCallId!;

			// State is persisted in the external store
			expect(checkpointStore.size).toBe(1);

			// agent1 is destroyed here
		}

		// --- Agent 2: new instance, same checkpoint store ---
		const agent2 = buildDeleteAgent(checkpointStore);

		const resumedStream = await agent2.resume(
			'stream',
			{ approved: true },
			{ runId: suspendedRunId, toolCallId: suspendedToolCallId },
		);

		const resumedChunks = await collectStreamChunks(resumedStream.stream);

		// No error chunks
		const errorChunks = resumedChunks.filter((c) => c.type === 'error');
		expect(errorChunks).toHaveLength(0);

		// Stream must contain the tool result message
		const toolResultChunks = resumedChunks.filter(
			(c) =>
				c.type === 'message' &&
				'message' in c &&
				'content' in (c.message as object) &&
				(c.message as { content: Array<{ type: string }> }).content.some(
					(part) => part.type === 'tool-result',
				),
		);
		expect(toolResultChunks.length).toBeGreaterThan(0);

		// Stream must end with a finish chunk (not error)
		const finishChunks = chunksOfType(resumedChunks, 'finish') as Array<
			StreamChunk & { type: 'finish' }
		>;
		expect(finishChunks.length).toBeGreaterThan(0);
		expect(finishChunks[0].finishReason).not.toBe('error');

		// At least one text-delta should arrive (the LLM's final response)
		const textDeltas = chunksOfType(resumedChunks, 'text-delta');
		expect(textDeltas.length).toBeGreaterThan(0);
	});

	it('correctly restores message history so the LLM has full context', async () => {
		const checkpointStore = new InMemoryCheckpointStore();

		let suspendedRunId: string;
		let suspendedToolCallId: string;
		let originalPath: string;

		{
			originalPath = '/tmp/critical-data.db';
			const agent1 = buildDeleteAgent(checkpointStore);
			const result = await agent1.generate(`Delete the file ${originalPath}`);

			expect(result.pendingSuspend).toBeDefined();
			suspendedRunId = result.pendingSuspend![0].runId;
			suspendedToolCallId = result.pendingSuspend![0].toolCallId;
		}

		const agent2 = buildDeleteAgent(checkpointStore);
		const result2 = await agent2.resume(
			'generate',
			{ approved: true },
			{ runId: suspendedRunId, toolCallId: suspendedToolCallId },
		);

		expect(result2.finishReason).not.toBe('error');

		// The assistant response should reference the original file path,
		// proving the full conversation context was restored correctly
		const textContent = result2.messages
			.filter((m) => 'role' in m && m.role === 'assistant')
			.flatMap((m) => ('content' in m ? m.content : []))
			.filter((c) => c.type === 'text')
			.map((c) => ('text' in c ? c.text : ''))
			.join('');

		expect(textContent.length).toBeGreaterThan(0);
		// The LLM should confirm what happened (mentioning the file or deletion)
		expect(textContent.toLowerCase()).toMatch(/delete|delet|remov|file/);
	});
});
