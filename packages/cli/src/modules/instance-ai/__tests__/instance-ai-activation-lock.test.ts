import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AiService } from '@/services/ai.service';
import type { InstanceActivationService } from '@/services/instance-activation.service';
import type { Telemetry } from '@/telemetry';

import { InstanceAiCreditService } from '../instance-ai-credit.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';
import type { InstanceAiMessageRepository } from '../repositories/instance-ai-message.repository';
import type { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';

/**
 * The activation lock trigger (INS-1082): the pool is locked only once the instance has activated
 * **and** someone has used the assistant. Both halves matter — activation alone would wall a user
 * who never opened the assistant, leaving them worse off than the control variant.
 */
describe('InstanceAiCreditService activation lock', () => {
	const user = mock<User>({ id: 'user-1' });

	function setup(
		opts: {
			activationCapped?: boolean;
			proxyEnabled?: boolean;
			activatedAt?: number;
			hasUserMessage?: boolean;
			lockResult?: { creditsQuota: number; creditsClaimed: number; quotaLocked: boolean };
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

		const activationService = mock<InstanceActivationService>();
		activationService.getActivatedAt.mockResolvedValue(opts.activatedAt);

		const messageRepo = mock<InstanceAiMessageRepository>();
		messageRepo.hasAnyUserMessage.mockResolvedValue(opts.hasUserMessage ?? false);

		const scopedLogger = { warn: vi.fn(), debug: vi.fn() };
		const logger = { scoped: vi.fn().mockReturnValue(scopedLogger) };

		const service = new InstanceAiCreditService(
			logger as never,
			aiService,
			mock<Telemetry>(),
			{ instanceId: 'inst-1' } as never,
			mock() as never,
			mock<InstanceAiThreadRepository>(),
			settingsService,
			activationService,
			messageRepo,
		);

		return { service, aiService, settingsService, activationService, messageRepo, scopedLogger };
	}

	describe('when both conditions are met', () => {
		it('locks the pool, reporting when the instance activated', async () => {
			const { service, aiService } = setup({ activatedAt: 1_700_000_000, hasUserMessage: true });

			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).toHaveBeenCalledWith(user, 1_700_000_000);
		});

		it('reports the lock as active', async () => {
			const { service } = setup({ activatedAt: 1_700_000_000, hasUserMessage: true });

			await expect(service.isActivationLockActive()).resolves.toBe(true);
		});

		it('stops calling the service once the lock is confirmed', async () => {
			const { service, aiService } = setup({ activatedAt: 1_700_000_000, hasUserMessage: true });

			await service.ensureQuotaLockApplied(user);
			await service.ensureQuotaLockApplied(user);
			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).toHaveBeenCalledTimes(1);
		});
	});

	describe('when only one condition is met', () => {
		it('does not lock on activation alone', async () => {
			const { service, aiService } = setup({ activatedAt: 1_700_000_000, hasUserMessage: false });

			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).not.toHaveBeenCalled();
			await expect(service.isActivationLockActive()).resolves.toBe(false);
		});

		it('does not lock on assistant use alone', async () => {
			const { service, aiService, messageRepo } = setup({
				activatedAt: undefined,
				hasUserMessage: true,
			});

			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).not.toHaveBeenCalled();
			// Short-circuits before the message lookup, so the cheap check runs first.
			expect(messageRepo.hasAnyUserMessage).not.toHaveBeenCalled();
		});

		it('locks as soon as the outstanding half arrives', async () => {
			const { service, aiService, messageRepo } = setup({
				activatedAt: 1_700_000_000,
				hasUserMessage: false,
			});

			await service.ensureQuotaLockApplied(user);
			expect(aiService.lockInstanceAiQuota).not.toHaveBeenCalled();

			messageRepo.hasAnyUserMessage.mockResolvedValue(true);
			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).toHaveBeenCalledTimes(1);
		});
	});

	// The hard invariant for the other three trial variants: with the env var unset, nothing about
	// this feature may run at all.
	describe('outside the activation-capped cohort', () => {
		it('never calls the service, whatever the conditions', async () => {
			const { service, aiService, activationService, messageRepo } = setup({
				activationCapped: false,
				activatedAt: 1_700_000_000,
				hasUserMessage: true,
			});

			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).not.toHaveBeenCalled();
			expect(activationService.getActivatedAt).not.toHaveBeenCalled();
			expect(messageRepo.hasAnyUserMessage).not.toHaveBeenCalled();
		});

		it('never reports the lock as active', async () => {
			const { service } = setup({
				activationCapped: false,
				activatedAt: 1_700_000_000,
				hasUserMessage: true,
			});

			await expect(service.isActivationLockActive()).resolves.toBe(false);
		});
	});

	it('does nothing when the proxy is disabled', async () => {
		const { service, aiService } = setup({
			proxyEnabled: false,
			activatedAt: 1_700_000_000,
			hasUserMessage: true,
		});

		await service.ensureQuotaLockApplied(user);

		expect(aiService.lockInstanceAiQuota).not.toHaveBeenCalled();
	});

	describe('when the lock call fails', () => {
		it('swallows the error so the caller can continue', async () => {
			const { service, scopedLogger } = setup({
				activatedAt: 1_700_000_000,
				hasUserMessage: true,
				lockRejects: new Error('service unavailable'),
			});

			await expect(service.ensureQuotaLockApplied(user)).resolves.toBeUndefined();
			expect(scopedLogger.warn).toHaveBeenCalled();
		});

		// Reconcile-on-read is the durability story, so a failure must leave the lock unconfirmed.
		it('retries on the next call', async () => {
			const { service, aiService } = setup({
				activatedAt: 1_700_000_000,
				hasUserMessage: true,
				lockRejects: new Error('service unavailable'),
			});

			await service.ensureQuotaLockApplied(user);
			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).toHaveBeenCalledTimes(2);
		});

		it('retries when the service reports the pool was not locked', async () => {
			const { service, aiService } = setup({
				activatedAt: 1_700_000_000,
				hasUserMessage: true,
				// e.g. the account is no longer on a trial plan, so the service refused.
				lockResult: { creditsQuota: 800, creditsClaimed: 12.5, quotaLocked: false },
			});

			await service.ensureQuotaLockApplied(user);
			await service.ensureQuotaLockApplied(user);

			expect(aiService.lockInstanceAiQuota).toHaveBeenCalledTimes(2);
		});
	});
});
