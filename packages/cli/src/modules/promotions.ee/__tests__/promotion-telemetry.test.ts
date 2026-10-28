import {
	BadRequestError,
	ConflictError,
	InternalServerError,
	NotFoundError,
	ServiceUnavailableError,
	TooManyRequestsError,
} from '@n8n/errors';
import { UnexpectedError } from 'n8n-workflow';

import { PromotionConflictError } from '../database/promotion-conflict.error';
import { classifyPromotionFailure, observePromotion } from '../promotion-telemetry';
import { PromotionGitError, PromotionLocalGitError } from '../promotions-git.error';

describe('classifyPromotionFailure', () => {
	it.each([
		['a Git failure', new PromotionGitError('Could not complete the Git operation'), 'git_remote'],
		['an unavailable host', new ServiceUnavailableError('timed out'), 'git_remote'],
		['a rate-limited host', new TooManyRequestsError('slow down'), 'git_remote'],
		['a local Git step', new PromotionLocalGitError('local'), 'unexpected'],
		['a bad request', new BadRequestError('bad'), 'user'],
		['a conflict', new ConflictError('conflict'), 'user'],
		['a missing resource', new NotFoundError('missing'), 'user'],
		['a database conflict', new PromotionConflictError('duplicate'), 'user'],
		['a server error', new InternalServerError('boom'), 'unexpected'],
		['a bug', new UnexpectedError('bug'), 'unexpected'],
		['a plain error', new Error('plain'), 'unexpected'],
		['a thrown string', 'oops', 'unexpected'],
	])('classifies %s as %s', (_label, error, expected) => {
		expect(classifyPromotionFailure(error)).toBe(expected);
	});
});

describe('observePromotion', () => {
	it('reports the result and returns it', async () => {
		const report = vi.fn();

		await expect(observePromotion(async () => 'done', report)).resolves.toBe('done');

		expect(report).toHaveBeenCalledWith({
			ok: true,
			result: 'done',
			durationMs: expect.any(Number),
		});
	});

	it('returns the result when the report throws', async () => {
		const report = vi.fn(() => {
			throw new Error('listener failed');
		});

		await expect(observePromotion(async () => 'done', report)).resolves.toBe('done');
	});

	it('rethrows the original error when the report throws', async () => {
		const error = new BadRequestError('bad');
		const report = vi.fn(() => {
			throw new Error('listener failed');
		});

		await expect(
			observePromotion(async () => {
				throw error;
			}, report),
		).rejects.toBe(error);
	});

	it('reports the failure kind and rethrows the original error', async () => {
		const report = vi.fn();
		const error = new BadRequestError('bad');

		await expect(
			observePromotion(async () => {
				throw error;
			}, report),
		).rejects.toBe(error);

		expect(report).toHaveBeenCalledWith({
			ok: false,
			failureKind: 'user',
			durationMs: expect.any(Number),
		});
	});
});
