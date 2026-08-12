import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { MultiMainMetadata } from '@n8n/decorators';
import type { MultiMainEventHandler } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { HypervisorLeaderElection } from '../hypervisor-leader-election';

const HEARTBEAT_INTERVAL_MS = 3000;

// Stateful InstanceSettings whose isLeader tracks markAsLeader/markAsFollower.
function createInstanceSettings() {
	let isLeader = false;
	const settings = mock<InstanceSettings>();
	Object.defineProperty(settings, 'isLeader', { get: () => isLeader, configurable: true });
	Object.defineProperty(settings, 'markAsLeader', {
		value: vi.fn(() => {
			isLeader = true;
		}),
		configurable: true,
		writable: true,
	});
	Object.defineProperty(settings, 'markAsFollower', {
		value: vi.fn(() => {
			isLeader = false;
		}),
		configurable: true,
		writable: true,
	});
	return settings;
}

const sendAssign = (isLeader: boolean) =>
	(process.emit as (event: string, message: unknown) => boolean)('message', {
		type: 'leader:assign',
		isLeader,
	});

describe('HypervisorLeaderElection', () => {
	const logger = mockLogger();
	const metadata = new MultiMainMetadata();
	const globalConfig = mock<GlobalConfig>({
		multiMainSetup: { interval: HEARTBEAT_INTERVAL_MS / 1000, ttl: 10, enabled: true },
	});
	let instanceSettings: InstanceSettings;
	let election: HypervisorLeaderElection;
	let originalSend: typeof process.send;

	beforeEach(() => {
		vi.clearAllMocks();
		originalSend = process.send;
		process.send = vi.fn();
		instanceSettings = createInstanceSettings();
		election = new HypervisorLeaderElection(logger, instanceSettings, metadata, globalConfig);
	});

	afterEach(async () => {
		await election.shutdown();
		process.send = originalSend;
	});

	describe('init', () => {
		it('claims once, then takes over when assigned leader', async () => {
			const emit = vi.spyOn(election, 'emit');

			const initialized = election.init();
			expect(process.send).toHaveBeenCalledWith({ type: 'leader:claim' });

			sendAssign(true);
			await initialized;

			expect(instanceSettings.markAsLeader).toHaveBeenCalledTimes(1);
			expect(emit).toHaveBeenCalledWith('leader-takeover');
		});

		it('becomes follower without emitting when assigned follower', async () => {
			const emit = vi.spyOn(election, 'emit');

			const initialized = election.init();
			sendAssign(false);
			await initialized;

			expect(instanceSettings.markAsFollower).toHaveBeenCalledTimes(1);
			expect(emit).not.toHaveBeenCalled();
		});
	});

	describe('runtime reassignment', () => {
		it('steps down when the leader is reassigned to follower', async () => {
			const initialized = election.init();
			sendAssign(true);
			await initialized;

			const emit = vi.spyOn(election, 'emit');
			sendAssign(false);

			expect(instanceSettings.markAsFollower).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-stepdown');
		});

		it('is promoted near-instantly when a follower is assigned leader', async () => {
			const initialized = election.init();
			sendAssign(false);
			await initialized;

			const emit = vi.spyOn(election, 'emit');
			sendAssign(true);

			expect(instanceSettings.markAsLeader).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-takeover');
		});
	});

	describe('heartbeat', () => {
		it('sends periodic heartbeats to the primary', async () => {
			vi.useFakeTimers();
			try {
				const initialized = election.init();
				sendAssign(false);
				await initialized;
				(process.send as ReturnType<typeof vi.fn>).mockClear();

				vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);

				expect(process.send).toHaveBeenCalledWith({ type: 'leader:heartbeat' });
			} finally {
				vi.useRealTimers();
			}
		});

		it('stops heartbeating on shutdown', async () => {
			vi.useFakeTimers();
			try {
				const initialized = election.init();
				sendAssign(false);
				await initialized;
				election.shutdown();
				(process.send as ReturnType<typeof vi.fn>).mockClear();

				vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);

				expect(process.send).not.toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('registerEventHandlers', () => {
		@Service()
		class TakeoverHandler {
			takeover = vi.fn();
		}

		it('fires decorated handlers on takeover', () => {
			const handler = Container.get(TakeoverHandler);
			metadata.register({
				eventHandlerClass: TakeoverHandler as unknown as MultiMainEventHandler['eventHandlerClass'],
				methodName: 'takeover',
				eventName: 'leader-takeover',
			});

			election.registerEventHandlers();
			election.emit('leader-takeover');

			expect(handler.takeover).toHaveBeenCalledTimes(1);
		});
	});
});
