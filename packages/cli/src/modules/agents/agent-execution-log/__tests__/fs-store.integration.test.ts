/* eslint-disable @typescript-eslint/unbound-method */

import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { ErrorReporter, StorageConfig } from 'n8n-core';
import fs, { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FsBlobStore } from '@/executions/blob-storage/fs-blob-store';

import { AGENT_EXECUTION_LOG_BUNDLE_FILENAME } from '../constants';
import { CorruptedAgentExecutionLogError } from '../corrupted-agent-execution-log.error';
import { FsStore } from '../fs-store';
import type { AgentExecutionLogPayload, AgentExecutionLogRef } from '../types';

jest.unmock('node:fs/promises');

const ref: AgentExecutionLogRef = {
	agentId: 'agent-1',
	threadId: 'thread-1',
	executionId: 'execution-1',
};

const payload: AgentExecutionLogPayload = {
	assistantResponse: 'Done',
	toolCalls: [{ name: 'lookup', input: { q: 'x' }, output: { ok: true } }],
	timeline: null,
	error: null,
};

const bundlePath = (storagePath: string, executionId = ref.executionId) =>
	join(
		storagePath,
		'agents',
		ref.agentId,
		'threads',
		ref.threadId,
		'executions',
		executionId,
		'execution_log',
		AGENT_EXECUTION_LOG_BUNDLE_FILENAME,
	);

describe('Agent execution log FsStore', () => {
	let fsStore: FsStore;
	let storagePath: string;
	let errorReporter: ErrorReporter;

	beforeAll(async () => {
		storagePath = await mkdtemp(join(tmpdir(), 'n8n-agent-log-fs-store-test-'));
		mockInstance(StorageConfig, { storagePath });
		errorReporter = mockInstance(ErrorReporter);
		fsStore = new FsStore(Container.get(FsBlobStore), errorReporter);
	});

	beforeEach(async () => {
		jest.mocked(errorReporter.error).mockClear();
		await rm(join(storagePath, 'agents'), { recursive: true, force: true }).catch(() => {});
	});

	afterAll(async () => {
		await rm(storagePath, { recursive: true, force: true });
	});

	it('writes and reads a versioned bundle', async () => {
		const bytes = await fsStore.write(ref, payload);

		const raw = await fs.readFile(bundlePath(storagePath), 'utf-8');
		expect(bytes).toBe(Buffer.byteLength(raw, 'utf-8'));
		expect(JSON.parse(raw)).toMatchObject({ ...payload, version: 1 });
		await expect(fsStore.read(ref)).resolves.toMatchObject({ ...payload, version: 1 });
	});

	it('encodes dynamic key segments before writing to disk', async () => {
		const unsafeRef = { ...ref, threadId: '../../outside' };

		await fsStore.write(unsafeRef, payload);

		await expect(
			fs.readFile(
				join(
					storagePath,
					'agents',
					ref.agentId,
					'threads',
					encodeURIComponent(unsafeRef.threadId),
					'executions',
					ref.executionId,
					'execution_log',
					AGENT_EXECUTION_LOG_BUNDLE_FILENAME,
				),
				'utf-8',
			),
		).resolves.toContain('"version":1');
	});

	it('returns null for a missing bundle', async () => {
		await expect(fsStore.read(ref)).resolves.toBeNull();
	});

	it('omits corrupted bundles from readMany and reports them', async () => {
		const good = { ...ref, executionId: 'good' };
		const bad = { ...ref, executionId: 'bad' };
		await fsStore.write(good, payload);
		await fs.mkdir(
			join(
				storagePath,
				'agents',
				ref.agentId,
				'threads',
				ref.threadId,
				'executions',
				'bad',
				'execution_log',
			),
			{
				recursive: true,
			},
		);
		await fs.writeFile(bundlePath(storagePath, 'bad'), 'invalid json{{{', 'utf-8');

		const bundles = await fsStore.readMany([good, bad]);

		expect(bundles.has('good')).toBe(true);
		expect(bundles.has('bad')).toBe(false);
		expect(errorReporter.error).toHaveBeenCalledWith(expect.any(CorruptedAgentExecutionLogError));
	});

	it('deletes bundles by ref', async () => {
		await fsStore.write(ref, payload);

		await fsStore.delete(ref);

		await expect(fsStore.read(ref)).resolves.toBeNull();
	});
});
