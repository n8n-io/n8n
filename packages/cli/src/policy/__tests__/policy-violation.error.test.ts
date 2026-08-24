import type { PolicyViolation } from '@n8n/decorators';
import { UserError } from 'n8n-workflow';

import { classifyHttpError, HttpErrorKind } from '@/errors/http-error-classifier';
import { serializeInternalRestError } from '@/errors/http-error-serializers';

import { PolicyViolationError, type NonEmptyViolations } from '../policy-violation.error';

const violation = (overrides: Partial<PolicyViolation> = {}): PolicyViolation => ({
	kind: 'node-type-unavailable',
	checkId: 'node-type-availability',
	message: 'The node type n8n-nodes-base.slack is not available on this instance',
	subject: 'n8n-nodes-base.slack',
	subjectType: 'node-type',
	scope: 'instance',
	...overrides,
});

describe('PolicyViolationError', () => {
	it('is a UserError, so execution treats it as non-retryable', () => {
		expect(new PolicyViolationError([violation()])).toBeInstanceOf(UserError);
	});

	it('is not reported to Sentry', () => {
		expect(new PolicyViolationError([violation()]).shouldReport).toBe(false);
	});

	it('cannot be constructed without a violation', () => {
		// @ts-expect-error an error that blocks an action with no reason given is a bug
		const build = () => new PolicyViolationError([]);

		expect(build).toBeDefined();
	});

	it('keeps its own copy of the violations', () => {
		const violations: NonEmptyViolations = [violation()];
		const error = new PolicyViolationError(violations);

		violations.push(violation({ checkId: 'added-later' }));

		expect(error.violations).toHaveLength(1);
	});

	describe('message', () => {
		it('uses the single violation message as-is', () => {
			expect(new PolicyViolationError([violation()]).message).toBe(violation().message);
		});

		it('lists every violation when there are several', () => {
			const error = new PolicyViolationError([
				violation({ message: 'slack is blocked' }),
				violation({ message: 'code is blocked' }),
			]);

			expect(error.message).toBe('Blocked by policy: slack is blocked; code is blocked');
		});

		it('can be overridden by the call site', () => {
			const error = new PolicyViolationError([violation()], 'Cannot save workflow');

			expect(error.message).toBe('Cannot save workflow');
			expect(error.violations).toHaveLength(1);
		});
	});

	describe('classifyHttpError', () => {
		it('classifies as a responseError carrying the violations in meta', () => {
			const violations: NonEmptyViolations = [
				violation(),
				violation({ subject: 'n8n-nodes-base.code' }),
			];
			const error = new PolicyViolationError(violations);

			expect(classifyHttpError(error)).toEqual({
				kind: HttpErrorKind.responseError,
				status: 403,
				code: 403,
				message: error.message,
				meta: { violations },
			});
		});

		it('carries the violations into the REST response body', () => {
			const descriptor = classifyHttpError(new PolicyViolationError([violation()]));
			const { status, body } = serializeInternalRestError(descriptor);

			expect(status).toBe(403);
			expect(body.meta).toEqual({ violations: [violation()] });
		});
	});
});
