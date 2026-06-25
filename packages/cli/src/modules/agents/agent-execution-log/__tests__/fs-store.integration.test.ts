/* eslint-disable @typescript-eslint/unbound-method */

import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { ErrorReporter, StorageConfig } from 'n8n-core';
import fs, { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FsBlobStore } from '@/executions/blob-storage/fs-blob-store';

import { AGENT_EXECUTION_LOG_BUNDLE_FILENAME } from '../constants';
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

const executionDirPath = (storagePath: string, target: AgentExecutionLogRef) =>
	join(
		storagePath,
		'agents',
		encodeURIComponent(target.agentId),
		'threads',
		encodeURIComponent(target.threadId),
		'executions',
		encodeURIComponent(target.executionId),
	);

describe('Agent execution log FsStore', () => {
	let fsStore: FsStore;
	let storagePath: string;

	beforeAll(async () => {
		storagePath = await mkdtemp(join(tmpdir(), 'n8n-agent-log-fs-store-test-'));
		mockInstance(StorageConfig, { storagePath });
		const errorReporter = mockInstance(ErrorReporter);
		fsStore = new FsStore(Container.get(FsBlobStore), Container.get(StorageConfig), errorReporter);
	});

	beforeEach(async () => {
		await rm(join(storagePath, 'agents'), { recursive: true, force: true }).catch(() => {});
	});

	afterAll(async () => {
		await rm(storagePath, { recursive: true, force: true });
	});

	it('writes, reads, and deletes bundles by encoded ref', async () => {
		const unsafeRef = { ...ref, threadId: '../../outside' };
		const executionDir = executionDirPath(storagePath, unsafeRef);

		const bytes = await fsStore.write(unsafeRef, payload);

		const raw = await fs.readFile(
			join(executionDir, 'execution_log', AGENT_EXECUTION_LOG_BUNDLE_FILENAME),
			'utf-8',
		);
		expect(bytes).toBe(Buffer.byteLength(raw, 'utf-8'));
		expect(JSON.parse(raw)).toMatchObject({ ...payload, version: 1 });
		await expect(fsStore.read(unsafeRef)).resolves.toMatchObject({ ...payload, version: 1 });

		await fsStore.delete(unsafeRef);

		await expect(fsStore.read(unsafeRef)).resolves.toBeNull();
		await expect(fs.stat(executionDir)).rejects.toMatchObject({ code: 'ENOENT' });
	});
});
