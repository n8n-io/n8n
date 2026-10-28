import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ACTION_TOKEN_SPEC } from '../action-token';
import { IDENTITY_TOKEN_SPEC } from '../identity-token';
import {
	APPROVAL_CALLBACK_PREFIX,
	mintApprovalCallback,
	mintResumeToken,
	mintStepBoundResumeToken,
	parseApprovalCallback,
	RESUME_TOKEN_SPEC,
	verifyResumeToken,
} from '../resume-token';
import { signSharedSecretToken } from '../shared-secret-token';

const secret = 'a'.repeat(32);
const otherSecret = 'b'.repeat(32);
const executionId = '0199a1b2-0000-7000-8000-000000000001';
const stepId = '0199a1b2-0000-7000-8000-0000000000aa';
const binding = `/webhook-waiting/${stepId}/node-1?approved=true`;

const verify = (token: string) => verifyResumeToken(secret, token);

const signAsResumeToken = (claims: object) =>
	jwt.sign(claims, secret, {
		algorithm: 'HS256',
		issuer: RESUME_TOKEN_SPEC.issuer,
		audience: RESUME_TOKEN_SPEC.audience,
	});

const mintEach = {
	'an execution-bound token': (s: string) => mintResumeToken(s, executionId),
	'a step-bound token': (s: string) => mintStepBoundResumeToken(s, stepId, binding),
	'an approval callback': (s: string) => mintApprovalCallback(s, stepId, 'a'),
};

describe('verifyResumeToken', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('proves the execution that an execution-bound token names', () => {
		expect(verify(mintResumeToken(secret, executionId))).toEqual({
			kind: 'execution-bound',
			executionId,
		});
	});

	it('proves the step and the binding that a step-bound token names', () => {
		expect(verify(mintStepBoundResumeToken(secret, stepId, binding))).toEqual({
			kind: 'step-bound',
			stepId,
			binding,
		});
	});

	it.each(Object.entries(mintEach))('rejects %s signed with another secret', (_, mint) => {
		expect(verify(mint(otherSecret))).toBeUndefined();
	});

	it.each(Object.entries(mintEach))('rejects %s when the secret is too short', (_, mint) => {
		const short = 'a'.repeat(31);

		expect(verifyResumeToken(short, mint(short))).toBeUndefined();
	});

	// The claims are valid, so only the issuer or the audience can reject the token.
	it.each([
		IDENTITY_TOKEN_SPEC,
		ACTION_TOKEN_SPEC,
		{ ...RESUME_TOKEN_SPEC, issuer: IDENTITY_TOKEN_SPEC.issuer },
		{ ...RESUME_TOKEN_SPEC, audience: IDENTITY_TOKEN_SPEC.audience },
	])('rejects resume claims under a foreign issuer or audience %#', (spec) => {
		const token = signSharedSecretToken(spec, secret, { k: 'execution-bound', eid: executionId });

		expect(verify(token)).toBeUndefined();
	});

	it('accepts its own token, which carries no expiry and still verifies a year later', () => {
		const token = mintStepBoundResumeToken(secret, stepId, binding);

		expect(verify(token)).toBeDefined();
		expect(jwt.decode(token)).not.toHaveProperty('exp');
		vi.advanceTimersByTime(365 * 24 * 60 * 60 * 1000);
		expect(verify(token)).toBeDefined();
	});

	it.each(['exec-1', '0199a1b2-0000-4000-8000-000000000001', `${executionId}${'0'.repeat(1000)}`])(
		'rejects a token whose id is not a UUID v7 %#',
		(id) => {
			expect(verify(mintResumeToken(secret, id))).toBeUndefined();
			expect(verify(mintStepBoundResumeToken(secret, id, binding))).toBeUndefined();
		},
	);

	it.each([
		{ eid: executionId },
		{ k: 'step-bound', eid: executionId },
		{ k: 'step-bound', sid: stepId },
		{ k: 'step-bound', sid: stepId, b: '' },
		{ k: 'execution-bound', sid: stepId, b: binding },
		{ k: 'approval-callback', sid: stepId, d: 'a' },
	])('rejects claims that do not fit their kind %#', (claims) => {
		expect(verify(signAsResumeToken(claims))).toBeUndefined();
	});

	it.each([
		[29, true],
		[31, false],
	])('allows %i seconds of clock skew on the issue time: %s', (secondsAhead, accepted) => {
		const token = signAsResumeToken({
			k: 'execution-bound',
			eid: executionId,
			iat: Math.floor(Date.now() / 1000) + secondsAhead,
		});

		expect(verify(token) !== undefined).toBe(accepted);
	});
});

describe('approval callback', () => {
	const approve = mintApprovalCallback(secret, stepId, 'a');
	const [, encodedStepId, , mac] = approve.split('|');

	it.each(['a', 'd'] as const)('proves the step and the decision %s', (decision) => {
		expect(verify(mintApprovalCallback(secret, stepId, decision))).toEqual({
			kind: 'approval-callback',
			stepId,
			decision,
		});
	});

	it('fits the 64 bytes that Telegram allows for a button', () => {
		expect(approve.startsWith(APPROVAL_CALLBACK_PREFIX)).toBe(true);
		expect(Buffer.byteLength(approve)).toBeLessThanOrEqual(64);
	});

	it('binds its decision: the MAC of an approval does not decline', () => {
		expect(verify(`${APPROVAL_CALLBACK_PREFIX}${encodedStepId}|d|${mac}`)).toBeUndefined();
	});

	it('binds its step: the MAC of one step does not end another', () => {
		const other = mintApprovalCallback(secret, '0199a1b2-0000-7000-8000-0000000000bb', 'a');
		const [, otherStepId] = other.split('|');

		expect(verify(`${APPROVAL_CALLBACK_PREFIX}${otherStepId}|a|${mac}`)).toBeUndefined();
	});

	// 22 characters hold 132 bits for a 128-bit id, so the last one has four unused bits.
	it('rejects a second spelling of the same step id', () => {
		const last = encodedStepId.charCodeAt(encodedStepId.length - 1);
		const respelled = `${encodedStepId.slice(0, -1)}${String.fromCharCode(last + 1)}`;
		expect(Buffer.from(respelled, 'base64url')).toEqual(Buffer.from(encodedStepId, 'base64url'));

		expect(verify(`${APPROVAL_CALLBACK_PREFIX}${respelled}|a|${mac}`)).toBeUndefined();
	});

	it('refuses to mint for a step id that is not a UUID', () => {
		expect(() => mintApprovalCallback(secret, 'step-1', 'a')).toThrow();
	});
});

describe('parseApprovalCallback', () => {
	it('reads the step id and the decision without the secret', () => {
		expect(parseApprovalCallback(mintApprovalCallback(otherSecret, stepId, 'd'))).toEqual({
			stepId,
			decision: 'd',
		});
	});

	it.each([
		'nhitl1|exec-1|a|0123456789abcdef0123456789abcdef',
		`${APPROVAL_CALLBACK_PREFIX}short|a|mac`,
		`${APPROVAL_CALLBACK_PREFIX}AZmhsgAAcACAAAAAAAAAqg|x|mac`,
		`${APPROVAL_CALLBACK_PREFIX}AZmhsgAAcACAAAAAAAAAqg|a|`,
	])('answers undefined for a string that is not an approval callback %#', (reference) => {
		expect(parseApprovalCallback(reference)).toBeUndefined();
	});
});
