import type { InstanceRegistration } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type {
	ClusterCheckContext,
	ClusterCheckMetadata,
	ClusterCheckResult,
	IClusterCheck,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import type { Push } from '@/push';

import { CheckService, computeDiff } from '../checks/check.service';
import type { InstanceRegistryService } from '../instance-registry.service';
import { REGISTRY_CONSTANTS } from '../instance-registry.types';

const makeLogger = () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	return logger;
};

const makeInstance = (override: Partial<InstanceRegistration> = {}): InstanceRegistration => ({
	schemaVersion: 1 as const,
	instanceKey: 'key',
	hostId: 'host',
	instanceType: 'main',
	instanceRole: 'follower',
	version: '1.0.0',
	registeredAt: 0,
	lastSeen: 0,
	...override,
});

const namedClass = (name: string) => {
	class Anon {}
	Object.defineProperty(Anon, 'name', { value: name });
	return Anon as unknown as new () => IClusterCheck;
};

describe('CheckService', () => {
	let logger: ReturnType<typeof makeLogger>;
	let instanceSettings: InstanceSettings;
	let registryService: jest.Mocked<InstanceRegistryService>;
	let clusterCheckMetadata: jest.Mocked<ClusterCheckMetadata>;
	let messageEventBus: jest.Mocked<MessageEventBus>;
	let push: jest.Mocked<Push>;
	let containerGet: jest.SpyInstance;
	let service: CheckService | undefined;

	const buildService = () =>
		new CheckService(
			logger,
			instanceSettings,
			registryService,
			clusterCheckMetadata,
			messageEventBus,
			push,
		);

	beforeEach(() => {
		jest.useFakeTimers();
		logger = makeLogger();
		instanceSettings = mock<InstanceSettings>({ isLeader: false });
		registryService = mock<InstanceRegistryService>();
		clusterCheckMetadata = mock<ClusterCheckMetadata>();
		messageEventBus = mock<MessageEventBus>();
		push = mock<Push>();

		clusterCheckMetadata.getClasses.mockReturnValue([]);
		registryService.getAllInstances.mockResolvedValue([]);
		registryService.getLastKnownState.mockResolvedValue(new Map());
		registryService.saveLastKnownState.mockResolvedValue();
		messageEventBus.sendAuditEvent.mockResolvedValue(undefined);

		containerGet = jest.spyOn(Container, 'get');
	});

	afterEach(() => {
		service?.shutdown();
		service = undefined;
		containerGet.mockRestore();
		jest.useRealTimers();
	});

	it('discovers checks via metadata and DI, skipping failures', () => {
		const WorkingCheck = namedClass('WorkingCheck');
		const FailingCheck = namedClass('FailingCheck');
		const workingInstance: IClusterCheck = {
			checkDescription: { name: 'cluster.working' },
			async run() {
				return {};
			},
		};

		clusterCheckMetadata.getClasses.mockReturnValue([FailingCheck, WorkingCheck]);
		containerGet.mockImplementation((cls: unknown) => {
			if (cls === WorkingCheck) return workingInstance;
			throw new Error('not registered');
		});

		service = buildService();
		service.init();

		expect(logger.error).toHaveBeenCalledWith(
			'Failed to instantiate cluster check "FailingCheck"',
			expect.objectContaining({ error: expect.any(Error) }),
		);
		expect(logger.info).toHaveBeenCalledWith('Discovered 1 cluster checks', {
			names: ['cluster.working'],
		});
	});

	it('runs reconcile immediately on takeover, again every 180s, and stops on stepdown', async () => {
		const TickCheck = namedClass('TickCheck');
		const runMock = jest
			.fn<Promise<ClusterCheckResult>, [ClusterCheckContext]>()
			.mockResolvedValue({});
		const tickInstance: IClusterCheck = {
			checkDescription: { name: 'cluster.tick' },
			run: runMock,
		};
		clusterCheckMetadata.getClasses.mockReturnValue([TickCheck]);
		containerGet.mockReturnValue(tickInstance);

		service = buildService();
		service.init();
		expect(runMock).not.toHaveBeenCalled();

		service.startReconciliation();
		await jest.advanceTimersByTimeAsync(0);
		expect(runMock).toHaveBeenCalledTimes(1);

		await jest.advanceTimersByTimeAsync(REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS);
		expect(runMock).toHaveBeenCalledTimes(2);

		service.stopReconciliation();
		await jest.advanceTimersByTimeAsync(REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS * 2);
		expect(runMock).toHaveBeenCalledTimes(2);
	});

	it('does not reconcile when not leader, nor after shutdown', async () => {
		const NoOp = namedClass('NoOp');
		const runMock = jest
			.fn<Promise<ClusterCheckResult>, [ClusterCheckContext]>()
			.mockResolvedValue({});
		clusterCheckMetadata.getClasses.mockReturnValue([NoOp]);
		containerGet.mockReturnValue({
			checkDescription: { name: 'cluster.noop' },
			run: runMock,
		});

		Object.assign(instanceSettings, { isLeader: false });
		service = buildService();
		service.init();
		await jest.advanceTimersByTimeAsync(REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS * 2);
		expect(runMock).not.toHaveBeenCalled();

		service.shutdown();
		service.startReconciliation();
		await jest.advanceTimersByTimeAsync(REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS * 2);
		expect(runMock).not.toHaveBeenCalled();
	});

	it('reconcile forwards warnings/audit/push from runChecks and saves current state', async () => {
		const WorkingCheck = namedClass('WorkingCheck');
		const workingRun = jest
			.fn<Promise<ClusterCheckResult>, [ClusterCheckContext]>()
			.mockResolvedValue({
				warnings: [{ code: 'cluster.w', message: 'warn msg', severity: 'warning' }],
				auditEvents: [{ eventName: 'n8n.audit.cluster.foo', payload: { a: 1 } }],
				pushNotifications: [{ type: 'cluster-foo', data: { b: 2 } }],
			});
		clusterCheckMetadata.getClasses.mockReturnValue([WorkingCheck]);
		containerGet.mockReturnValue({
			checkDescription: { name: 'cluster.work' },
			run: workingRun,
		});

		const inst = makeInstance({ instanceKey: 'k1' });
		registryService.getAllInstances.mockResolvedValue([inst]);

		service = buildService();
		service.init();
		service.startReconciliation();
		await jest.advanceTimersByTimeAsync(0);

		expect(logger.warn).toHaveBeenCalledWith(
			'Cluster check warning',
			expect.objectContaining({ check: 'cluster.work', code: 'cluster.w' }),
		);
		expect(messageEventBus.sendAuditEvent).toHaveBeenCalledWith({
			eventName: 'n8n.audit.cluster.foo',
			payload: { a: 1 },
		});
		expect(push.broadcast).toHaveBeenCalledWith({ type: 'cluster-foo', data: { b: 2 } });
		expect(registryService.saveLastKnownState).toHaveBeenCalledWith(new Map([['k1', inst]]));
	});

	describe('runChecks', () => {
		it('returns results for succeeded checks, failed markers for thrown checks, and no side effects', async () => {
			const WorkingCheck = namedClass('WorkingCheck');
			const FailingCheck = namedClass('FailingCheck');
			const workingInstance: IClusterCheck = {
				checkDescription: { name: 'cluster.work', displayName: 'Work Check' },
				run: jest.fn<Promise<ClusterCheckResult>, [ClusterCheckContext]>().mockResolvedValue({
					warnings: [{ code: 'cluster.w', message: 'warn msg', severity: 'warning' }],
					auditEvents: [{ eventName: 'n8n.audit.cluster.foo', payload: { a: 1 } }],
					pushNotifications: [{ type: 'cluster-foo', data: { b: 2 } }],
				}),
			};
			const failingInstance: IClusterCheck = {
				checkDescription: { name: 'cluster.fail', displayName: 'Fail Check' },
				run: jest.fn().mockRejectedValue(new Error('boom')),
			};

			clusterCheckMetadata.getClasses.mockReturnValue([WorkingCheck, FailingCheck]);
			containerGet.mockImplementation((cls: unknown) => {
				if (cls === WorkingCheck) return workingInstance;
				if (cls === FailingCheck) return failingInstance;
				throw new Error('unexpected class');
			});

			const inst = makeInstance({ instanceKey: 'k1' });
			registryService.getAllInstances.mockResolvedValue([inst]);

			service = buildService();
			service.init();

			const { currentState, results } = await service.runChecks();

			expect(currentState).toEqual(new Map([['k1', inst]]));
			expect(results).toEqual([
				{
					checkName: 'cluster.work',
					checkDisplayName: 'Work Check',
					result: {
						warnings: [{ code: 'cluster.w', message: 'warn msg', severity: 'warning' }],
						auditEvents: [{ eventName: 'n8n.audit.cluster.foo', payload: { a: 1 } }],
						pushNotifications: [{ type: 'cluster-foo', data: { b: 2 } }],
					},
				},
				{
					checkName: 'cluster.fail',
					checkDisplayName: 'Fail Check',
					failed: true,
				},
			]);

			expect(logger.error).toHaveBeenCalledWith(
				'Cluster check failed',
				expect.objectContaining({ checkName: 'cluster.fail', error: expect.any(Error) }),
			);
			expect(messageEventBus.sendAuditEvent).not.toHaveBeenCalled();
			expect(push.broadcast).not.toHaveBeenCalled();
			expect(registryService.saveLastKnownState).not.toHaveBeenCalled();
		});

		it('passes diff context to checks; short-circuits without I/O when no checks are registered', async () => {
			const DiffCheck = namedClass('DiffCheck');
			const runMock = jest
				.fn<Promise<ClusterCheckResult>, [ClusterCheckContext]>()
				.mockResolvedValue({});
			clusterCheckMetadata.getClasses.mockReturnValue([DiffCheck]);
			containerGet.mockReturnValue({
				checkDescription: { name: 'cluster.diff' },
				run: runMock,
			});

			const prev = makeInstance({ instanceKey: 'old' });
			const curr = makeInstance({ instanceKey: 'new' });
			registryService.getLastKnownState.mockResolvedValue(new Map([['old', prev]]));
			registryService.getAllInstances.mockResolvedValue([curr]);

			service = buildService();
			service.init();
			await service.runChecks();

			const context = runMock.mock.calls[0][0];
			expect(context.currentState).toEqual(new Map([['new', curr]]));
			expect(context.previousState).toEqual(new Map([['old', prev]]));
			expect(context.diff.added.map((x) => x.instanceKey)).toEqual(['new']);
			expect(context.diff.removed.map((x) => x.instanceKey)).toEqual(['old']);

			service.shutdown();
			service = undefined;
			registryService.getAllInstances.mockClear();
			registryService.getLastKnownState.mockClear();
			clusterCheckMetadata.getClasses.mockReturnValue([]);

			service = buildService();
			service.init();
			const empty = await service.runChecks();

			expect(empty).toEqual({ currentState: new Map(), results: [] });
			expect(registryService.getAllInstances).not.toHaveBeenCalled();
			expect(registryService.getLastKnownState).not.toHaveBeenCalled();
		});
	});
});

describe('computeDiff', () => {
	const i = (key: string, extra: Partial<InstanceRegistration> = {}): InstanceRegistration =>
		makeInstance({ instanceKey: key, ...extra });

	it.each([
		{
			name: 'reports added when a key appears only in current',
			previous: new Map<string, InstanceRegistration>(),
			current: new Map([['a', i('a')]]),
			expected: { added: ['a'], removed: [], changed: [] },
		},
		{
			name: 'reports removed when a key is missing from current',
			previous: new Map([['a', i('a')]]),
			current: new Map<string, InstanceRegistration>(),
			expected: { added: [], removed: ['a'], changed: [] },
		},
		{
			name: 'reports changed on meaningful diff; lastSeen-only drift is ignored',
			previous: new Map([
				['a', i('a', { version: '1.0.0', lastSeen: 0 })],
				['b', i('b', { lastSeen: 0 })],
			]),
			current: new Map([
				['a', i('a', { version: '1.1.0', lastSeen: 1 })],
				['b', i('b', { lastSeen: 9_999 })],
			]),
			expected: { added: [], removed: [], changed: ['a'] },
		},
	])('$name', ({ previous, current, expected }) => {
		const diff = computeDiff(previous, current);
		expect(diff.added.map((x) => x.instanceKey)).toEqual(expected.added);
		expect(diff.removed.map((x) => x.instanceKey)).toEqual(expected.removed);
		expect(diff.changed.map((x) => x.current.instanceKey)).toEqual(expected.changed);
	});
});
