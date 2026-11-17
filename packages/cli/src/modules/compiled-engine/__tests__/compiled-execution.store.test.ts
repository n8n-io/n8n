/**
 * The cursor of the `wfrt` event outbox: the last fully handled seq of each
 * shard, stored as one setting so a restart resumes where n8n stopped.
 */
import type { ExecutionMetadataRepository, ExecutionRepository, SettingsRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ExecutionCrashService } from '@/executions/execution-crash.service';
import type { ExecutionMetadataService } from '@/services/execution-metadata.service';

import {
	CompiledExecutionStore,
	EVENT_CURSOR_KEY,
	HOST_NODES_KEY,
} from '../compiled-execution.store';

function setup() {
	const settingsRepository = mock<SettingsRepository>();
	const store = new CompiledExecutionStore(
		mock<ExecutionRepository>(),
		mock<ExecutionMetadataRepository>(),
		mock<ExecutionMetadataService>(),
		mock<ExecutionCrashService>(),
		settingsRepository,
	);
	return { store, settingsRepository };
}

describe('CompiledExecutionStore event cursor', () => {
	it('starts at no shard when n8n stored nothing', async () => {
		const { store, settingsRepository } = setup();
		settingsRepository.findByKey.mockResolvedValue(null);
		expect(await store.readEventCursor()).toEqual({});
	});

	it('reads the last handled seq of each shard', async () => {
		const { store, settingsRepository } = setup();
		settingsRepository.findByKey.mockResolvedValue({
			key: EVENT_CURSOR_KEY,
			value: '{"0":12,"3":1}',
		} as never);
		expect(await store.readEventCursor()).toEqual({ '0': 12, '3': 1 });
		expect(settingsRepository.findByKey).toHaveBeenCalledWith(EVENT_CURSOR_KEY);
	});

	it('ignores a stored value that is not a seq per shard', async () => {
		const { store, settingsRepository } = setup();
		for (const value of ['not json', '[]', '{"0":"12"}', '{"0":-1}']) {
			settingsRepository.findByKey.mockResolvedValue({ key: EVENT_CURSOR_KEY, value } as never);
			expect(await store.readEventCursor()).toEqual({});
		}
	});

	it('stores the cursor as JSON under its own key', async () => {
		const { store, settingsRepository } = setup();
		await store.saveEventCursor({ '0': 12, '3': 1 });
		expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
			EVENT_CURSOR_KEY,
			'{"0":12,"3":1}',
			false,
			{},
		);
	});
});

describe('CompiledExecutionStore nodes that run in the fallback host', () => {
	it('has no node when n8n stored nothing', async () => {
		const { store, settingsRepository } = setup();
		settingsRepository.findByKey.mockResolvedValue(null);
		expect(await store.readHostNodes()).toEqual({});
		expect(settingsRepository.findByKey).toHaveBeenCalledWith(HOST_NODES_KEY);
	});

	it('reads the node names of each workflow', async () => {
		const { store, settingsRepository } = setup();
		settingsRepository.findByKey.mockResolvedValue({
			key: HOST_NODES_KEY,
			value: '{"wf1":["Download","Export"],"wf2":["Get file"]}',
		} as never);
		expect(await store.readHostNodes()).toEqual({ wf1: ['Download', 'Export'], wf2: ['Get file'] });
	});

	it('ignores a stored value of another form', async () => {
		const { store, settingsRepository } = setup();
		for (const value of ['not json', '[]', 'null', '{"wf1":"Download"}']) {
			settingsRepository.findByKey.mockResolvedValue({ key: HOST_NODES_KEY, value } as never);
			expect(await store.readHostNodes()).toEqual({});
		}
		settingsRepository.findByKey.mockResolvedValue({
			key: HOST_NODES_KEY,
			value: '{"wf1":["Download",7,null]}',
		} as never);
		expect(await store.readHostNodes()).toEqual({ wf1: ['Download'] });
	});

	it('stores the nodes as JSON under their own key', async () => {
		const { store, settingsRepository } = setup();
		await store.saveHostNodes({ wf1: ['Download'] });
		expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
			HOST_NODES_KEY,
			'{"wf1":["Download"]}',
			false,
			{},
		);
	});
});
