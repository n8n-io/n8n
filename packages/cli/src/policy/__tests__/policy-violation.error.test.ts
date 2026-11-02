import type { PolicyViolation } from '@n8n/decorators';
import { NodeOperationError, UserError } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { classifyRestError, RestErrorKind } from '@n8n/backend-services';
import { serializeInternalRestError } from '@n8n/backend-services';

import {
	findPolicyViolations,
	isPolicyRefusal,
	PolicyViolationError,
	type NonEmptyViolations,
} from '../policy-violation.error';

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

	describe('classifyRestError', () => {
		it('classifies as a responseError carrying the violations in meta', () => {
			const violations: NonEmptyViolations = [
				violation(),
				violation({ subject: 'n8n-nodes-base.code' }),
			];
			const error = new PolicyViolationError(violations);

			expect(classifyRestError(error)).toEqual({
				kind: RestErrorKind.responseError,
				status: 403,
				code: 403,
				message: error.message,
				meta: { violations },
			});
		});

		it('carries the violations into the REST response body', () => {
			const descriptor = classifyRestError(new PolicyViolationError([violation()]));
			const { status, body } = serializeInternalRestError(descriptor);

			expect(status).toBe(403);
			expect(body.meta).toEqual({ violations: [violation()] });
		});
	});

	describe('isPolicyRefusal', () => {
		const violation = () =>
			new PolicyViolationError([
				{ kind: 'node-type-unavailable', checkId: 'check-1', message: 'Blocked' },
			]);

		it('recognises a live error', () => {
			expect(isPolicyRefusal(violation())).toBe(true);
		});

		// `WorkflowRunner.processError` spreads a failed execution's error into a plain
		// object, dropping the prototype, so `instanceof` no longer holds.
		it('recognises one flattened by execution failure serialization', () => {
			const error = violation();
			const flattened = { ...error, message: error.message, stack: error.stack };

			expect(flattened instanceof PolicyViolationError).toBe(false);
			expect(isPolicyRefusal(flattened)).toBe(true);
		});

		it.each([
			['an ordinary error', new Error('boom')],
			['an unrelated object', { violations: [] }],
			['null', null],
			['undefined', undefined],
		])('does not recognise %s', (_label, value) => {
			expect(isPolicyRefusal(value)).toBe(false);
		});
	});

	describe('findPolicyViolations', () => {
		function wrapWithCauses(innermost: Error, wrapperCount: number): Error {
			let current = innermost;
			for (let i = 0; i < wrapperCount; i++) {
				current = new Error(`wrapper ${i}`, { cause: current });
			}
			return current;
		}

		const violations: NonEmptyViolations = [violation()];

		it('returns the violations of a direct refusal', () => {
			expect(findPolicyViolations(new PolicyViolationError(violations))).toEqual(violations);
		});

		it('returns the violations of a refusal a node error wraps', () => {
			const nodeError = new NodeOperationError(mock<INode>(), new PolicyViolationError(violations));

			expect(findPolicyViolations(nodeError)).toEqual(violations);
		});

		it('walks at most five errors down the cause chain', () => {
			const refusal = new PolicyViolationError(violations);

			expect(findPolicyViolations(wrapWithCauses(refusal, 4))).toEqual(violations);
			expect(findPolicyViolations(wrapWithCauses(refusal, 5))).toBeUndefined();
		});

		it.each([
			['a plain error chain', wrapWithCauses(new Error('root cause'), 3)],
			['a plain object', { violations }],
			['a string', 'boom'],
			['undefined', undefined],
		])('returns undefined for %s', (_label, value) => {
			expect(findPolicyViolations(value)).toBeUndefined();
		});
	});
});
