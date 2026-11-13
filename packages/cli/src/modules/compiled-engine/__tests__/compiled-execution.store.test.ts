/**
 * The cursor of the `wfrt` event outbox: the last fully handled seq of each
 * shard, stored as one setting so a restart resumes where n8n stopped.
 */
import type { ExecutionMetadataRepository, ExecutionRepository, SettingsRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ExecutionCrashService } from '@/executions/execution-crash.service';
import type { ExecutionMetadataService } from '@/services/execution-metadata.service';

import { CompiledExecutionStore, EVENT_CURSOR_KEY } from '../compiled-execution.store';

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
