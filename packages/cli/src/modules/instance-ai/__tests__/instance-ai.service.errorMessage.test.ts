import type { User } from '@n8n/db';
import { isQuotaExhaustedError } from '@n8n/instance-ai';

import {
	getUserFacingErrorMessage,
	isMaskedStreamFailure,
	InstanceAiService,
	QuotaExhaustedStreamError,
} from '../instance-ai.service';

describe('getUserFacingErrorMessage', () => {
	it('maps a sandbox "Endpoint not allowed" failure to a clear, retryable message', () => {
		const message = getUserFacingErrorMessage(new Error('Endpoint not allowed'));
		expect(message).toContain("couldn't finish preparing the workspace sandbox");
		expect(message).toContain('try again');
	});

	it('falls back to a generic retryable message for unknown errors', () => {
		expect(getUserFacingErrorMessage(new Error('kaboom'))).toBe(
			'Something went wrong before I could finish that response. Please try again.',
		);
	});

	it('maps a quota-exhausted error (by code) to a clear out-of-credits message', () => {
		const error = Object.assign(new Error('Have reached end of quota'), {
			statusCode: 403,
			errorCode: 'quota_exhausted',
		});
		const message = getUserFacingErrorMessage(error);
		expect(message.toLowerCase()).toContain('credits');
		expect(message).not.toContain('Something went wrong');
	});

	it('does not treat a quota-worded message without a code as out-of-credits', () => {
		expect(getUserFacingErrorMessage(new Error('Have reached end of quota'))).toBe(
			'Something went wrong before I could finish that response. Please try again.',
		);
	});
});

function createNoOutputGeneratedError(): Error {
	const error = new Error('No output generated. Check the stream for errors.');
	error.name = 'AI_NoOutputGeneratedError';
	return error;
}

describe('isMaskedStreamFailure', () => {
	it('matches the ai-sdk zero-steps flush wrapper by name', () => {
		expect(isMaskedStreamFailure(createNoOutputGeneratedError())).toBe(true);
	});

	it('matches undici mid-stream termination', () => {
		expect(isMaskedStreamFailure(new TypeError('terminated'))).toBe(true);
	});

	it('does not match other errors', () => {
		expect(isMaskedStreamFailure(new TypeError('kaboom'))).toBe(false);
		expect(isMaskedStreamFailure(new Error('terminated'))).toBe(false);
		expect(isMaskedStreamFailure(undefined)).toBe(false);
		expect(isMaskedStreamFailure('terminated')).toBe(false);
	});
});

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

	function createService(
		getCredits: () => Promise<{ creditsQuota: number; creditsClaimed: number }>,
	): ReclassifyInternals {
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
