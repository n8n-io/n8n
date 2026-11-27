import { DEFAULT_EXECUTION_LIMIT_SETTINGS, type ExecutionLimitSettings } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
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

const POLICY = { id: 'policy-1', name: 'Free tier' };
const LIMITED = {
	periodUnit: 'week',
	instanceMaxExecutions: 1000,
	projectMaxExecutions: 50,
	projectPolicy: POLICY,
};
const UNLIMITED = { ...LIMITED, projectMaxExecutions: null, projectPolicy: null };
const row = (projectId: string, policyId: string, maxExecutions: number) => ({
	projectId,
	policyId,
	name: `name-${policyId}`,
	maxExecutions,
});
const PROJECT_POLICIES = [{ ...row('limited', 'policy-1', 50), name: 'Free tier' }];

describe('ExecutionLimitsSnapshot', () => {
	const settingsStore = mock<ExecutionLimitSettingsStore>();
	const policyRepository = mock<ExecutionLimitPolicyRepository>();
	const publisher = mock<Publisher>();
	let snapshot: ExecutionLimitsSnapshot;

	beforeEach(() => {
		vi.resetAllMocks();
		settingsStore.read.mockResolvedValue(SETTINGS);
		policyRepository.findProjectPolicies.mockResolvedValue(PROJECT_POLICIES);
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
		expect(snapshot.read('other')).toEqual(UNLIMITED);
	});

	it('gives only the instance limit to a run with no project', async () => {
		await snapshot.reload();

		expect(snapshot.read(null)).toEqual(UNLIMITED);
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

		policyRepository.findProjectPolicies.mockResolvedValue([]);
		await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
		expect(snapshot.read('limited')).toEqual(UNLIMITED);

		snapshot.stop();
		policyRepository.findProjectPolicies.mockResolvedValue(PROJECT_POLICIES);
		await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
		expect(snapshot.read('limited')).toEqual(UNLIMITED);
	});

	it.each([
		['settings', () => settingsStore.read],
		['policy', () => policyRepository.findProjectPolicies],
	])('keeps the loaded limits when a %s read fails', async (_, read) => {
		await snapshot.reload();
		read().mockRejectedValueOnce(new Error('database is down'));

		await snapshot.reload();

		expect(snapshot.read('limited')).toEqual(LIMITED);
	});

	it('loads the changed limits on a reload request', async () => {
		await snapshot.reload();
		settingsStore.read.mockResolvedValue(DEFAULT_EXECUTION_LIMIT_SETTINGS);
		policyRepository.findProjectPolicies.mockResolvedValue([]);

		await snapshot.reload();

		expect(snapshot.read('limited')).toEqual({
			periodUnit: 'month',
			instanceMaxExecutions: null,
			projectMaxExecutions: null,
			projectPolicy: null,
		});
	});

	it('reads the policy of a project with its id and name', async () => {
		await snapshot.reload();

		expect(snapshot.read('limited')?.projectPolicy).toEqual(POLICY);
		expect(snapshot.read('other')?.projectPolicy).toBeNull();
		expect(snapshot.read(null)?.projectPolicy).toBeNull();
	});

	it('applies the first row of a project that has several policies', async () => {
		policyRepository.findProjectPolicies.mockResolvedValue([
			row('limited', 'low', 5),
			row('limited', 'high', 500),
		]);

		await snapshot.reload();

		expect(snapshot.read('limited')).toMatchObject({
			projectMaxExecutions: 5,
			projectPolicy: { id: 'low', name: 'name-low' },
		});
	});

	describe('warning for projects with several policies', () => {
		let logger: ReturnType<typeof mock<Logger>>;
		const several = [row('a', 'low', 5), row('a', 'high', 500)];

		beforeEach(() => {
			logger = mock<Logger>();
			logger.scoped.mockReturnValue(logger);
			snapshot = new ExecutionLimitsSnapshot(settingsStore, policyRepository, publisher, logger);
		});

		it('logs one time for a list that does not change', async () => {
			policyRepository.findProjectPolicies.mockResolvedValue(several);

			await snapshot.reload();
			await snapshot.reload();
			await snapshot.reload();

			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ projectCount: 1, projectIds: ['a'] }),
			);
		});

		it('logs again when the list changes', async () => {
			policyRepository.findProjectPolicies.mockResolvedValue(several);
			await snapshot.reload();

			policyRepository.findProjectPolicies.mockResolvedValue([
				...several,
				row('b', 'low', 5),
				row('b', 'high', 500),
			]);
			await snapshot.reload();

			expect(logger.warn).toHaveBeenCalledTimes(2);
			expect(logger.warn).toHaveBeenLastCalledWith(
				expect.any(String),
				expect.objectContaining({ projectCount: 2, projectIds: ['a', 'b'] }),
			);
		});

		it('does not log for a list with no project that has several policies', async () => {
			policyRepository.findProjectPolicies.mockResolvedValue([row('a', 'low', 5)]);

			await snapshot.reload();

			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('does not log when the list goes back to empty', async () => {
			policyRepository.findProjectPolicies.mockResolvedValue(several);
			await snapshot.reload();
			policyRepository.findProjectPolicies.mockResolvedValue([]);
			await snapshot.reload();

			expect(logger.warn).toHaveBeenCalledTimes(1);
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
			policyRepository.findProjectPolicies.mockResolvedValue([]);
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
