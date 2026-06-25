import { ZodError } from 'zod';
import { UnexpectedError } from 'n8n-workflow';

import { toPublicApiCredentialResponse } from '../credentials.mapper';

type MapperInput = Parameters<typeof toPublicApiCredentialResponse>[0];

const makeCredential = (overrides: Partial<MapperInput> = {}): MapperInput => ({
	id: 'cred-1',
	name: 'GitHub',
	type: 'githubApi',
	isManaged: false,
	isGlobal: false,
	isResolvable: false,
	createdAt: new Date('2026-01-01T10:00:00.000Z'),
	updatedAt: new Date('2026-01-02T10:00:00.000Z'),
	...overrides,
});

describe('toPublicApiCredentialResponse', () => {
	it('sets defaults for optional mapper fields', () => {
		const response = toPublicApiCredentialResponse(makeCredential());

		expect(response.resolvableAllowFallback).toBe(false);
		expect(response.resolverId).toBeNull();
		expect(response.id).toBe('cred-1');
		expect(response.name).toBe('GitHub');
		expect(response.type).toBe('githubApi');
		expect(response.createdAt).toEqual(new Date('2026-01-01T10:00:00.000Z'));
		expect(response.updatedAt).toEqual(new Date('2026-01-02T10:00:00.000Z'));
	});

	it('keeps provided optional mapper fields', () => {
		const response = toPublicApiCredentialResponse(
			makeCredential({
				resolvableAllowFallback: true,
				resolverId: 'resolver-1',
			}),
		);

		expect(response.resolvableAllowFallback).toBe(true);
		expect(response.resolverId).toBe('resolver-1');
	});

	it('throws UnexpectedError with parse cause for invalid payload', () => {
		expect(() =>
			toPublicApiCredentialResponse(
				makeCredential({
					createdAt: 'not-a-date' as unknown as Date,
				}),
			),
		).toThrow(UnexpectedError);

		try {
			toPublicApiCredentialResponse(
				makeCredential({
					createdAt: 'not-a-date' as unknown as Date,
				}),
			);
		} catch (error) {
			expect(error).toBeInstanceOf(UnexpectedError);
			expect(error.message).toBe('Failed to parse credential response');
			expect(error.cause).toBeInstanceOf(ZodError);
		}
	});
});
