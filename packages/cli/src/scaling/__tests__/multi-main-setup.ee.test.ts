import type { LeaderElectionClient } from '@/scaling/leader-election-client';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { RedisClientService } from '@/services/redis-client.service';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { MultiMainMetadata } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';
import { createResultOk, createResultError } from 'n8n-workflow';

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
	const metadata = new MultiMainMetadata();

	describe('with legacy implementation (flag off)', () => {
		const logger = mockLogger();
		const publisher = mock<Publisher>();
		const redisClientService = mock<RedisClientService>();
		const errorReporter = mock<ErrorReporter>();

		const globalConfig = mock<GlobalConfig>({
			redis: { prefix: 'n8n' },
			multiMainSetup: { ttl: 10, interval: 3, enabled: true, newLeaderElection: false },
		});

		let instanceSettings: InstanceSettings;
		let multiMainSetup: MultiMainSetup;

		beforeEach(() => {
			jest.clearAllMocks();
			instanceSettings = createInstanceSettings(hostId);
			redisClientService.toValidPrefix.mockReturnValue('n8n');
			multiMainSetup = new MultiMainSetup(
				logger,
				instanceSettings,
				globalConfig,
				metadata,
				errorReporter,
				publisher,
				redisClientService,
			);
		});

		describe('init', () => {
			it('should become leader if setIfNotExists succeeds', async () => {
				publisher.setIfNotExists.mockResolvedValue(true);
				const emit = jest.spyOn(multiMainSetup, 'emit');

				await multiMainSetup.init();

				expect(publisher.setIfNotExists).toHaveBeenCalled();
				expect(instanceSettings.markAsLeader).toHaveBeenCalled();
				expect(emit).toHaveBeenCalledWith('leader-takeover');
			});

			it('should remain follower if setIfNotExists returns false', async () => {
				publisher.setIfNotExists.mockResolvedValue(false);
				const emit = jest.spyOn(multiMainSetup, 'emit');

				await multiMainSetup.init();

				expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
				expect(emit).not.toHaveBeenCalledWith('leader-takeover');
			});
		});

		describe('checkLeader', () => {
			it('should renew TTL when this instance is the leader', async () => {
				publisher.setIfNotExists.mockResolvedValue(true);
				await multiMainSetup.init();
				jest.clearAllMocks();

				publisher.get.mockResolvedValue(hostId);

				await multiMainSetup['strategy'].checkLeader();

				expect(publisher.setExpiration).toHaveBeenCalled();
			});

			it('should emit leader-takeover on mismatch recovery', async () => {
				publisher.setIfNotExists.mockResolvedValue(false);
				await multiMainSetup.init();
				jest.clearAllMocks();

				publisher.get.mockResolvedValue(hostId);
				const emit = jest.spyOn(multiMainSetup, 'emit');

				await multiMainSetup['strategy'].checkLeader();

				expect(instanceSettings.markAsLeader).toHaveBeenCalled();
				expect(emit).toHaveBeenCalledWith('leader-takeover');
			});

			it('should step down when another instance is leader', async () => {
				publisher.setIfNotExists.mockResolvedValue(true);
				await multiMainSetup.init();
				jest.clearAllMocks();

				publisher.get.mockResolvedValue('main-n8n-main-1');
				const emit = jest.spyOn(multiMainSetup, 'emit');

				await multiMainSetup['strategy'].checkLeader();

				expect(instanceSettings.markAsFollower).toHaveBeenCalled();
				expect(emit).toHaveBeenCalledWith('leader-stepdown');
			});

			it('should attempt to become leader when leadership is vacant', async () => {
				publisher.setIfNotExists.mockResolvedValue(true);
				await multiMainSetup.init();
				jest.clearAllMocks();

				publisher.get.mockResolvedValue(null);
				publisher.setIfNotExists.mockResolvedValue(true);
				const emit = jest.spyOn(multiMainSetup, 'emit');

				await multiMainSetup['strategy'].checkLeader();

				expect(emit).toHaveBeenCalledWith('leader-stepdown');
				expect(publisher.setIfNotExists).toHaveBeenCalled();
				expect(emit).toHaveBeenCalledWith('leader-takeover');
			});
		});
	});

	describe('with new implementation (flag on)', () => {
		const logger = mockLogger();
		const publisher = mock<Publisher>();
		const redisClientService = mock<RedisClientService>();
		const errorReporter = mock<ErrorReporter>();
		const client = mock<LeaderElectionClient>();

		const globalConfig = mock<GlobalConfig>({
			redis: { prefix: 'n8n' },
			multiMainSetup: { ttl: 10, interval: 3, enabled: true, newLeaderElection: true },
		});

		let instanceSettings: InstanceSettings;
		let multiMainSetup: MultiMainSetup;

		beforeEach(() => {
			jest.clearAllMocks();
			instanceSettings = createInstanceSettings(hostId);

			jest.mock('@/scaling/leader-election-client', () => ({
				LeaderElectionClient: jest.fn(),
			}));

			const { Container } = jest.requireActual('@n8n/di');
			Container.set(
				jest.requireMock('@/scaling/leader-election-client').LeaderElectionClient,
				client,
			);

			multiMainSetup = new MultiMainSetup(
				logger,
				instanceSettings,
				globalConfig,
				metadata,
				errorReporter,
				publisher,
				redisClientService,
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

		describe('checkLeader (leader path)', () => {
			beforeEach(async () => {
				client.setLeaderIfNotExists.mockResolvedValue(createResultOk(true));
				await multiMainSetup.init();
				jest.clearAllMocks();
			});

			it('should stay leader when TTL renewal succeeds', async () => {
				client.tryRenewLeaderTtl.mockResolvedValue(createResultOk({ id: 'success' }));
				const emit = jest.spyOn(multiMainSetup, 'emit');

				await multiMainSetup['strategy'].checkLeader();

				expect(client.tryRenewLeaderTtl).toHaveBeenCalled();
				expect(instanceSettings.markAsFollower).not.toHaveBeenCalled();
				expect(emit).not.toHaveBeenCalledWith('leader-stepdown');
			});

			it('should step down when another host is leader', async () => {
				client.tryRenewLeaderTtl.mockResolvedValue(
					createResultOk({ id: 'other-host-is-leader', currentLeaderId: 'main-n8n-main-1' }),
				);
				const emit = jest.spyOn(multiMainSetup, 'emit');

				await multiMainSetup['strategy'].checkLeader();

				expect(instanceSettings.markAsFollower).toHaveBeenCalled();
				expect(emit).toHaveBeenCalledWith('leader-stepdown');
			});

			it('should try to re-acquire leader key when key is missing', async () => {
				client.tryRenewLeaderTtl.mockResolvedValue(createResultOk({ id: 'key-missing' }));
				client.setLeaderIfNotExists.mockResolvedValue(createResultOk(true));

				await multiMainSetup['strategy'].checkLeader();

				expect(client.setLeaderIfNotExists).toHaveBeenCalled();
				expect(instanceSettings.markAsFollower).not.toHaveBeenCalled();
			});

			it('should step down when key is missing and re-acquire fails', async () => {
				client.tryRenewLeaderTtl.mockResolvedValue(createResultOk({ id: 'key-missing' }));
				client.setLeaderIfNotExists.mockResolvedValue(createResultOk(false));
				const emit = jest.spyOn(multiMainSetup, 'emit');

				await multiMainSetup['strategy'].checkLeader();

				expect(instanceSettings.markAsFollower).toHaveBeenCalled();
				expect(emit).toHaveBeenCalledWith('leader-stepdown');
			});

			it('should step down when key is missing and Redis command fails', async () => {
				client.tryRenewLeaderTtl.mockResolvedValue(createResultOk({ id: 'key-missing' }));
				client.setLeaderIfNotExists.mockResolvedValue(
					createResultError(new Error('Command timed out')),
				);
				const emit = jest.spyOn(multiMainSetup, 'emit');

				await multiMainSetup['strategy'].checkLeader();

				expect(instanceSettings.markAsFollower).toHaveBeenCalled();
				expect(emit).toHaveBeenCalledWith('leader-stepdown');
			});

			it('should stay leader when TTL renewal Redis command fails', async () => {
				client.tryRenewLeaderTtl.mockResolvedValue(
					createResultError(new Error('Command timed out')),
				);
				const emit = jest.spyOn(multiMainSetup, 'emit');

				await multiMainSetup['strategy'].checkLeader();

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

				await multiMainSetup['strategy'].checkLeader();

				expect(errorReporter.info).toHaveBeenCalled();
				expect(instanceSettings.markAsLeader).toHaveBeenCalled();
				expect(emit).toHaveBeenCalledWith('leader-takeover');
			});

			it('should stay follower when another instance is leader', async () => {
				client.getLeader.mockResolvedValue(createResultOk('main-n8n-main-1'));
				const emit = jest.spyOn(multiMainSetup, 'emit');

				await multiMainSetup['strategy'].checkLeader();

				expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
				expect(emit).not.toHaveBeenCalledWith('leader-takeover');
				expect(emit).not.toHaveBeenCalledWith('leader-stepdown');
			});

			it('should attempt to become leader when leadership is vacant', async () => {
				client.getLeader.mockResolvedValue(createResultOk(null));
				client.setLeaderIfNotExists.mockResolvedValue(createResultOk(true));
				const emit = jest.spyOn(multiMainSetup, 'emit');

				await multiMainSetup['strategy'].checkLeader();

				expect(client.setLeaderIfNotExists).toHaveBeenCalled();
				expect(instanceSettings.markAsLeader).toHaveBeenCalled();
				expect(emit).toHaveBeenCalledWith('leader-takeover');
			});

			it('should stay follower when leadership is vacant but setLeaderIfNotExists fails', async () => {
				client.getLeader.mockResolvedValue(createResultOk(null));
				client.setLeaderIfNotExists.mockResolvedValue(createResultOk(false));
				const emit = jest.spyOn(multiMainSetup, 'emit');

				await multiMainSetup['strategy'].checkLeader();

				expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
				expect(emit).not.toHaveBeenCalledWith('leader-takeover');
			});

			it('should stay follower when Redis is unreachable', async () => {
				client.getLeader.mockResolvedValue(createResultError(new Error('Command timed out')));
				const emit = jest.spyOn(multiMainSetup, 'emit');

				await multiMainSetup['strategy'].checkLeader();

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

				await multiMainSetup['strategy'].checkLeader();

				expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
				expect(emit).not.toHaveBeenCalledWith('leader-takeover');
			});
		});
	});
});
