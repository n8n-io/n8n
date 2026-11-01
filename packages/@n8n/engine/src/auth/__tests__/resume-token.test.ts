import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ACTION_TOKEN_SPEC } from '../action-token';
import { IDENTITY_TOKEN_SPEC } from '../identity-token';
import { mintResumeToken, RESUME_TOKEN_SPEC, verifyResumeToken } from '../resume-token';
import { signSharedSecretToken } from '../shared-secret-token';

const secret = 'a'.repeat(32);
const executionId = '0199a1b2-0000-7000-8000-000000000001';

const verify = (token: string, id = executionId) => verifyResumeToken(secret, token, id);

describe('verifyResumeToken', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('rejects a token minted for another execution', () => {
		const token = mintResumeToken(secret, '0199a1b2-0000-7000-8000-000000000002');

		expect(verify(token)).toBe(false);
	});

	it('rejects a token signed with another secret', () => {
		expect(verify(mintResumeToken('b'.repeat(32), executionId))).toBe(false);
	});

	it('rejects everything when the secret is too short', () => {
		const short = 'a'.repeat(31);

		expect(verifyResumeToken(short, mintResumeToken(short, executionId), executionId)).toBe(false);
	});

	// The claims are valid, so only the issuer or the audience can reject the token.
	it.each([
		IDENTITY_TOKEN_SPEC,
		ACTION_TOKEN_SPEC,
		{ ...RESUME_TOKEN_SPEC, issuer: IDENTITY_TOKEN_SPEC.issuer },
		{ ...RESUME_TOKEN_SPEC, audience: IDENTITY_TOKEN_SPEC.audience },
	])('rejects resume claims under a foreign issuer or audience %#', (spec) => {
		const token = signSharedSecretToken(spec, secret, { k: 'execution-bound', eid: executionId });

		expect(verify(token)).toBe(false);
	});

	it('accepts its own token, which carries no expiry and still verifies a year later', () => {
		const token = mintResumeToken(secret, executionId);

		expect(verify(token)).toBe(true);
		expect(jwt.decode(token)).not.toHaveProperty('exp');
		vi.advanceTimersByTime(365 * 24 * 60 * 60 * 1000);
		expect(verify(token)).toBe(true);
	});

	it.each(['exec-1', '0199a1b2-0000-4000-8000-000000000001', `${executionId}${'0'.repeat(1000)}`])(
		'rejects a token whose execution id is not a UUID v7, even when it matches %#',
		(id) => {
			expect(verify(mintResumeToken(secret, id), id)).toBe(false);
		},
	);

	it.each([{}, { k: 'step-bound' }])(
		'rejects a token whose kind is not execution-bound %#',
		(kind) => {
			const token = jwt.sign({ ...kind, eid: executionId }, secret, {
				algorithm: 'HS256',
				issuer: RESUME_TOKEN_SPEC.issuer,
				audience: RESUME_TOKEN_SPEC.audience,
			});

			expect(verify(token)).toBe(false);
		},
	);

	it.each([
		[29, true],
		[31, false],
	])('allows %i seconds of clock skew on the issue time: %s', (secondsAhead, accepted) => {
		const token = jwt.sign(
			{ k: 'execution-bound', eid: executionId, iat: Math.floor(Date.now() / 1000) + secondsAhead },
			secret,
			{
				algorithm: 'HS256',
				issuer: RESUME_TOKEN_SPEC.issuer,
				audience: RESUME_TOKEN_SPEC.audience,
			},
		);

		expect(verify(token)).toBe(accepted);
	});
});
