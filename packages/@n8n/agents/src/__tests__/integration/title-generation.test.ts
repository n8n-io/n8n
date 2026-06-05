import { expect, it, vi, afterEach, beforeEach } from 'vitest';

import { describeIf, getModel, collectStreamChunks, createInMemoryAgentMemory } from './helpers';
import { Agent, Memory } from '../../index';

const describe = describeIf('anthropic');

describe('title generation integration', () => {
	let memoryCtx: ReturnType<typeof createInMemoryAgentMemory>;

	beforeEach(() => {
		memoryCtx = createInMemoryAgentMemory();
	});

	afterEach(async () => {
		memoryCtx.cleanup();
	});

	it('auto-generates a thread title after generate() on a new thread', async () => {
		const memory = new Memory().storage(memoryCtx.memory).titleGeneration(true);

		const agent = new Agent('title-gen-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(memory);

		const threadId = `title-test-${Date.now()}`;
		const resourceId = 'test-user';

		const threadBefore = await memoryCtx.memory.getThread(threadId);
		expect(threadBefore).toBeNull();

		await agent.generate('Tell me about the history of Rome', {
			persistence: { threadId, resourceId },
		});

		await vi.waitFor(
			async () => {
				const thread = await memoryCtx.memory.getThread(threadId);
				expect(thread).toBeDefined();
				expect(thread!.title).toBeTruthy();
				expect(thread!.title!.length).toBeGreaterThan(0);
				expect(thread!.title!.length).toBeLessThanOrEqual(80);
			},
			{ timeout: 30_000, interval: 500 },
		);
	});

	it('auto-generates a thread title after stream() on a new thread', async () => {
		const memory = new Memory().storage(memoryCtx.memory).titleGeneration(true);

		const agent = new Agent('title-gen-stream-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(memory);

		const threadId = `title-stream-test-${Date.now()}`;
		const resourceId = 'test-user';

		const { stream } = await agent.stream('Explain quantum computing basics', {
			persistence: { threadId, resourceId },
		});

		await collectStreamChunks(stream);

		await vi.waitFor(
			async () => {
				const thread = await memoryCtx.memory.getThread(threadId);
				expect(thread).toBeDefined();
				expect(thread!.title).toBeTruthy();
				expect(thread!.title!.length).toBeGreaterThan(0);
				expect(thread!.title!.length).toBeLessThanOrEqual(80);
			},
			{ timeout: 30_000, interval: 500 },
		);
	});

	it('does not generate a title when titleGeneration is not configured', async () => {
		const memory = new Memory().storage(memoryCtx.memory);

		const agent = new Agent('no-title-gen-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(memory);

		const threadId = `no-title-test-${Date.now()}`;

		await agent.generate('Hello, how are you?', {
			persistence: { threadId, resourceId: 'test-user' },
		});

		await new Promise((r) => setTimeout(r, 3_000));

		const thread = await memoryCtx.memory.getThread(threadId);
		expect(thread).toBeDefined();
		expect(thread!.title).toBeFalsy();
	});

	it('does not overwrite a pre-existing thread title', async () => {
		const existingTitle = 'My Pre-Existing Title';

		await memoryCtx.memory.saveThread({
			id: 'pre-titled-thread',
			resourceId: 'test-user',
			title: existingTitle,
			metadata: { custom: 'data' },
		});

		const memory = new Memory().storage(memoryCtx.memory).titleGeneration(true);

		const agent = new Agent('title-no-overwrite-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(memory);

		await agent.generate('What is 2+2?', {
			persistence: { threadId: 'pre-titled-thread', resourceId: 'test-user' },
		});

		// Allow fire-and-forget title generation to settle
		await new Promise((r) => setTimeout(r, 5_000));

		const thread = await memoryCtx.memory.getThread('pre-titled-thread');
		expect(thread!.title).toBe(existingTitle);
		expect(thread!.metadata).toEqual({ custom: 'data' });
	});

	it('accepts a custom model for title generation', async () => {
		const memory = new Memory().storage(memoryCtx.memory).titleGeneration({
			model: 'anthropic/claude-haiku-4-5',
		});

		const agent = new Agent('title-custom-model-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(memory);

		const threadId = `title-custom-model-${Date.now()}`;

		await agent.generate('What are the best practices for growing tomatoes?', {
			persistence: { threadId, resourceId: 'test-user' },
		});

		await vi.waitFor(
			async () => {
				const thread = await memoryCtx.memory.getThread(threadId);
				expect(thread).toBeDefined();
				expect(thread!.title).toBeTruthy();
				expect(thread!.title!.length).toBeGreaterThan(0);
			},
			{ timeout: 30_000, interval: 500 },
		);
	});
});
