import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { MultiMainMetadata } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';

import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { RedisClientService } from '@/services/redis-client.service';

import { MultiMainSetup } from '../multi-main-setup.ee';

describe('MultiMainSetup', () => {
	const hostId = 'main-n8n-main-0';

	const logger = mockLogger();
	const publisher = mock<Publisher>();
	const redisClientService = mock<RedisClientService>();
	const errorReporter = mock<ErrorReporter>();
	const metadata = new MultiMainMetadata();

	const globalConfig = mock<GlobalConfig>({
		redis: { prefix: 'n8n' },
		multiMainSetup: { ttl: 10, interval: 3, enabled: true },
	});

	redisClientService.toValidPrefix.mockReturnValue('n8n');

	let instanceSettings: InstanceSettings;
	let multiMainSetup: MultiMainSetup;

	beforeEach(() => {
		instanceSettings = mock<InstanceSettings>({ hostId, isLeader: false });
		multiMainSetup = new MultiMainSetup(
			logger,
			instanceSettings,
			publisher,
			redisClientService,
			globalConfig,
			metadata,
			errorReporter,
		);
		jest.clearAllMocks();
	});

	describe('checkLeader', () => {
		beforeEach(async () => {
			await multiMainSetup.init();
		});

		it('should emit `leader-takeover` when Redis has own `hostId` but instance thinks it is follower', async () => {
			publisher.get.mockResolvedValue(hostId);
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(instanceSettings.markAsLeader).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-takeover');
		});

		it('should not emit `leader-takeover` when already leader', async () => {
			publisher.get.mockResolvedValue(hostId);
			Object.defineProperty(instanceSettings, 'isLeader', { get: () => true });
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(instanceSettings.markAsLeader).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalledWith('leader-takeover');
			expect(publisher.setExpiration).toHaveBeenCalled();
		});

		it('should emit `leader-stepdown` when another instance is leader', async () => {
			publisher.get.mockResolvedValue('main-n8n-main-1');
			Object.defineProperty(instanceSettings, 'isLeader', { get: () => true });
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(instanceSettings.markAsFollower).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-stepdown');
		});

		it('should not emit `leader-stepdown` when already a follower', async () => {
			publisher.get.mockResolvedValue('main-n8n-main-1');
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(emit).not.toHaveBeenCalledWith('leader-stepdown');
		});

		it('should attempt to become leader when leadership is vacant', async () => {
			publisher.get.mockResolvedValue(null);
			publisher.setIfNotExists.mockResolvedValue(true);
			const emit = jest.spyOn(multiMainSetup, 'emit');

			// @ts-expect-error - private method
			await multiMainSetup.checkLeader();

			expect(instanceSettings.markAsFollower).toHaveBeenCalled();
			expect(emit).toHaveBeenCalledWith('leader-stepdown');
			expect(emit).toHaveBeenCalledWith('leader-takeover');
			expect(instanceSettings.markAsLeader).toHaveBeenCalled();
		});
	});
});
