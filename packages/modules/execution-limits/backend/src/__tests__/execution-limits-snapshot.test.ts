import { DEFAULT_EXECUTION_LIMIT_SETTINGS, type ExecutionLimitSettings } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { Publisher } from '@n8n/backend-services';
import { PubSubMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { ExecutionLimitPolicyRepository } from '../execution-limit-policy.repository';
import type { ExecutionLimitSettingsStore } from '../execution-limit-settings.store';
import { ExecutionLimitsSnapshot, REFRESH_INTERVAL_MS } from '../execution-limits-snapshot';

const SETTINGS: ExecutionLimitSettings = {
	periodUnit: 'week',
	instanceMaxExecutions: 1000,
};

const LIMITED = { periodUnit: 'week', instanceMaxExecutions: 1000, projectMaxExecutions: 50 };
const PROJECT_LIMITS = [{ projectId: 'limited', maxExecutions: 50 }];

describe('ExecutionLimitsSnapshot', () => {
	const settingsStore = mock<ExecutionLimitSettingsStore>();
	const policyRepository = mock<ExecutionLimitPolicyRepository>();
	const publisher = mock<Publisher>();
	let snapshot: ExecutionLimitsSnapshot;

	beforeEach(() => {
		vi.resetAllMocks();
		settingsStore.read.mockResolvedValue(SETTINGS);
		policyRepository.findProjectLimits.mockResolvedValue(PROJECT_LIMITS);
		publisher.publishCommand.mockResolvedValue();
		snapshot = new ExecutionLimitsSnapshot(
			settingsStore,
			policyRepository,
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

	it('gives only the instance limit to a run with no project', async () => {
		await snapshot.reload();

		expect(snapshot.read(null)).toEqual({ ...LIMITED, projectMaxExecutions: null });
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

		policyRepository.findProjectLimits.mockResolvedValue([]);
		await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
		expect(snapshot.read('limited')).toEqual({ ...LIMITED, projectMaxExecutions: null });

		snapshot.stop();
		policyRepository.findProjectLimits.mockResolvedValue(PROJECT_LIMITS);
		await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
		expect(snapshot.read('limited')).toEqual({ ...LIMITED, projectMaxExecutions: null });
	});

	it('keeps the loaded limits when a settings read fails', async () => {
		await snapshot.reload();
		settingsStore.read.mockRejectedValueOnce(new Error('database is down'));

		await snapshot.reload();

		expect(snapshot.read('limited')).toEqual(LIMITED);
	});

	it('keeps the loaded limits when a policy read fails', async () => {
		await snapshot.reload();
		policyRepository.findProjectLimits.mockRejectedValueOnce(new Error('database is down'));

		await snapshot.reload();

		expect(snapshot.read('limited')).toEqual(LIMITED);
	});

	it('loads the changed limits on a reload request', async () => {
		await snapshot.reload();
		settingsStore.read.mockResolvedValue(DEFAULT_EXECUTION_LIMIT_SETTINGS);
		policyRepository.findProjectLimits.mockResolvedValue([]);

		await snapshot.reload();

		expect(snapshot.read('limited')).toEqual({
			periodUnit: 'month',
			instanceMaxExecutions: null,
			projectMaxExecutions: null,
		});
	});

	describe('readLimitedScopes', () => {
		it('is null before a load', () => {
			expect(snapshot.readLimitedScopes()).toBeNull();
		});

		it('reflects the period unit and which scopes have a limit', async () => {
			await snapshot.reload();

			expect(snapshot.readLimitedScopes()).toEqual({
				periodUnit: 'week',
				hasInstanceLimit: true,
				limitedProjectIds: new Set(['limited']),
			});

			settingsStore.read.mockResolvedValue(DEFAULT_EXECUTION_LIMIT_SETTINGS);
			policyRepository.findProjectLimits.mockResolvedValue([]);
			await snapshot.reload();

			expect(snapshot.readLimitedScopes()).toEqual({
				periodUnit: 'month',
				hasInstanceLimit: false,
				limitedProjectIds: new Set(),
			});
		});

		it('gives a new object at each successful load only', async () => {
			await snapshot.reload();
			const first = snapshot.readLimitedScopes();
			expect(snapshot.readLimitedScopes()).toBe(first);

			settingsStore.read.mockRejectedValueOnce(new Error('database is down'));
			await snapshot.reload();
			expect(snapshot.readLimitedScopes()).toBe(first);

			await snapshot.reload();
			expect(snapshot.readLimitedScopes()).not.toBe(first);
			expect(snapshot.readLimitedScopes()).toEqual(first);
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
