import { selectCredentialDataForExport } from '../credential-export-policy';

// Decrypted JSON can carry nulls at runtime even though CredentialInformation excludes them.
const dataThunk = (data: Record<string, unknown>) => vi.fn().mockResolvedValue(data);

describe('selectCredentialDataForExport', () => {
	describe('expression-values-only', () => {
		it('keeps expression strings and drops literal siblings', async () => {
			const result = await selectCredentialDataForExport(
				'expression-values-only',
				dataThunk({
					host: 'db.internal',
					port: 5432,
					ssl: true,
					empty: '',
					missing: null,
					user: '={{ $vars.dbUser }}',
					password: '={{ $secrets.db.pw }}',
				}),
			);

			expect(result).toEqual({
				user: '={{ $vars.dbUser }}',
				password: '={{ $secrets.db.pw }}',
			});
		});

		it('drops a literal that starts with = but is not an expression', async () => {
			const result = await selectCredentialDataForExport(
				'expression-values-only',
				dataThunk({ apiKey: '=foo', other: '={value}', broken: '={{}}' }),
			);

			expect(result).toBeUndefined();
		});

		it('keeps a literal matching the expression pattern — the accepted boundary of the regex', async () => {
			const result = await selectCredentialDataForExport(
				'expression-values-only',
				dataThunk({ formula: '=SUM({{A1}})' }),
			);

			expect(result).toEqual({ formula: '=SUM({{A1}})' });
		});

		it('recurses into objects and prunes literal keys, keeping surviving expressions', async () => {
			const result = await selectCredentialDataForExport(
				'expression-values-only',
				dataThunk({
					nested: { deep: { token: '={{ $secrets.t }}', literal: 'x' } },
					allExpressions: ['={{ $secrets.a }}', '={{ $secrets.b }}'],
					allLiteral: { a: 'x', b: [1, 2] },
				}),
			);

			expect(result).toEqual({
				nested: { deep: { token: '={{ $secrets.t }}' } },
				allExpressions: ['={{ $secrets.a }}', '={{ $secrets.b }}'],
			});
		});

		it('drops an array whose entry mixes a literal field with an expression', async () => {
			const result = await selectCredentialDataForExport(
				'expression-values-only',
				dataThunk({
					headers: [{ name: 'Authorization', value: '={{ $secrets.h }}' }],
					token: '={{ $secrets.t }}',
				}),
			);

			expect(result).toEqual({ token: '={{ $secrets.t }}' });
		});

		it('omits an array when any entry filters out, so surviving entries never shift position', async () => {
			const result = await selectCredentialDataForExport(
				'expression-values-only',
				dataThunk({
					keys: ['literal-key', '={{ $secrets.k }}'],
					allExpressions: ['={{ $vars.a }}', '={{ $vars.b }}'],
				}),
			);

			expect(result).toEqual({ allExpressions: ['={{ $vars.a }}', '={{ $vars.b }}'] });
		});

		it('drops oauthTokenData at any depth', async () => {
			const result = await selectCredentialDataForExport(
				'expression-values-only',
				dataThunk({
					oauthTokenData: { access_token: '={{ $secrets.fake }}' },
					nested: {
						oauthTokenData: { refresh_token: '={{ $secrets.fake }}' },
						ok: '={{ $vars.x }}',
					},
				}),
			);

			expect(result).toEqual({ nested: { ok: '={{ $vars.x }}' } });
		});

		it('returns undefined for all-literal data, so the data key is omitted', async () => {
			const result = await selectCredentialDataForExport(
				'expression-values-only',
				dataThunk({ user: 'admin', password: 'hunter2' }),
			);

			expect(result).toBeUndefined();
		});
	});

	describe('no-values', () => {
		it('returns undefined without decrypting', async () => {
			const thunk = dataThunk({ password: '={{ $secrets.db.pw }}' });

			const result = await selectCredentialDataForExport('no-values', thunk);

			expect(result).toBeUndefined();
			expect(thunk).not.toHaveBeenCalled();
		});
	});
});
