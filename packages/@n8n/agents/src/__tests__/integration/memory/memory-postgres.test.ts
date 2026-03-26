/**
 * Integration test: PostgresMemory with pgvector semantic recall.
 *
 * Uses testcontainers to spin up a real Postgres instance with pgvector,
 * then runs the agent against it to verify full end-to-end memory behavior.
 */
import { execSync } from 'node:child_process';
import { Pool } from 'pg';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Agent, Memory, PostgresMemory } from '../../../index';
import { describeIf, findLastTextContent, getModel } from '../helpers';

const describeWithApi = describeIf('anthropic');

/**
 * Check if Docker is available synchronously. testcontainers requires a running
 * Docker daemon; skip the entire file in environments without it.
 */
function isDockerAvailable(): boolean {
	try {
		execSync('docker info', { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

const hasDocker = isDockerAvailable();

let container: StartedTestContainer;
let connectionString: string;

beforeAll(async () => {
	if (!hasDocker) return;

	container = await new GenericContainer('pgvector/pgvector:pg17')
		.withExposedPorts(5432)
		.withEnvironment({
			POSTGRES_USER: 'test',
			POSTGRES_PASSWORD: 'test',
			POSTGRES_DB: 'testdb',
		})
		// Postgres emits this message twice: once during initdb (temporary) and once when truly ready.
		// Waiting for the second occurrence ensures we don't connect during the brief restart window.
		.withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
		.start();

	const host = container.getHost();
	const port = container.getMappedPort(5432);
	connectionString = `postgresql://test:test@${host}:${port}/testdb`;
}, 60_000);

afterAll(async () => {
	try {
		if (container) await container.stop();
	} catch (error) {
		console.error('Error stopping container:', error);
	}
}, 30_000);

/** describe that requires Docker — tests are no-ops without it. */
function describeWithDocker(name: string, fn: () => void) {
	describe(name, () => {
		if (!hasDocker) {
			it('skipped — Docker not available', () => {});
			return;
		}
		fn();
	});
}

describeWithDocker('PostgresMemory saveThread upsert', () => {
	it('preserves existing title and metadata when not provided', async () => {
		const mem = new PostgresMemory({ connection: connectionString, namespace: 'upsert_test' });

		await mem.saveThread({
			id: 'upsert-t1',
			resourceId: 'user-1',
			title: 'Original Title',
			metadata: { key: 'value' },
		});

		// Upsert without title or metadata (simulates saveMessagesToThread)
		await mem.saveThread({ id: 'upsert-t1', resourceId: 'user-1' });

		const thread = await mem.getThread('upsert-t1');
		expect(thread).not.toBeNull();
		expect(thread!.title).toBe('Original Title');
		expect(thread!.metadata).toEqual({ key: 'value' });

		await mem.close();
	});

	it('overwrites title and metadata when explicitly provided', async () => {
		const mem = new PostgresMemory({ connection: connectionString, namespace: 'upsert_ow' });

		await mem.saveThread({
			id: 'upsert-t2',
			resourceId: 'user-1',
			title: 'Old Title',
			metadata: { old: true },
		});

		await mem.saveThread({
			id: 'upsert-t2',
			resourceId: 'user-1',
			title: 'New Title',
			metadata: { new: true },
		});

		const thread = await mem.getThread('upsert-t2');
		expect(thread!.title).toBe('New Title');
		expect(thread!.metadata).toEqual({ new: true });

		await mem.close();
	});
});

describeWithDocker('PostgresMemory unit tests', () => {
	it('creates tables on first use and round-trips a thread', async () => {
		const mem = new PostgresMemory({ connection: connectionString });

		const thread = await mem.saveThread({
			id: 'thread-1',
			resourceId: 'user-1',
			title: 'Test Thread',
		});

		expect(thread.id).toBe('thread-1');
		expect(thread.createdAt).toBeInstanceOf(Date);

		const loaded = await mem.getThread('thread-1');
		expect(loaded).not.toBeNull();
		expect(loaded!.title).toBe('Test Thread');
		expect(loaded!.resourceId).toBe('user-1');

		await mem.close();
	});

	it('saves and retrieves messages with limit', async () => {
		const mem = new PostgresMemory({ connection: connectionString, namespace: 'msg_test' });

		await mem.saveThread({ id: 't1', resourceId: 'u1' });

		const messages = [
			{ role: 'user' as const, content: [{ type: 'text' as const, text: 'Hello' }] },
			{ role: 'assistant' as const, content: [{ type: 'text' as const, text: 'Hi there' }] },
			{ role: 'user' as const, content: [{ type: 'text' as const, text: 'How are you?' }] },
		];

		await mem.saveMessages({ threadId: 't1', messages });

		// Get last 2 messages
		const last2 = await mem.getMessages('t1', { limit: 2 });
		expect(last2).toHaveLength(2);

		// Get all messages
		const all = await mem.getMessages('t1');
		expect(all).toHaveLength(3);

		await mem.close();
	});

	it('saves and retrieves working memory keyed by resourceId', async () => {
		const mem = new PostgresMemory({ connection: connectionString, namespace: 'wm_test' });

		expect(
			await mem.getWorkingMemory({ threadId: 'thread-1', resourceId: 'user-1', scope: 'resource' }),
		).toBeNull();

		await mem.saveWorkingMemory(
			{ threadId: 'thread-1', resourceId: 'user-1', scope: 'resource' },
			'# Profile\n- Name: Alice',
		);
		expect(
			await mem.getWorkingMemory({ threadId: 'thread-1', resourceId: 'user-1', scope: 'resource' }),
		).toBe('# Profile\n- Name: Alice');

		// Overwrite
		await mem.saveWorkingMemory(
			{ threadId: 'thread-1', resourceId: 'user-1', scope: 'resource' },
			'# Profile\n- Name: Alice\n- Role: Engineer',
		);
		expect(
			await mem.getWorkingMemory({ threadId: 'thread-1', resourceId: 'user-1', scope: 'resource' }),
		).toContain('Engineer');

		await mem.close();
	});

	it('saves and retrieves working memory keyed by threadId (no resourceId)', async () => {
		const mem = new PostgresMemory({ connection: connectionString, namespace: 'wm_thread_test' });

		expect(
			await mem.getWorkingMemory({ threadId: 'thread-1', resourceId: 'user-1', scope: 'thread' }),
		).toBeNull();

		await mem.saveWorkingMemory(
			{ threadId: 'thread-1', resourceId: 'user-1', scope: 'thread' },
			'thread context',
		);
		expect(
			await mem.getWorkingMemory({ threadId: 'thread-1', resourceId: 'user-1', scope: 'thread' }),
		).toBe('thread context');

		await mem.close();
	});

	it('isolates working memory by resourceId', async () => {
		const mem = new PostgresMemory({ connection: connectionString, namespace: 'wm_iso_test' });

		await mem.saveWorkingMemory(
			{ threadId: 'thread-a', resourceId: 'user-a', scope: 'resource' },
			'data for user-a',
		);
		await mem.saveWorkingMemory(
			{ threadId: 'thread-b', resourceId: 'user-b', scope: 'resource' },
			'data for user-b',
		);

		expect(
			await mem.getWorkingMemory({ threadId: 'thread-a', resourceId: 'user-a', scope: 'resource' }),
		).toBe('data for user-a');
		expect(
			await mem.getWorkingMemory({ threadId: 'thread-b', resourceId: 'user-b', scope: 'resource' }),
		).toBe('data for user-b');

		await mem.close();
	});

	it('stores scope=resource when resourceId is provided', async () => {
		const mem = new PostgresMemory({ connection: connectionString, namespace: 'wm_scope_test' });

		await mem.saveWorkingMemory(
			{ threadId: 'thread-1', resourceId: 'res-1', scope: 'resource' },
			'resource content',
		);

		const pool = new Pool({ connectionString });
		const result = await pool.query<{ scope: string }>(
			'SELECT scope FROM wm_scope_test_working_memory WHERE key = $1',
			['res-1'],
		);
		expect(result.rows[0].scope).toBe('resource');
		await pool.end();

		await mem.close();
	});

	it('stores scope=thread when only threadId is provided', async () => {
		const mem = new PostgresMemory({
			connection: connectionString,
			namespace: 'wm_scope_thread_test',
		});

		await mem.saveWorkingMemory(
			{ threadId: 'thread-1', resourceId: 'user-1', scope: 'thread' },
			'thread content',
		);

		const pool = new Pool({ connectionString });
		const result = await pool.query<{ scope: string }>(
			'SELECT scope FROM wm_scope_thread_test_working_memory WHERE key = $1',
			['thread-1'],
		);
		expect(result.rows[0].scope).toBe('thread');
		await pool.end();

		await mem.close();
	});

	it('does not mix resource-scoped and thread-scoped entries with the same key value', async () => {
		const mem = new PostgresMemory({
			connection: connectionString,
			namespace: 'wm_scope_iso_test',
		});
		const sharedKey = 'same-id';

		await mem.saveWorkingMemory(
			{ threadId: 'thread-1', resourceId: sharedKey, scope: 'resource' },
			'resource data',
		);
		await mem.saveWorkingMemory(
			{ threadId: sharedKey, resourceId: sharedKey, scope: 'thread' },
			'thread data',
		);

		expect(
			await mem.getWorkingMemory({
				threadId: 'thread-1',
				resourceId: sharedKey,
				scope: 'resource',
			}),
		).toBe('resource data');
		expect(
			await mem.getWorkingMemory({ threadId: sharedKey, resourceId: sharedKey, scope: 'thread' }),
		).toBe('thread data');

		await mem.close();
	});

	it('deletes thread and cascades to messages', async () => {
		const mem = new PostgresMemory({ connection: connectionString, namespace: 'del_test' });

		await mem.saveThread({ id: 'del-t1', resourceId: 'u1' });
		await mem.saveMessages({
			threadId: 'del-t1',
			messages: [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'test' }] }],
		});

		await mem.deleteThread('del-t1');

		expect(await mem.getThread('del-t1')).toBeNull();
		expect(await mem.getMessages('del-t1')).toHaveLength(0);

		await mem.close();
	});

	it('stores and queries embeddings with pgvector', async () => {
		const mem = new PostgresMemory({ connection: connectionString, namespace: 'vec_test' });

		await mem.saveThread({ id: 'vec-t1', resourceId: 'u1' });

		// Save some embeddings (3-dimensional for simplicity)
		await mem.saveEmbeddings({
			threadId: 'vec-t1',
			resourceId: 'u1',
			entries: [
				{ id: 'msg-1', vector: [1.0, 0.0, 0.0], text: 'About cats', model: 'test' },
				{ id: 'msg-2', vector: [0.0, 1.0, 0.0], text: 'About dogs', model: 'test' },
				{ id: 'msg-3', vector: [0.9, 0.1, 0.0], text: 'About kittens', model: 'test' },
			],
		});

		// Query for vectors close to [1, 0, 0] — should return msg-1 and msg-3 first
		const results = await mem.queryEmbeddings({
			scope: 'resource',
			resourceId: 'u1',
			vector: [1.0, 0.0, 0.0],
			topK: 2,
		});

		expect(results).toHaveLength(2);
		expect(results[0].id).toBe('msg-1');
		expect(results[0].score).toBeGreaterThan(0.9);
		// msg-3 should be second (cosine similarity ~0.99 with [0.9, 0.1, 0])
		expect(results[1].id).toBe('msg-3');

		await mem.close();
	});

	it('filters embeddings by resourceId with scope=resource (default)', async () => {
		const mem = new PostgresMemory({ connection: connectionString, namespace: 'vec_res' });

		await mem.saveEmbeddings({
			threadId: 't1',
			resourceId: 'user-a',
			entries: [{ id: 'msg-a1', vector: [1.0, 0.0, 0.0], text: 'User A thread 1', model: 'test' }],
		});
		await mem.saveEmbeddings({
			threadId: 't2',
			resourceId: 'user-a',
			entries: [{ id: 'msg-a2', vector: [0.9, 0.1, 0.0], text: 'User A thread 2', model: 'test' }],
		});
		await mem.saveEmbeddings({
			threadId: 't3',
			resourceId: 'user-b',
			entries: [{ id: 'msg-b1', vector: [1.0, 0.0, 0.0], text: 'User B thread 3', model: 'test' }],
		});

		// Default scope is 'resource' — should return both user-a embeddings across threads
		const results = await mem.queryEmbeddings({
			resourceId: 'user-a',
			vector: [1.0, 0.0, 0.0],
			topK: 10,
		});

		expect(results).toHaveLength(2);
		const ids = results.map((r) => r.id);
		expect(ids).toContain('msg-a1');
		expect(ids).toContain('msg-a2');
		expect(ids).not.toContain('msg-b1');

		await mem.close();
	});

	it('filters embeddings by threadId with scope=thread', async () => {
		const mem = new PostgresMemory({ connection: connectionString, namespace: 'vec_thr' });

		await mem.saveEmbeddings({
			threadId: 't1',
			resourceId: 'user-1',
			entries: [
				{ id: 'msg-t1a', vector: [1.0, 0.0, 0.0], text: 'Thread 1 A', model: 'test' },
				{ id: 'msg-t1b', vector: [0.0, 1.0, 0.0], text: 'Thread 1 B', model: 'test' },
			],
		});
		await mem.saveEmbeddings({
			threadId: 't2',
			resourceId: 'user-1',
			entries: [{ id: 'msg-t2', vector: [1.0, 0.0, 0.0], text: 'Thread 2', model: 'test' }],
		});

		const results = await mem.queryEmbeddings({
			scope: 'thread',
			threadId: 't1',
			vector: [1.0, 0.0, 0.0],
			topK: 10,
		});

		expect(results).toHaveLength(2);
		const ids = results.map((r) => r.id);
		expect(ids).toContain('msg-t1a');
		expect(ids).toContain('msg-t1b');
		expect(ids).not.toContain('msg-t2');

		await mem.close();
	});

	it('resource scope excludes embeddings from other resources', async () => {
		const mem = new PostgresMemory({ connection: connectionString, namespace: 'vec_iso' });

		await mem.saveEmbeddings({
			threadId: 't1',
			resourceId: 'res-1',
			entries: [{ id: 'msg-r1', vector: [1.0, 0.0, 0.0], text: 'Resource 1', model: 'test' }],
		});
		await mem.saveEmbeddings({
			threadId: 't2',
			resourceId: 'res-2',
			entries: [{ id: 'msg-r2', vector: [1.0, 0.0, 0.0], text: 'Resource 2', model: 'test' }],
		});

		const results = await mem.queryEmbeddings({
			scope: 'resource',
			resourceId: 'res-1',
			vector: [1.0, 0.0, 0.0],
			topK: 10,
		});

		expect(results).toHaveLength(1);
		expect(results[0].id).toBe('msg-r1');

		await mem.close();
	});

	it('stores resourceId in the embeddings table', async () => {
		const mem = new PostgresMemory({ connection: connectionString, namespace: 'vec_col' });

		await mem.saveEmbeddings({
			threadId: 't1',
			resourceId: 'my-resource',
			entries: [
				{ id: 'msg-check', vector: [1.0, 0.0, 0.0], text: 'Check resourceId', model: 'test' },
			],
		});

		const pool = new Pool({ connectionString });
		const result = await pool.query<{ resourceId: string }>(
			'SELECT "resourceId" FROM vec_col_message_embeddings WHERE id = $1',
			['msg-check'],
		);
		expect(result.rows[0].resourceId).toBe('my-resource');
		await pool.end();

		await mem.close();
	});

	it('isolates namespaces', async () => {
		const mem1 = new PostgresMemory({ connection: connectionString, namespace: 'ns_a' });
		const mem2 = new PostgresMemory({ connection: connectionString, namespace: 'ns_b' });

		await mem1.saveThread({ id: 'shared-id', resourceId: 'u1', title: 'From A' });
		await mem2.saveThread({ id: 'shared-id', resourceId: 'u1', title: 'From B' });

		expect((await mem1.getThread('shared-id'))!.title).toBe('From A');
		expect((await mem2.getThread('shared-id'))!.title).toBe('From B');

		await mem1.close();
		await mem2.close();
	});
});

/** describe that requires both Docker and an Anthropic API key. */
function describeWithDockerAndApi(name: string, fn: () => void) {
	const describeOrSkip = describeWithApi;
	describeOrSkip(name, () => {
		if (!hasDocker) {
			it('skipped — Docker not available', () => {});
			return;
		}
		fn();
	});
}

describeWithDockerAndApi('PostgresMemory agent integration', () => {
	it('recalls previous messages across turns', async () => {
		const store = new PostgresMemory({ connection: connectionString, namespace: 'agent_recall' });
		const memory = new Memory().storage(store).lastMessages(10);

		const agent = new Agent('pg-recall-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(memory);

		const threadId = `pg-thread-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'pg-user-1' } };

		await agent.generate('My favorite planet is Saturn. Just acknowledge.', options);
		const result = await agent.generate('What is my favorite planet?', options);

		expect(findLastTextContent(result.messages)?.toLowerCase()).toContain('saturn');

		await store.close();
	});

	it('persists resource-scoped working memory via Postgres backend', async () => {
		const store = new PostgresMemory({ connection: connectionString, namespace: 'agent_wm' });
		const memory = new Memory()
			.storage(store)
			.lastMessages(10)
			.scope('resource')
			.freeform('# User Profile\n- **Name**:\n- **Hobby**:');

		const agent = new Agent('pg-wm-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise. Always update your working memory.')
			.memory(memory);

		const threadId = `pg-wm-${Date.now()}`;
		const resourceId = 'pg-wm-user';

		await agent.generate('My name is Hiro and I enjoy cycling.', {
			persistence: { threadId, resourceId },
		});

		// Working memory should be persisted in Postgres (keyed by resourceId)
		const wm = await store.getWorkingMemory({ threadId, resourceId, scope: 'resource' });
		expect(wm).toBeDefined();
		expect(wm!.toLowerCase()).toContain('hiro');

		// New thread, same resourceId — resource-scoped working memory carries over
		const result = await agent.generate('What is my name?', {
			persistence: { threadId: `pg-wm2-${Date.now()}`, resourceId },
		});
		expect(findLastTextContent(result.messages)?.toLowerCase()).toContain('hiro');

		await store.close();
	});

	it('persists thread-scoped working memory via Postgres backend', async () => {
		const store = new PostgresMemory({
			connection: connectionString,
			namespace: 'agent_thread_wm',
		});
		const memory = new Memory()
			.storage(store)
			.lastMessages(10)
			.scope('thread')
			.freeform('# Conversation Notes\n- **Topic**:\n- **Key facts**:');

		const agent = new Agent('pg-thread-wm-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise. Always update your working memory.')
			.memory(memory);

		const threadId = `pg-twm-${Date.now()}`;
		const resourceId = 'pg-twm-user';

		await agent.generate('The secret project name is HELIOS. Just acknowledge.', {
			persistence: { threadId, resourceId },
		});

		// Working memory should be stored keyed by threadId
		const wmByThread = await store.getWorkingMemory({ threadId, resourceId, scope: 'thread' });
		expect(wmByThread).toBeDefined();
		expect(wmByThread!.toLowerCase()).toContain('helios');

		// resourceId key should be empty — nothing stored there
		const wmByResource = await store.getWorkingMemory({ threadId, resourceId, scope: 'resource' });
		expect(wmByResource).toBeNull();

		// New thread for same resource — should NOT carry over thread-scoped working memory
		const thread2 = `pg-twm2-${Date.now()}`;
		const result = await agent.generate(
			'What is the project name? Answer "unknown" if you have no information.',
			{ persistence: { threadId: thread2, resourceId } },
		);
		expect(findLastTextContent(result.messages)?.toLowerCase()).not.toContain('helios');

		await store.close();
	});

	it('works with stream() path', async () => {
		const store = new PostgresMemory({ connection: connectionString, namespace: 'agent_stream' });
		const memory = new Memory().storage(store).lastMessages(10);

		const agent = new Agent('pg-stream-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(memory);

		const threadId = `pg-stream-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'pg-stream-user' } };

		// Turn 1 via stream
		const { stream } = await agent.stream(
			'The speed of light is approximately 300,000 km/s. Acknowledge.',
			options,
		);
		const reader = stream.getReader();
		while (true) {
			const { done } = await reader.read();
			if (done) break;
		}

		// Turn 2 via generate — should recall
		const genResult = await agent.generate('What is the speed of light approximately?', options);
		const text = findLastTextContent(genResult.messages);
		expect(text).toBeTruthy();
		expect(text!.toLowerCase()).toContain('300');

		await store.close();
	});
});
