import type { InstanceAiCredits } from '@n8n/api-types';
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

	it('maps a stale resume race to a clear already-handled message', () => {
		const error = Object.assign(new Error('Run run_1 is not suspended. Cannot resume.'), {
			name: 'StaleResumeError',
		});
		expect(getUserFacingErrorMessage(error)).toContain('already handled');
	});

	it('falls back to a generic retryable message for unknown errors', () => {
		expect(getUserFacingErrorMessage(new Error('kaboom'))).toBe(
			'Something went wrong before I could finish that response. Please try again.',
		);
	});

	it('maps a dropped provider connection to a retryable message, not the generic one', () => {
		const error = Object.assign(new TypeError('terminated'), {
			cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }),
		});
		const message = getUserFacingErrorMessage(error);
		expect(message).toContain('connection to the AI provider dropped');
		expect(message).toContain('try again');
	});

	it('prefers the out-of-credits message when a quota failure carries a transport cause', () => {
		const masked = Object.assign(new TypeError('terminated'), {
			cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }),
		});
		const message = getUserFacingErrorMessage(new QuotaExhaustedStreamError(masked));
		expect(message.toLowerCase()).toContain('credits');
		expect(message).not.toContain('connection to the AI provider dropped');
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

	describe('provider attachment rejections', () => {
		const oversizedImage =
			'messages.0.content.1.image: image exceeds 10 MB maximum: 12058221 bytes > 10485760 bytes';

		// Real shapes the provider returns when it refuses an attachment outright.
		it.each([
			oversizedImage,
			'messages.0.content.1.image.source.base64.data: At least one of the image dimensions exceed max allowed size for many-image requests',
			'Could not process image. The image is too large.',
		])('points the user at the attachment for: %s', (providerMessage) => {
			const message = getUserFacingErrorMessage(new Error(providerMessage));
			expect(message.toLowerCase()).toContain('attached file');
			expect(message).not.toContain('Something went wrong');
		});

		it('does not tell the user to retry, since a retry replays the same attachment', () => {
			expect(getUserFacingErrorMessage(new Error(oversizedImage)).toLowerCase()).not.toContain(
				'try again',
			);
		});

		it('quotes the raw-file limit the user can compare against their file', () => {
			expect(getUserFacingErrorMessage(new Error(oversizedImage))).toContain('7.5 MB');
		});

		// A refused PDF or CSV told to satisfy a pixel limit sends the user the wrong way.
		it('describes the attachment generically rather than assuming an image', () => {
			const message = getUserFacingErrorMessage(new Error(oversizedImage));
			expect(message).toContain('file');
			expect(message).not.toMatch(/attached images/);
		});

		// The provider's text is usually unreachable at this point, so a removal driven
		// only by "this turn had attachments and produced nothing" must not invent a cause.
		it('omits the size hint when the error does not say the file was too large', () => {
			const message = getUserFacingErrorMessage(new Error('No output generated.'), undefined, {
				attachmentRemoved: true,
			});
			expect(message.toLowerCase()).toContain('left it out');
			expect(message).not.toContain('7.5 MB');
			expect(message).not.toContain('8000x8000');
		});

		it('leaves unrelated provider errors on the generic message', () => {
			expect(getUserFacingErrorMessage(new Error('messages: too many total tokens'))).toBe(
				'Something went wrong before I could finish that response. Please try again.',
			);
			expect(getUserFacingErrorMessage(new Error('image generation is not supported'))).toBe(
				'Something went wrong before I could finish that response. Please try again.',
			);
		});

		// When history could not be rewritten the attachment is still there, so the
		// thread stays broken — promising it was removed would be a lie.
		it('claims the attachment was dropped only when it actually was', () => {
			const recovered = getUserFacingErrorMessage(new Error(oversizedImage), undefined, {
				attachmentRemoved: true,
			});
			expect(recovered.toLowerCase()).toContain('left it out');
			expect(recovered).toContain('7.5 MB');
		});

		it('tells the user to start a new chat when the attachment could not be removed', () => {
			const stranded = getUserFacingErrorMessage(new Error(oversizedImage), undefined, {
				attachmentRemoved: false,
			});
			expect(stranded.toLowerCase()).not.toContain('left it out');
			expect(stranded.toLowerCase()).toContain('new chat');
		});
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

	// The activation lock refuses use while the quota still has credits, so the numbers alone
	// wouldn't explain the failure.
	it('substitutes a quota-exhausted error when the proxy reports the pool locked', async () => {
		const service = createService(async () => ({
			creditsQuota: 100,
			creditsClaimed: 40,
			quotaLocked: true,
		}));
		const masked = createNoOutputGeneratedError();

		const resolved = await service.reclassifyMaskedStreamFailure(masked, user, context);

		expect(resolved).toBeInstanceOf(QuotaExhaustedStreamError);
	});

	// The lock is read from the proxy, never inferred from n8n's own trigger state: a lock call
	// that failed leaves the pool open, and an unrelated stream death must not become a paywall.
	it('keeps the original error when the proxy reports the pool unlocked', async () => {
		const service = createService(async () => ({
			creditsQuota: 100,
			creditsClaimed: 40,
			quotaLocked: false,
		}));
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
