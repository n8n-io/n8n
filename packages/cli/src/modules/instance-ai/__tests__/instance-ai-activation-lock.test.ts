import { UNLIMITED_CREDITS, type InstanceAiCredits } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { Push } from '@/push';
import type { AiService } from '@/services/ai.service';
import type { InstanceActivationService } from '@/services/instance-activation.service';
import type { Telemetry } from '@/telemetry';

import { InstanceAiCreditService } from '../instance-ai-credit.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';
import type { InstanceAiMessageRepository } from '../repositories/instance-ai-message.repository';
import type { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';

describe('InstanceAiCreditService activation lock', () => {
	const user = mock<User>({ id: 'user-1' });

	function setup(
		opts: {
			activationCapped?: boolean;
			proxyEnabled?: boolean;
			activatedAt?: number;
			/** Whether the instance has met the message threshold. */
			messageThresholdMet?: boolean;
			/** Value of `N8N_INSTANCE_AI_ACTIVATION_LOCK_MESSAGE_THRESHOLD`. */
			messageThreshold?: number;
			/** `quotaLocked` stays required here so each case states the service's verdict. */
			lockResult?: InstanceAiCredits & { quotaLocked: boolean };
			lockRejects?: Error;
		} = {},
	) {
		const aiService = mock<AiService>();
		aiService.isProxyEnabled.mockReturnValue(opts.proxyEnabled ?? true);
		if (opts.lockRejects) {
			aiService.lockInstanceAiQuota.mockRejectedValue(opts.lockRejects);
		} else {
			aiService.lockInstanceAiQuota.mockResolvedValue(
				opts.lockResult ?? { creditsQuota: 800, creditsClaimed: 12.5, quotaLocked: true },
			);
		}

		const settingsService = mock<InstanceAiSettingsService>();
		settingsService.isActivationCapped.mockReturnValue(opts.activationCapped ?? true);
		settingsService.getActivationLockMessageThreshold.mockReturnValue(opts.messageThreshold ?? 1);

		const activationService = mock<InstanceActivationService>();
		activationService.getActivatedAt.mockResolvedValue(opts.activatedAt);

		const messageRepo = mock<InstanceAiMessageRepository>();
		messageRepo.hasAtLeastUserMessages.mockResolvedValue(opts.messageThresholdMet ?? false);

		// `info` matters: the success path logs through it, so omitting it makes every happy-path
		// test fall into the catch instead — silently, and taking the push branch with it.
		const scopedLogger = { warn: vi.fn(), debug: vi.fn(), info: vi.fn() };
		const logger = { scoped: vi.fn().mockReturnValue(scopedLogger) };
		const push = mock<Push>();

		const service = new InstanceAiCreditService(
			logger as never,
			aiService,
			mock<Telemetry>(),
			{ instanceId: 'inst-1' } as never,
			push,
			mock<InstanceAiThreadRepository>(),
			settingsService,
			activationService,
			messageRepo,
		);

		return {
			service,
			aiService,
			settingsService,
			activationService,
			messageRepo,
			scopedLogger,
			push,
		};
	}

	describe('when both conditions are met', () => {
		it('locks the pool, reporting when the instance activated', async () => {
			const { service, aiService } = setup({
				activatedAt: 1_700_000_000,
				messageThresholdMet: true,
			});

			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).toHaveBeenCalledWith(user, 1_700_000_000);
		});

		it('stops calling the service once the lock is confirmed', async () => {
			const { service, aiService } = setup({
				activatedAt: 1_700_000_000,
				messageThresholdMet: true,
			});

			await service.ensureQuotaLockApplied(user);
			await service.ensureQuotaLockApplied(user);
			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).toHaveBeenCalledTimes(1);
		});

		it('pushes the lock to the acting user so the banner appears', async () => {
			const { service, push } = setup({ activatedAt: 1_700_000_000, messageThresholdMet: true });

			await service.ensureQuotaLockApplied(user);

			// Amounts stay masked for this cohort — the banner is raised by the flag alone.
			expect(push.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'updateInstanceAiCredits',
					data: { creditsQuota: UNLIMITED_CREDITS, creditsClaimed: 0, quotaLocked: true },
				},
				[user.id],
			);
		});

		it('reaches the success path without falling into the catch', async () => {
			const { service, scopedLogger } = setup({
				activatedAt: 1_700_000_000,
				messageThresholdMet: true,
			});

			await service.ensureQuotaLockApplied(user);

			expect(scopedLogger.info).toHaveBeenCalled();
			expect(scopedLogger.warn).not.toHaveBeenCalled();
		});

		it('raises no banner when the service reports the pool was not locked', async () => {
			const { service, push } = setup({
				activatedAt: 1_700_000_000,
				messageThresholdMet: true,
				lockResult: { creditsQuota: 800, creditsClaimed: 12.5, quotaLocked: false },
			});

			await service.ensureQuotaLockApplied(user);

			expect(push.sendToUsers).not.toHaveBeenCalled();
		});
	});

	describe('when only one condition is met', () => {
		it('asks for the configured number of messages, not merely one', async () => {
			const { service, messageRepo } = setup({ activatedAt: 1_700_000_000, messageThreshold: 3 });

			await service.ensureQuotaLockApplied(user);

			expect(messageRepo.hasAtLeastUserMessages).toHaveBeenCalledWith(3);
		});

		it('defaults to a single message when the operator sets nothing', async () => {
			const { service, messageRepo } = setup({ activatedAt: 1_700_000_000 });

			await service.ensureQuotaLockApplied(user);

			expect(messageRepo.hasAtLeastUserMessages).toHaveBeenCalledWith(1);
		});

		it('does not lock on activation alone', async () => {
			const { service, aiService } = setup({
				activatedAt: 1_700_000_000,
				messageThresholdMet: false,
			});

			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).not.toHaveBeenCalled();
		});

		it('does not lock on assistant use alone', async () => {
			const { service, aiService, messageRepo } = setup({
				activatedAt: undefined,
				messageThresholdMet: true,
			});

			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).not.toHaveBeenCalled();
			// Short-circuits before the message lookup, so the cheap check runs first.
			expect(messageRepo.hasAtLeastUserMessages).not.toHaveBeenCalled();
		});

		it('locks as soon as the outstanding half arrives', async () => {
			const { service, aiService, messageRepo } = setup({
				activatedAt: 1_700_000_000,
				messageThresholdMet: false,
			});

			await service.ensureQuotaLockApplied(user);
			expect(aiService.lockInstanceAiQuota).not.toHaveBeenCalled();

			messageRepo.hasAtLeastUserMessages.mockResolvedValue(true);
			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).toHaveBeenCalledTimes(1);
		});
	});

	describe('outside the activation-capped cohort', () => {
		it('never calls the service, whatever the conditions', async () => {
			const { service, aiService, activationService, messageRepo } = setup({
				activationCapped: false,
				activatedAt: 1_700_000_000,
				messageThresholdMet: true,
			});

			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).not.toHaveBeenCalled();
			expect(activationService.getActivatedAt).not.toHaveBeenCalled();
			expect(messageRepo.hasAtLeastUserMessages).not.toHaveBeenCalled();
		});
	});

	// A run awaits this before starting, so nothing in here — including the prerequisite reads —
	// may escape and take the run down with it.
	describe('when a prerequisite read fails', () => {
		it('swallows an activation-row read failure', async () => {
			const { service, activationService, scopedLogger } = setup({ messageThresholdMet: true });
			activationService.getActivatedAt.mockRejectedValue(new Error('db unavailable'));

			await expect(service.ensureQuotaLockApplied(user)).resolves.toBeUndefined();
			expect(scopedLogger.warn).toHaveBeenCalled();
		});

		it('swallows a message-count read failure', async () => {
			const { service, messageRepo, scopedLogger } = setup({ activatedAt: 1_700_000_000 });
			messageRepo.hasAtLeastUserMessages.mockRejectedValue(new Error('db unavailable'));

			await expect(service.ensureQuotaLockApplied(user)).resolves.toBeUndefined();
			expect(scopedLogger.warn).toHaveBeenCalled();
		});

		it('retries on the next call rather than giving up', async () => {
			const { service, aiService, activationService } = setup({ messageThresholdMet: true });
			activationService.getActivatedAt.mockRejectedValueOnce(new Error('db unavailable'));

			await service.ensureQuotaLockApplied(user);
			expect(aiService.lockInstanceAiQuota).not.toHaveBeenCalled();

			activationService.getActivatedAt.mockResolvedValue(1_700_000_000);
			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).toHaveBeenCalledTimes(1);
		});
	});

	it('does nothing when the proxy is disabled', async () => {
		const { service, aiService } = setup({
			proxyEnabled: false,
			activatedAt: 1_700_000_000,
			messageThresholdMet: true,
		});

		await service.ensureQuotaLockApplied(user);

		expect(aiService.lockInstanceAiQuota).not.toHaveBeenCalled();
	});

	describe('when the lock call fails', () => {
		it('swallows the error so the caller can continue', async () => {
			const { service, scopedLogger } = setup({
				activatedAt: 1_700_000_000,
				messageThresholdMet: true,
				lockRejects: new Error('service unavailable'),
			});

			await expect(service.ensureQuotaLockApplied(user)).resolves.toBeUndefined();
			expect(scopedLogger.warn).toHaveBeenCalled();
		});

		it('retries on the next call', async () => {
			const { service, aiService } = setup({
				activatedAt: 1_700_000_000,
				messageThresholdMet: true,
				lockRejects: new Error('service unavailable'),
			});

			await service.ensureQuotaLockApplied(user);
			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).toHaveBeenCalledTimes(2);
		});

		it('retries when the service reports the pool was not locked', async () => {
			const { service, aiService } = setup({
				activatedAt: 1_700_000_000,
				messageThresholdMet: true,
				lockResult: { creditsQuota: 800, creditsClaimed: 12.5, quotaLocked: false },
			});

			await service.ensureQuotaLockApplied(user);
			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).toHaveBeenCalledTimes(2);
		});
	});
});
