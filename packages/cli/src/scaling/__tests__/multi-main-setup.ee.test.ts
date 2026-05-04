import type { RedisLeaderElectionStorage } from '@/scaling/redis-leader-election-storage';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { MultiMainMetadata } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';
import { createResultOk, createResultError } from 'n8n-workflow';

import { MultiMainSetup } from '../multi-main-setup.ee';

describe('MultiMainSetup', () => {
	const hostId = 'main-n8n-main-0';

	const logger = mockLogger();
	const storage = mock<RedisLeaderElectionStorage>();
	const errorReporter = mock<ErrorReporter>();
	const metadata = new MultiMainMetadata();

	const globalConfig = mock<GlobalConfig>({
		redis: { prefix: 'n8n' },
		multiMainSetup: { ttl: 10, interval: 3, enabled: true },
	});

	let instanceSettings: InstanceSettings;
	let multiMainSetup: MultiMainSetup;

	beforeEach(() => {
		jest.clearAllMocks();
		let isLeader = false;
		instanceSettings = mock<InstanceSettings>({ hostId });
		Object.defineProperty(instanceSettings, 'isLeader', {
			get: () => isLeader,
			configurable: true,
		});
		instanceSettings.markAsLeader = jest.fn(() => {
			isLeader = true;
		});
		instanceSettings.markAsFollower = jest.fn(() => {
			isLeader = false;
		});
		multiMainSetup = new MultiMainSetup(
			logger,
			instanceSettings,
			globalConfig,
			metadata,
			errorReporter,
			storage,
		);
	});

	describe('init', () => {
		it('should become leader if setLeaderIfNotExists succeeds', async () => {
			storage.setLeaderIfNotExists.mockResolvedValue(createResultOk(true));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup.init();

			expect(storage.setLeaderIfNotExists).toHaveBeenCalledWith(hostId);
			expect(instanceSettings.markAsLeader).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-takeover');
		});

		it('should remain follower if setLeaderIfNotExists returns false', async () => {
			storage.setLeaderIfNotExists.mockResolvedValue(createResultOk(false));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			await multiMainSetup.init();

			expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-takeover');
		});

		it('should remain follower if setLeaderIfNotExists fails', async () => {
			storage.setLeaderIfNotExists.mockResolvedValue(
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
			storage.setLeaderIfNotExists.mockResolvedValue(createResultOk(true));
			await multiMainSetup.init();
			jest.clearAllMocks();
		});

		it('should stay leader when TTL renewal succeeds', async () => {
			storage.tryRenewLeaderTtl.mockResolvedValue(createResultOk({ id: 'success' }));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(storage.tryRenewLeaderTtl).toHaveBeenCalledWith(hostId);
			expect(instanceSettings.markAsFollower).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-stepdown');
		});

		it('should step down when another host is leader', async () => {
			storage.tryRenewLeaderTtl.mockResolvedValue(
				createResultOk({ id: 'other-host-is-leader', currentLeaderId: 'main-n8n-main-1' }),
			);
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(instanceSettings.markAsFollower).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-stepdown');
		});

		it('should try to re-acquire leader key when key is missing', async () => {
			storage.tryRenewLeaderTtl.mockResolvedValue(createResultOk({ id: 'key-missing' }));
			storage.setLeaderIfNotExists.mockResolvedValue(createResultOk(true));

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(storage.setLeaderIfNotExists).toHaveBeenCalledWith(hostId);
			expect(instanceSettings.markAsFollower).not.toHaveBeenCalled();
		});

		it('should step down when key is missing and re-acquire fails', async () => {
			storage.tryRenewLeaderTtl.mockResolvedValue(createResultOk({ id: 'key-missing' }));
			storage.setLeaderIfNotExists.mockResolvedValue(createResultOk(false));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(instanceSettings.markAsFollower).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-stepdown');
		});

		it('should step down when key is missing and Redis command fails', async () => {
			storage.tryRenewLeaderTtl.mockResolvedValue(createResultOk({ id: 'key-missing' }));
			storage.setLeaderIfNotExists.mockResolvedValue(
				createResultError(new Error('Command timed out')),
			);
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(instanceSettings.markAsFollower).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-stepdown');
		});

		it('should stay leader when TTL renewal Redis command fails', async () => {
			storage.tryRenewLeaderTtl.mockResolvedValue(
				createResultError(new Error('Command timed out')),
			);
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(instanceSettings.markAsFollower).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-stepdown');
		});
	});

	describe('checkLeader (follower path)', () => {
		beforeEach(async () => {
			storage.setLeaderIfNotExists.mockResolvedValue(createResultOk(false));
			await multiMainSetup.init();
			jest.clearAllMocks();
		});

		it('should become leader when Redis shows own hostId as leader (mismatch recovery)', async () => {
			storage.getLeader.mockResolvedValue(createResultOk(hostId));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(errorReporter.info).toHaveBeenCalled();
			expect(instanceSettings.markAsLeader).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-takeover');
		});

		it('should stay follower when another instance is leader', async () => {
			storage.getLeader.mockResolvedValue(createResultOk('main-n8n-main-1'));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-takeover');
			expect(emit).not.toHaveBeenCalledWith('leader-stepdown');
		});

		it('should attempt to become leader when leadership is vacant', async () => {
			storage.getLeader.mockResolvedValue(createResultOk(null));
			storage.setLeaderIfNotExists.mockResolvedValue(createResultOk(true));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(storage.setLeaderIfNotExists).toHaveBeenCalledWith(hostId);
			expect(instanceSettings.markAsLeader).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-takeover');
		});

		it('should stay follower when leadership is vacant but setLeaderIfNotExists fails', async () => {
			storage.getLeader.mockResolvedValue(createResultOk(null));
			storage.setLeaderIfNotExists.mockResolvedValue(createResultOk(false));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-takeover');
		});

		it('should stay follower when Redis is unreachable', async () => {
			storage.getLeader.mockResolvedValue(createResultError(new Error('Command timed out')));
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
			expect(instanceSettings.markAsFollower).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-takeover');
			expect(emit).not.toHaveBeenCalledWith('leader-stepdown');
		});

		it('should stay follower when leadership is vacant and Redis command fails', async () => {
			storage.getLeader.mockResolvedValue(createResultOk(null));
			storage.setLeaderIfNotExists.mockResolvedValue(
				createResultError(new Error('Command timed out')),
			);
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-takeover');
		});
	});
});
