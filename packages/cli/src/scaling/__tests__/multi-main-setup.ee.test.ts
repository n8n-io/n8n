import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { MultiMainMetadata } from '@n8n/decorators';
import type { MultiMainEventHandler } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';
import { createResultOk, createResultError } from 'n8n-workflow';

import type { LeaderElectionClient } from '@/scaling/leader-election-client';

import { MultiMainSetup } from '../multi-main-setup.ee';

function createInstanceSettings(hostId: string) {
	let isLeader = false;
	const settings = mock<InstanceSettings>({ hostId });
	Object.defineProperty(settings, 'isLeader', {
		get: () => isLeader,
		configurable: true,
	});
	Object.defineProperty(settings, 'markAsLeader', {
		value: jest.fn(() => {
			isLeader = true;
		}),
		configurable: true,
		writable: true,
	});
	Object.defineProperty(settings, 'markAsFollower', {
		value: jest.fn(() => {
			isLeader = false;
		}),
		configurable: true,
		writable: true,
	});
	return settings;
}

describe('MultiMainSetup', () => {
	const hostId = 'main-n8n-main-0';
	const logger = mockLogger();
	const metadata = new MultiMainMetadata();
	const errorReporter = mock<ErrorReporter>();
	const client = mock<LeaderElectionClient>();

	const globalConfig = mock<GlobalConfig>({
		redis: { prefix: 'n8n' },
		multiMainSetup: { ttl: 10, interval: 3, enabled: true },
	});

	let instanceSettings: InstanceSettings;
	let multiMainSetup: MultiMainSetup;

	beforeEach(() => {
		jest.clearAllMocks();
		instanceSettings = createInstanceSettings(hostId);
		multiMainSetup = new MultiMainSetup(
			logger,
			instanceSettings,
			globalConfig,
			metadata,
			errorReporter,
			client,
		);
	});

	describe('init', () => {
		it('should become leader if setLeaderIfNotExists succeeds', async () => {
			client.setLeaderIfNotExists.mockResolvedValue(createResultOk(true));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup.init();

			expect(client.setLeaderIfNotExists).toHaveBeenCalled();
			expect(instanceSettings.markAsLeader).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-takeover');
		});

		it('should remain follower if setLeaderIfNotExists returns false', async () => {
			client.setLeaderIfNotExists.mockResolvedValue(createResultOk(false));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup.init();

			expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-takeover');
		});

		it('should remain follower if setLeaderIfNotExists fails', async () => {
			client.setLeaderIfNotExists.mockResolvedValue(
				createResultError(new Error('Command timed out')),
			);
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup.init();

			expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-takeover');
		});
	});

	describe('registerEventHandlers', () => {
		@Service()
		class EarlyHandler {
			takeover = jest.fn();
		}

		@Service()
		class LateHandler {
			takeover = jest.fn();
		}

		const handlerFor = (eventHandlerClass: unknown): MultiMainEventHandler => ({
			eventHandlerClass: eventHandlerClass as MultiMainEventHandler['eventHandlerClass'],
			methodName: 'takeover',
			eventName: 'leader-takeover',
		});

		it('wires handlers registered both before and after it runs', () => {
			const early = Container.get(EarlyHandler);
			const late = Container.get(LateHandler);

			// Registered before routing starts — replayed on subscribe.
			metadata.register(handlerFor(EarlyHandler));

			multiMainSetup.registerEventHandlers();

			// Registered after routing started — wired reactively.
			metadata.register(handlerFor(LateHandler));

			multiMainSetup.emit('leader-takeover');

			expect(early.takeover).toHaveBeenCalledTimes(1);
			expect(late.takeover).toHaveBeenCalledTimes(1);
		});
	});

	describe('checkLeader (leader path)', () => {
		beforeEach(async () => {
			client.setLeaderIfNotExists.mockResolvedValue(createResultOk(true));
			await multiMainSetup.init();
			jest.clearAllMocks();
		});

		it('should stay leader when TTL renewal succeeds', async () => {
			client.tryRenewLeaderTtl.mockResolvedValue(createResultOk({ id: 'success' }));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup['checkLeader']();

			expect(client.tryRenewLeaderTtl).toHaveBeenCalled();
			expect(instanceSettings.markAsFollower).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-stepdown');
		});

		it('should step down when another host is leader', async () => {
			client.tryRenewLeaderTtl.mockResolvedValue(
				createResultOk({ id: 'other-host-is-leader', currentLeaderId: 'main-n8n-main-1' }),
			);
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup['checkLeader']();

			expect(instanceSettings.markAsFollower).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-stepdown');
		});

		it('should try to re-acquire leader key when key is missing', async () => {
			client.tryRenewLeaderTtl.mockResolvedValue(createResultOk({ id: 'key-missing' }));
			client.setLeaderIfNotExists.mockResolvedValue(createResultOk(true));

			await multiMainSetup['checkLeader']();

			expect(client.setLeaderIfNotExists).toHaveBeenCalled();
			expect(instanceSettings.markAsFollower).not.toHaveBeenCalled();
		});

		it('should step down when key is missing and re-acquire fails', async () => {
			client.tryRenewLeaderTtl.mockResolvedValue(createResultOk({ id: 'key-missing' }));
			client.setLeaderIfNotExists.mockResolvedValue(createResultOk(false));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup['checkLeader']();

			expect(instanceSettings.markAsFollower).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-stepdown');
		});

		it('should step down when key is missing and Redis command fails', async () => {
			client.tryRenewLeaderTtl.mockResolvedValue(createResultOk({ id: 'key-missing' }));
			client.setLeaderIfNotExists.mockResolvedValue(
				createResultError(new Error('Command timed out')),
			);
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup['checkLeader']();

			expect(instanceSettings.markAsFollower).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-stepdown');
		});

		it('should stay leader when TTL renewal Redis command fails', async () => {
			client.tryRenewLeaderTtl.mockResolvedValue(createResultError(new Error('Command timed out')));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup['checkLeader']();

			expect(instanceSettings.markAsFollower).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-stepdown');
		});
	});

	describe('checkLeader (follower path)', () => {
		beforeEach(async () => {
			client.setLeaderIfNotExists.mockResolvedValue(createResultOk(false));
			await multiMainSetup.init();
			jest.clearAllMocks();
		});

		it('should become leader when Redis shows own hostId as leader (mismatch recovery)', async () => {
			client.getLeader.mockResolvedValue(createResultOk(hostId));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup['checkLeader']();

			expect(errorReporter.info).toHaveBeenCalled();
			expect(instanceSettings.markAsLeader).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-takeover');
		});

		it('should stay follower when another instance is leader', async () => {
			client.getLeader.mockResolvedValue(createResultOk('main-n8n-main-1'));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup['checkLeader']();

			expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-takeover');
			expect(emit).not.toHaveBeenCalledWith('leader-stepdown');
		});

		it('should attempt to become leader when leadership is vacant', async () => {
			client.getLeader.mockResolvedValue(createResultOk(null));
			client.setLeaderIfNotExists.mockResolvedValue(createResultOk(true));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup['checkLeader']();

			expect(client.setLeaderIfNotExists).toHaveBeenCalled();
			expect(instanceSettings.markAsLeader).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-takeover');
		});

		it('should stay follower when leadership is vacant but setLeaderIfNotExists fails', async () => {
			client.getLeader.mockResolvedValue(createResultOk(null));
			client.setLeaderIfNotExists.mockResolvedValue(createResultOk(false));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup['checkLeader']();

			expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-takeover');
		});

		it('should stay follower when Redis is unreachable', async () => {
			client.getLeader.mockResolvedValue(createResultError(new Error('Command timed out')));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup['checkLeader']();

			expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
			expect(instanceSettings.markAsFollower).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-takeover');
			expect(emit).not.toHaveBeenCalledWith('leader-stepdown');
		});

		it('should stay follower when leadership is vacant and Redis command fails', async () => {
			client.getLeader.mockResolvedValue(createResultOk(null));
			client.setLeaderIfNotExists.mockResolvedValue(
				createResultError(new Error('Command timed out')),
			);
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup['checkLeader']();

			expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-takeover');
		});
	});
});
