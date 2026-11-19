import { DEFAULT_EXECUTION_LIMIT_SETTINGS, type ExecutionLimitSettings } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { Publisher } from '@n8n/backend-services';
import { PubSubMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { ExecutionLimitSettingsStore } from '../execution-limit-settings.store';
import { ExecutionLimitsSnapshot, REFRESH_INTERVAL_MS } from '../execution-limits-snapshot';
import type { ProjectExecutionLimitRepository } from '../project-execution-limit.repository';

const SETTINGS: ExecutionLimitSettings = {
	periodUnit: 'week',
	instanceMaxExecutions: 1000,
	defaultProjectMaxExecutions: null,
};

const LIMITED = { periodUnit: 'week', instanceMaxExecutions: 1000, projectMaxExecutions: 50 };

describe('ExecutionLimitsSnapshot', () => {
	const settingsStore = mock<ExecutionLimitSettingsStore>();
	const projectLimitRepository = mock<ProjectExecutionLimitRepository>();
	const publisher = mock<Publisher>();
	let snapshot: ExecutionLimitsSnapshot;

	beforeEach(() => {
		vi.resetAllMocks();
		settingsStore.read.mockResolvedValue(SETTINGS);
		projectLimitRepository.findAll.mockResolvedValue([{ projectId: 'limited', maxExecutions: 50 }]);
		publisher.publishCommand.mockResolvedValue();
		snapshot = new ExecutionLimitsSnapshot(
			settingsStore,
			projectLimitRepository,
			publisher,
			mockLogger(),
		);
	});

	afterEach(() => {
		snapshot.stop();
		vi.useRealTimers();
	});

	it('reads the limits of a project after a load', async () => {
		await snapshot.reload();

		expect(snapshot.read('limited')).toEqual(LIMITED);
		expect(snapshot.read('other')).toEqual({ ...LIMITED, projectMaxExecutions: null });
	});

	it('has nothing to read until a load succeeds', async () => {
		settingsStore.read.mockRejectedValueOnce(new Error('database is down'));

		await snapshot.reload();
		expect(snapshot.read('limited')).toBeNull();

		await snapshot.reload();
		expect(snapshot.read('limited')).toEqual(LIMITED);
	});

	it('reloads on every refresh interval after the start, until the stop', async () => {
		vi.useFakeTimers();
		await snapshot.start();
		expect(snapshot.read('limited')).toEqual(LIMITED);

		projectLimitRepository.findAll.mockResolvedValue([]);
		await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
		expect(snapshot.read('limited')).toEqual({ ...LIMITED, projectMaxExecutions: null });

		snapshot.stop();
		projectLimitRepository.findAll.mockResolvedValue([{ projectId: 'limited', maxExecutions: 50 }]);
		await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
		expect(snapshot.read('limited')).toEqual({ ...LIMITED, projectMaxExecutions: null });
	});

	it('keeps the loaded limits when a reload fails', async () => {
		await snapshot.reload();
		projectLimitRepository.findAll.mockRejectedValueOnce(new Error('database is down'));

		await snapshot.reload();

		expect(snapshot.read('limited')).toEqual(LIMITED);
	});

	it('loads the changed limits on a reload request', async () => {
		await snapshot.reload();
		settingsStore.read.mockResolvedValue(DEFAULT_EXECUTION_LIMIT_SETTINGS);
		projectLimitRepository.findAll.mockResolvedValue([]);

		await snapshot.reload();

		expect(snapshot.read('limited')).toEqual({
			periodUnit: 'month',
			instanceMaxExecutions: null,
			projectMaxExecutions: null,
		});
	});

	describe('refreshAfterWrite', () => {
		it('reloads this process and tells the other processes to reload', async () => {
			await snapshot.refreshAfterWrite();

			expect(snapshot.read('limited')).toEqual(LIMITED);
			expect(publisher.publishCommand).toHaveBeenCalledExactlyOnceWith({
				command: 'reload-execution-limits',
			});
		});

		it('resolves when the publish fails, because the write already committed', async () => {
			publisher.publishCommand.mockRejectedValue(new Error('redis is down'));

			await expect(snapshot.refreshAfterWrite()).resolves.toBeUndefined();
		});
	});

	it.each(['reload-execution-limits', 'pubsub-reconnected'])('reloads on %s', (eventName) => {
		const handlers = Container.get(PubSubMetadata)
			.getHandlers()
			.filter(
				(handler) =>
					handler.eventName === eventName &&
					handler.eventHandlerClass.name === 'ExecutionLimitsSnapshot',
			);

		expect(handlers.map(({ methodName, filter }) => ({ methodName, filter }))).toEqual([
			{ methodName: 'reload', filter: undefined },
		]);
	});
});
