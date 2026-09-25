import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mintActionToken } from '../action-token';
import { mintIdentityToken } from '../identity-token';
import { mintResumeToken, RESUME_TOKEN, verifyResumeToken } from '../resume-token';

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

	it('accepts a token minted for the same execution', () => {
		expect(verify(mintResumeToken(secret, executionId))).toBe(true);
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

	it('rejects an identity token and an action token signed with the same secret', () => {
		expect(verify(mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 't-1' }))).toBe(false);
		expect(verify(mintActionToken(secret, 'lifecycle-events:write'))).toBe(false);
	});

	it('carries no expiry and still verifies a year later', () => {
		const token = mintResumeToken(secret, executionId);

		expect(jwt.decode(token)).not.toHaveProperty('exp');
		vi.advanceTimersByTime(365 * 24 * 60 * 60 * 1000);
		expect(verify(token)).toBe(true);
	});

	it.each([{}, { k: 'step-bound' }])(
		'rejects a token whose kind is not execution-bound %#',
		(kind) => {
			const token = jwt.sign({ ...kind, eid: executionId }, secret, {
				algorithm: 'HS256',
				issuer: RESUME_TOKEN.issuer,
				audience: RESUME_TOKEN.audience,
			});

			expect(verify(token)).toBe(false);
		},
	);

	it('rejects a token that claims to be issued in the future', () => {
		const token = jwt.sign(
			{
				k: 'execution-bound',
				eid: executionId,
				iat: Math.floor(Date.now() / 1000) + RESUME_TOKEN.clockToleranceSeconds + 60,
			},
			secret,
			{ algorithm: 'HS256', issuer: RESUME_TOKEN.issuer, audience: RESUME_TOKEN.audience },
		);

		expect(verify(token)).toBe(false);
	});
});
