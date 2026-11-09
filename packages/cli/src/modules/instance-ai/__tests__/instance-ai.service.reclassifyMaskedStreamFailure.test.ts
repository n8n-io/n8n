import type { InstanceAiCredits } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { isQuotaExhaustedError } from '@n8n/instance-ai';

import { InstanceAiService, QuotaExhaustedStreamError } from '../instance-ai.service';
import { getUserFacingErrorMessage } from '../user-facing-errors';

function createNoOutputGeneratedError(): Error {
	const error = new Error('No output generated. Check the stream for errors.');
	error.name = 'AI_NoOutputGeneratedError';
	return error;
}

describe('reclassifyMaskedStreamFailure', () => {
	type ReclassifyInternals = {
		reclassifyMaskedStreamFailure: (
			error: unknown,
			user: User,
			context: { threadId: string; runId: string },
		) => Promise<unknown>;
		modelService: {
			getCredits: ReturnType<typeof vi.fn>;
		};
		logger: { debug: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };
	};

	const user = { id: 'user-1' } as User;
	const context = { threadId: 'thread-1', runId: 'run-1' };

	function createService(getCredits: () => Promise<InstanceAiCredits>): ReclassifyInternals {
		const service = Object.create(InstanceAiService.prototype) as unknown as ReclassifyInternals;
		service.modelService = { getCredits: vi.fn(getCredits) };
		service.logger = { debug: vi.fn(), info: vi.fn() };
		return service;
	}

	it('substitutes a quota-exhausted error for a masked failure when credits are used up', async () => {
		const service = createService(async () => ({ creditsQuota: 100, creditsClaimed: 100 }));
		const masked = createNoOutputGeneratedError();

		const resolved = await service.reclassifyMaskedStreamFailure(masked, user, context);

		expect(resolved).toBeInstanceOf(QuotaExhaustedStreamError);
		expect(isQuotaExhaustedError(resolved)).toBe(true);
		expect(getUserFacingErrorMessage(resolved).toLowerCase()).toContain('credits');
		expect((resolved as Error).cause).toBe(masked);
	});

	it('keeps the original error when credits remain', async () => {
		const service = createService(async () => ({ creditsQuota: 100, creditsClaimed: 40 }));
		const masked = new TypeError('terminated');

		await expect(service.reclassifyMaskedStreamFailure(masked, user, context)).resolves.toBe(
			masked,
		);
	});

	it('keeps the original error on the unlimited-credits sentinel', async () => {
		const service = createService(async () => ({ creditsQuota: -1, creditsClaimed: 0 }));
		const masked = new TypeError('terminated');

		await expect(service.reclassifyMaskedStreamFailure(masked, user, context)).resolves.toBe(
			masked,
		);
	});

	it('keeps the original error when the credit re-check fails', async () => {
		const service = createService(async () => {
			throw new Error('service unavailable');
		});
		const masked = createNoOutputGeneratedError();

		await expect(service.reclassifyMaskedStreamFailure(masked, user, context)).resolves.toBe(
			masked,
		);
	});

	it('does not re-check credits for non-masked errors', async () => {
		const service = createService(async () => ({ creditsQuota: 100, creditsClaimed: 100 }));
		const error = new Error('kaboom');

		await expect(service.reclassifyMaskedStreamFailure(error, user, context)).resolves.toBe(error);
		expect(service.modelService.getCredits).not.toHaveBeenCalled();
	});
});
