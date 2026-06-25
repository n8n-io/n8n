import fs, { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { mock } from 'jest-mock-extended';
import type { ErrorReporter, StorageConfig } from 'n8n-core';

import { AgentExecutionLogFsStore } from '../fs-store';
import type { AgentExecutionLogPayload, AgentExecutionLogRef } from '../types';

jest.unmock('node:fs/promises');

describe('AgentExecutionLogFsStore', () => {
	let storagePath: string;
	let store: AgentExecutionLogFsStore;
	let errorReporter: jest.Mocked<ErrorReporter>;

	const ref: AgentExecutionLogRef = {
		agentId: 'agent/1',
		threadId: 'thread:1/../unsafe',
		executionId: 'execution-1',
	};
	const payload: AgentExecutionLogPayload = {
		userMessage: 'Hello',
		assistantResponse: 'Hi',
		toolCalls: [{ name: 'lookup', input: { query: 'n8n' }, output: { ok: true } }],
		timeline: [{ type: 'text', content: 'Hi', timestamp: 1, endTime: 2 }],
		error: null,
	};

	beforeEach(async () => {
		storagePath = path.join(
			tmpdir(),
			`agent-execution-log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		);
		await mkdir(storagePath, { recursive: true });
		errorReporter = mock<ErrorReporter>();
		store = new AgentExecutionLogFsStore({ storagePath } as StorageConfig, errorReporter);
	});

	afterEach(async () => {
		jest.restoreAllMocks();
		await rm(storagePath, { recursive: true, force: true });
	});

	it('writes atomically and reads an agent execution log payload', async () => {
		const sizeBytes = await store.write(ref, payload);

		expect(sizeBytes).toBeGreaterThan(0);
		await expect(store.read(ref)).resolves.toEqual({ ...payload, version: 1 });
	});

	it('returns null for missing payloads', async () => {
		await expect(store.read(ref)).resolves.toBeNull();
	});

	it('reads many payloads by execution id', async () => {
		const secondRef = { ...ref, executionId: 'execution-2' };
		const secondPayload = { ...payload, userMessage: 'Second' };
		await store.write(ref, payload);
		await store.write(secondRef, secondPayload);

		const bundles = await store.readMany([ref, secondRef]);

		expect(bundles.get('execution-1')).toEqual({ ...payload, version: 1 });
		expect(bundles.get('execution-2')).toEqual({ ...secondPayload, version: 1 });
	});

	it('deletes execution log directories', async () => {
		await store.write(ref, payload);
		await store.delete(ref);

		await expect(store.read(ref)).resolves.toBeNull();
	});

	it('deletes all execution logs for an agent', async () => {
		const secondRef = { ...ref, threadId: 'thread-2', executionId: 'execution-2' };
		const otherAgentRef = { ...ref, agentId: 'agent-2', executionId: 'execution-3' };
		await store.write(ref, payload);
		await store.write(secondRef, payload);
		await store.write(otherAgentRef, payload);

		await store.deleteByAgentId(ref.agentId);

		await expect(store.read(ref)).resolves.toBeNull();
		await expect(store.read(secondRef)).resolves.toBeNull();
		await expect(store.read(otherAgentRef)).resolves.toEqual({ ...payload, version: 1 });
	});

	it('reports and drops corrupted payloads during batch reads', async () => {
		const badRef = { ...ref, executionId: 'bad' };
		await store.write(ref, payload);
		const badDir = path.join(
			storagePath,
			'agents',
			encodeURIComponent(badRef.agentId),
			'threads',
			encodeURIComponent(badRef.threadId),
			'executions',
			encodeURIComponent(badRef.executionId),
		);
		await mkdir(badDir, { recursive: true });
		await fs.writeFile(path.join(badDir, 'log.json'), 'not-json', 'utf-8');

		const bundles = await store.readMany([ref, badRef]);

		expect(bundles.has('execution-1')).toBe(true);
		expect(bundles.has('bad')).toBe(false);
		expect(errorReporter.error).toHaveBeenCalledWith(expect.any(SyntaxError));
	});

	it('rethrows systemic read errors during batch reads', async () => {
		await store.write(ref, payload);
		const eacces = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
		jest.spyOn(fs, 'readFile').mockRejectedValueOnce(eacces);

		await expect(store.readMany([ref])).rejects.toBe(eacces);
		expect(errorReporter.error).not.toHaveBeenCalled();
	});
});
