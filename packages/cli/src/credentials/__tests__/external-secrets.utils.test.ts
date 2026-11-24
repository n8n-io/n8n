import {
	extractProviderKeysFromCredentialData,
	extractProviderKeysFromExpression,
	getExternalSecretExpressionPaths,
} from '../external-secrets.utils';

describe('External secrets utils', () => {
	describe('extractProviderKeysFromExpression', () => {
		it('extracts single provider from dot notation', () => {
			expect(extractProviderKeysFromExpression('={{ $secrets.vault.myKey }}')).toEqual(['vault']);
		});

		it('extracts single provider from bracket notation', () => {
			expect(extractProviderKeysFromExpression("={{ $secrets['aws']['secret'] }}")).toEqual([
				'aws',
			]);
		});

		it('extracts single provider from mixed notation with bracket secret access', () => {
			expect(extractProviderKeysFromExpression("={{ $secrets.vault['secret-name'] }}")).toEqual([
				'vault',
			]);
		});

		it('extracts single provider from mixed notation with bracket provider access', () => {
			expect(
				extractProviderKeysFromExpression('={{ $secrets["awsSecretsManager"].secret }}'),
			).toEqual(['awsSecretsManager']);
		});

		it('extracts multiple providers from same expression', () => {
			const result = extractProviderKeysFromExpression(
				'={{ $secrets.vault.myKey + ":" + $secrets.aws.otherKey }}',
			);
			expect(result.sort()).toEqual(['aws', 'vault']);
		});

		it('deduplicates repeated provider keys', () => {
			expect(
				extractProviderKeysFromExpression('={{ $secrets.vault.key1 + $secrets.vault.key2 }}'),
			).toEqual(['vault']);
		});

		it('does not extract partial provider keys from malformed dot notation', () => {
			expect(
				extractProviderKeysFromExpression(
					'={{ $secrets.vault_invalid.key + $secrets.aws.secret }}',
				),
			).toEqual(['aws']);
		});

		it('returns empty array when no $secrets references found', () => {
			expect(extractProviderKeysFromExpression('={{ $variables.myVar }}')).toEqual([]);
		});

		it('returns empty array for plain text', () => {
			expect(extractProviderKeysFromExpression('some plain text')).toEqual([]);
		});

		it('returns empty array when $secrets is not inside expression braces', () => {
			expect(extractProviderKeysFromExpression('$secrets.vault.key')).toEqual([]);
			expect(
				extractProviderKeysFromExpression('text with $secrets.vault.key but no braces'),
			).toEqual([]);
		});

		it('only extracts providers from inside expression braces', () => {
			expect(
				extractProviderKeysFromExpression('$secrets.vault.key and {{ $secrets.aws.secret }}'),
			).toEqual(['aws']);
		});

		it('extracts providers from multiple expression blocks', () => {
			const expression = 'hello {{ $secrets.vault.key }} world {{ $secrets.aws.secret }}';
			const result = extractProviderKeysFromExpression(expression);
			expect(result.sort()).toEqual(['aws', 'vault']);
		});

		describe('whitespace and newline between $secrets and accessor', () => {
			it.each([
				['space before dot', '={{ $secrets .vault.key }}'],
				['multiple spaces before dot', '={{ $secrets   .vault.key }}'],
				['tab before dot', '={{ $secrets\t.vault.key }}'],
				['newline before dot', '={{ $secrets\n.vault.key }}'],
				['space and newline before dot', '={{ $secrets \n.vault.key }}'],
				['space before bracket', "={{ $secrets ['vault']['key'] }}"],
				['multiple spaces before bracket', "={{ $secrets   ['vault']['key'] }}"],
				['newline before bracket', "={{ $secrets\n['vault']['key'] }}"],
			])('extracts the provider key with %s', (_label, expression) => {
				expect(extractProviderKeysFromExpression(expression)).toEqual(['vault']);
			});
		});
	});

	describe('getExternalSecretExpressionPaths', () => {
		it('returns all paths that contain external secret expressions', () => {
			const data = {
				a: 'plain',
				b: '={{ $secrets.vault.key }}',
				nested: {
					c: "={{ $secrets['aws']['token'] }}",
				},
				arr: [{ d: '={{ $secrets.azure.secret }}' }],
			};

			expect(getExternalSecretExpressionPaths(data).sort()).toEqual(['arr[0].d', 'b', 'nested.c']);
		});

		describe('non-literal $secrets references', () => {
			it.each([
				['space before dot', '={{ $secrets .vault.key }}'],
				['tab before dot', '={{ $secrets\t.vault.key }}'],
				['newline before dot', '={{ $secrets\n.vault.key }}'],
				['multiple spaces before bracket', "={{ $secrets   ['vault']['key'] }}"],
				['newline before bracket', "={{ $secrets\n['vault']['key'] }}"],
				['optional chaining', '={{ $secrets?.vault?.key }}'],
				['parentheses', '={{ ($secrets).vault.key }}'],
				['comma operator', '={{ (0, $secrets).vault.key }}'],
				['array wrap', '={{ [$secrets].pop().vault.key }}'],
				['inline comment', '={{ ( /* x */ $secrets ).vault.key }}'],
				['Object() wrap', '={{ Object($secrets).vault.key }}'],
				['nullish coalescing', '={{ ($secrets ?? {}).vault.key }}'],
				['template-literal key', '={{ $secrets [`vault`].key }}'],
				['concatenated key', '={{ $secrets ["va".concat("ult")].key }}'],
			])('detects the reference with %s', (_label, expression) => {
				expect(getExternalSecretExpressionPaths({ apiKey: expression })).toEqual(['apiKey']);
			});
		});
	});

	describe('extractProviderKeysFromCredentialData', () => {
		it('extracts unique provider keys across nested credential data', () => {
			const data = {
				apiKey: '={{ $secrets.vault.key1 }}',
				nested: {
					token: "={{ $secrets['aws']['token'] }}",
					duplicate: '={{ $secrets.vault.key2 }}',
				},
			};

			expect([...extractProviderKeysFromCredentialData(data)].sort()).toEqual(['aws', 'vault']);
		});
	});
});
