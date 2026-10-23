import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { mergeCredentialData, type CredentialArrayMergeMode } from '../credential-data-merge';

const EXPRESSION = '={{ $vars.apiKey }}';
const OTHER_EXPRESSION = '={{ $vars.otherKey }}';

describe('mergeCredentialData', () => {
	describe.each<CredentialArrayMergeMode>(['merge-by-index', 'keep-existing'])(
		'with arrays "%s"',
		(arrays) => {
			it('replaces an existing plain value with an incoming expression', () => {
				const result = mergeCredentialData({
					existing: { apiKey: 'secret' },
					incoming: { apiKey: EXPRESSION },
					arrays,
				});

				expect(result).toEqual({ apiKey: EXPRESSION });
			});

			it('replaces an existing expression with an incoming expression', () => {
				const result = mergeCredentialData({
					existing: { apiKey: OTHER_EXPRESSION },
					incoming: { apiKey: EXPRESSION },
					arrays,
				});

				expect(result).toEqual({ apiKey: EXPRESSION });
			});

			it('keeps existing-only keys, including oauthTokenData', () => {
				const oauthTokenData = { access_token: 'token', refresh_token: 'refresh' };

				const result = mergeCredentialData({
					existing: { clientId: 'id', oauthTokenData },
					incoming: { clientSecret: EXPRESSION },
					arrays,
				});

				expect(result).toEqual({ clientId: 'id', clientSecret: EXPRESSION, oauthTokenData });
			});

			it('keeps an existing-only key that shares a name with an inherited property', () => {
				const result = mergeCredentialData({
					existing: { toString: 'secret', apiKey: 'key' },
					incoming: { apiKey: EXPRESSION },
					arrays,
				});

				expect(result).toEqual({ toString: 'secret', apiKey: EXPRESSION });
			});

			it('does not read an inherited property as the existing value', () => {
				const result = mergeCredentialData({
					existing: {},
					incoming: { toString: '' },
					arrays,
				});

				expect(result).toEqual({ toString: '' });
			});

			it('adds an incoming-only key', () => {
				const result = mergeCredentialData({
					existing: { apiKey: 'secret' },
					incoming: { domain: EXPRESSION },
					arrays,
				});

				expect(result).toEqual({ apiKey: 'secret', domain: EXPRESSION });
			});

			it('merges nested objects key by key', () => {
				const result = mergeCredentialData({
					existing: { auth: { user: 'admin', password: 'secret', realm: 'local' } },
					incoming: { auth: { user: EXPRESSION, password: '' } },
					arrays,
				});

				expect(result).toEqual({ auth: { user: EXPRESSION, password: 'secret', realm: 'local' } });
			});

			it('replaces an existing non-object value with an incoming object', () => {
				const result = mergeCredentialData({
					existing: { config: 'plain' },
					incoming: { config: { host: EXPRESSION } },
					arrays,
				});

				expect(result).toEqual({ config: { host: EXPRESSION } });
			});

			it('keeps the existing value when the incoming value is an empty string', () => {
				const result = mergeCredentialData({
					existing: { apiKey: 'secret' },
					incoming: { apiKey: '' },
					arrays,
				});

				expect(result).toEqual({ apiKey: 'secret' });
			});

			it('keeps an empty string when the existing data has no value for the key', () => {
				const result = mergeCredentialData({
					existing: {},
					incoming: { apiKey: '' },
					arrays,
				});

				expect(result).toEqual({ apiKey: '' });
			});

			it('takes incoming numbers and booleans', () => {
				const result = mergeCredentialData({
					existing: { port: 3000, ssl: false },
					incoming: { port: 5432, ssl: true },
					arrays,
				});

				expect(result).toEqual({ port: 5432, ssl: true });
			});

			it('keeps the existing value when the incoming value is null', () => {
				const result = mergeCredentialData({
					existing: { apiKey: 'secret' },
					incoming: { apiKey: null } as unknown as ICredentialDataDecryptedObject,
					arrays,
				});

				expect(result).toEqual({ apiKey: 'secret' });
			});

			it('does not mutate the inputs', () => {
				const existing: ICredentialDataDecryptedObject = {
					apiKey: 'secret',
					auth: { user: 'admin' },
					headers: [{ name: 'X-Key', value: 'one' }],
				};
				const incoming: ICredentialDataDecryptedObject = {
					apiKey: EXPRESSION,
					auth: { user: EXPRESSION },
					headers: [{ value: OTHER_EXPRESSION }],
				};
				const existingBefore = structuredClone(existing);
				const incomingBefore = structuredClone(incoming);

				mergeCredentialData({ existing, incoming, arrays });

				expect(existing).toEqual(existingBefore);
				expect(incoming).toEqual(incomingBefore);
			});
		},
	);

	describe('with arrays "merge-by-index"', () => {
		const arrays = 'merge-by-index';

		it('merges arrays of equal length by index', () => {
			const result = mergeCredentialData({
				existing: {
					headers: [
						{ name: 'X-One', value: 'secret-one' },
						{ name: 'X-Two', value: 'secret-two' },
					],
				},
				incoming: { headers: [{ name: '', value: EXPRESSION }, { value: '' }] },
				arrays,
			});

			expect(result).toEqual({
				headers: [
					{ name: 'X-One', value: EXPRESSION },
					{ name: 'X-Two', value: 'secret-two' },
				],
			});
		});

		it('replaces an array of different length with the incoming array', () => {
			const incomingHeaders = [{ value: EXPRESSION }];

			const result = mergeCredentialData({
				existing: {
					headers: [
						{ name: 'X-One', value: 'secret-one' },
						{ name: 'X-Two', value: 'secret-two' },
					],
				},
				incoming: { headers: incomingHeaders },
				arrays,
			});

			expect(result).toEqual({ headers: incomingHeaders });
		});

		it('adds an incoming array when the existing data has none', () => {
			const result = mergeCredentialData({
				existing: {},
				incoming: { scopes: [EXPRESSION] },
				arrays,
			});

			expect(result).toEqual({ scopes: [EXPRESSION] });
		});

		it('applies the mode to arrays nested in objects inside arrays', () => {
			const result = mergeCredentialData({
				existing: { groups: [{ tags: ['a', 'b'] }] },
				incoming: { groups: [{ tags: [EXPRESSION, ''] }] },
				arrays,
			});

			expect(result).toEqual({ groups: [{ tags: [EXPRESSION, 'b'] }] });
		});

		it('adds a new incoming object that merges to no fields', () => {
			const result = mergeCredentialData({
				existing: {},
				incoming: { config: { host: null } },
				arrays,
			});

			expect(result).toEqual({ config: {} });
		});
	});

	describe('with arrays "keep-existing"', () => {
		const arrays = 'keep-existing';

		it('keeps an existing array of equal length as it is', () => {
			const existingHeaders = [
				{ name: 'X-One', value: 'secret-one' },
				{ name: 'X-Two', value: 'secret-two' },
			];

			const result = mergeCredentialData({
				existing: { headers: existingHeaders },
				incoming: { headers: [{ value: EXPRESSION }, { value: OTHER_EXPRESSION }] },
				arrays,
			});

			expect(result).toEqual({ headers: existingHeaders });
		});

		it('keeps an existing array of different length as it is', () => {
			const existingHeaders = [
				{ name: 'X-One', value: 'secret-one' },
				{ name: 'X-Two', value: 'secret-two' },
			];

			const result = mergeCredentialData({
				existing: { headers: existingHeaders },
				incoming: { headers: [{ value: EXPRESSION }] },
				arrays,
			});

			expect(result).toEqual({ headers: existingHeaders });
		});

		it('does not add an incoming array when the existing data has no value for the key', () => {
			const result = mergeCredentialData({
				existing: { apiKey: 'secret' },
				incoming: { headers: [{ value: EXPRESSION }] },
				arrays,
			});

			expect(result).toEqual({ apiKey: 'secret' });
			expect(result).not.toHaveProperty('headers');
		});

		it('keeps an array nested in an object', () => {
			const result = mergeCredentialData({
				existing: { config: { host: 'db.local', hosts: ['a', 'b'] } },
				incoming: { config: { host: EXPRESSION, hosts: [EXPRESSION] } },
				arrays,
			});

			expect(result).toEqual({ config: { host: EXPRESSION, hosts: ['a', 'b'] } });
		});

		it('does not add an array nested in a new incoming object', () => {
			const result = mergeCredentialData({
				existing: {},
				incoming: { config: { host: EXPRESSION, hosts: [EXPRESSION] } },
				arrays,
			});

			expect(result).toEqual({ config: { host: EXPRESSION } });
		});

		it('does not add a new incoming object that holds only arrays', () => {
			const result = mergeCredentialData({
				existing: { apiKey: 'secret' },
				incoming: { config: { headers: [EXPRESSION], nested: { hosts: [EXPRESSION] } } },
				arrays,
			});

			expect(result).toEqual({ apiKey: 'secret' });
		});

		it('keeps an existing object when the incoming object holds only arrays', () => {
			const result = mergeCredentialData({
				existing: { config: {} },
				incoming: { config: { headers: [EXPRESSION] } },
				arrays,
			});

			expect(result).toEqual({ config: {} });
		});
	});
});
