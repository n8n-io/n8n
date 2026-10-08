import type { Logger } from '@n8n/backend-common';
import {
	ClaimMappingSchema,
	type ClaimMapping,
	type ExternalIdentity,
	type Result,
} from '@n8n/inbound-auth';
import { mock } from 'vitest-mock-extended';

import { translateClaims } from '../identity/external-identity';

const logger = mock<Logger>();

/** RFC 9068 claim names: sub, email, email_verified, name, client_id, scope. */
const DEFAULT_MAPPING = ClaimMappingSchema.parse({});

/** Microsoft Entra: stable id in `oid`, email in one of two claims, scopes as an array in `scp`. */
const ENTRA_MAPPING = ClaimMappingSchema.parse({
	subject: 'oid',
	email: '={{ $claims.email ?? $claims.preferred_username }}',
	emailVerified: 'xms_edov',
	clientId: 'azp',
	scopes: 'scp',
});

function translate(claims: Record<string, unknown>, mapping: ClaimMapping = DEFAULT_MAPPING) {
	return translateClaims(claims, mapping, logger);
}

function expectOk(result: Result<ExternalIdentity>): ExternalIdentity {
	expect(result.ok).toBe(true);
	if (!result.ok) throw new Error(`rejected: ${result.reason}`);
	return result.value;
}

describe('translateClaims', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('mapping', () => {
		it('reads the RFC 9068 claims with the default mapping', () => {
			const claims = {
				sub: 'user-1',
				email: 'Ada@Example.com',
				email_verified: true,
				name: 'Ada Lovelace',
				client_id: 'client-a',
				scope: 'read write read',
			};

			const identity = expectOk(translate(claims));

			expect(identity).toEqual({
				subject: 'user-1',
				email: 'ada@example.com',
				emailVerified: true,
				displayName: 'Ada Lovelace',
				clientId: 'client-a',
				scopes: ['read', 'write'],
				raw: claims,
			});
			expect(identity.assurance).toBeUndefined();
		});

		it('reads Entra claims with an array scope and the preferred_username fallback', () => {
			const claims = {
				oid: 'oid-1',
				preferred_username: 'Ada@Contoso.com',
				xms_edov: 'true',
				azp: 'app-1',
				scp: ['Mail.Read', 'Mail.Read', 'User.Read'],
			};

			const identity = expectOk(translate(claims, ENTRA_MAPPING));

			expect(identity).toEqual({
				subject: 'oid-1',
				email: 'ada@contoso.com',
				emailVerified: true,
				clientId: 'app-1',
				scopes: ['Mail.Read', 'User.Read'],
				raw: claims,
			});
		});

		it('prefers the first operand of the ?? fallback when that claim is present', () => {
			const claims = { oid: 'oid-1', email: 'Ada@Example.com', preferred_username: 'other' };

			expect(expectOk(translate(claims, ENTRA_MAPPING)).email).toBe('ada@example.com');
		});

		it('joins several claims in a displayName expression', () => {
			const mapping = ClaimMappingSchema.parse({
				displayName: '={{ $claims.given_name }} {{ $claims.family_name }}',
			});
			const claims = { sub: 'user-1', given_name: 'Ada', family_name: 'Lovelace' };

			expect(expectOk(translate(claims, mapping)).displayName).toBe('Ada Lovelace');
		});

		it.each([
			['undefined', '={{ $claims.missing }}', {}],
			['an empty string', '={{ $claims.empty }}', { empty: '' }],
			['a number', '={{ $claims.n }}', { n: 42 }],
			['a thrown error', '={{ $claims.x.y.z }}', {}],
		])(
			'leaves the attribute absent and logs at debug when an expression yields %s',
			(_label, displayName, extraClaims) => {
				const mapping = ClaimMappingSchema.parse({ displayName });

				const result = translate({ sub: 'user-1', ...extraClaims }, mapping);

				expect(result.ok).toBe(true);
				expect(expectOk(result).displayName).toBeUndefined();
				expect(logger.debug).toHaveBeenCalled();
			},
		);

		it('reads a plain claim name with own-property semantics, not the prototype chain', () => {
			const mapping = ClaimMappingSchema.parse({ displayName: 'constructor' });

			expect(expectOk(translate({ sub: 'user-1' }, mapping)).displayName).toBeUndefined();
		});

		it('leaves the attribute absent when the plain claim is not a string', () => {
			expect(expectOk(translate({ sub: 'user-1', name: 7 })).displayName).toBeUndefined();
			expect(expectOk(translate({ sub: 'user-1', name: '' })).displayName).toBeUndefined();
		});
	});

	describe('subject', () => {
		it.each([
			['the claim is missing', { email: 'a@example.com' }],
			['the claim is not a string', { sub: 42 }],
			['the claim is an empty string', { sub: '' }],
		])('rejects with unknown-subject when %s', (_label, claims) => {
			expect(translate(claims)).toEqual({ ok: false, reason: 'unknown-subject' });
		});
	});

	describe('email', () => {
		it('lowercases the email', () => {
			expect(expectOk(translate({ sub: 'u', email: 'Ada.L@EXAMPLE.org' })).email).toBe(
				'ada.l@example.org',
			);
		});

		it.each([
			[true, true],
			['true', true],
			[false, false],
			['false', false],
			['yes', undefined],
			['TRUE', undefined],
			[1, undefined],
			[undefined, undefined],
		])('maps email_verified %j to %j', (email_verified, expected) => {
			expect(expectOk(translate({ sub: 'u', email_verified })).emailVerified).toBe(expected);
		});
	});

	describe('scopes', () => {
		it.each([
			['a space-separated string with a duplicate', 'a b  a', ['a', 'b']],
			['an array with a duplicate', ['a', 'a', 'b'], ['a', 'b']],
			['an array with a non-string entry', ['a', 3], []],
			['an array with an empty string', ['a', ''], []],
			['an absent claim', undefined, []],
			['an empty string', '', []],
		])('yields %s as %j', (_label, scope, expected) => {
			expect(expectOk(translate({ sub: 'u', scope })).scopes).toEqual(expected);
		});
	});

	describe('assurance', () => {
		it('is undefined when no assurance claim is present', () => {
			expect(expectOk(translate({ sub: 'u' })).assurance).toBeUndefined();
		});

		it('reads acr as a non-empty string', () => {
			const identity = expectOk(translate({ sub: 'u', acr: 'urn:mace:incommon:iap:silver' }));

			expect(identity.assurance).toEqual({ acr: 'urn:mace:incommon:iap:silver' });
		});

		it('keeps only the string entries of amr', () => {
			const identity = expectOk(translate({ sub: 'u', amr: ['pwd', 7, 'mfa'] }));

			expect(identity.assurance).toEqual({ amr: ['pwd', 'mfa'] });
		});

		it.each([
			['a number of seconds', 1700000000],
			['a numeric string of seconds', '1700000000'],
		])('reads auth_time given as %s into a Date', (_label, auth_time) => {
			const identity = expectOk(translate({ sub: 'u', auth_time }));

			expect(identity.assurance?.authTime).toEqual(new Date(1700000000 * 1000));
		});

		it.each([
			['negative', -5],
			['zero', 0],
			['not numeric', 'yesterday'],
			['an empty string', ''],
			['beyond the Date range', 1e300],
		])('leaves authTime absent when auth_time is %s', (_label, auth_time) => {
			expect(expectOk(translate({ sub: 'u', auth_time })).assurance?.authTime).toBeUndefined();
		});
	});

	it('keeps the input claims object as raw', () => {
		const claims = { sub: 'u', extra: { nested: true } };

		expect(expectOk(translate(claims)).raw).toBe(claims);
	});
});
