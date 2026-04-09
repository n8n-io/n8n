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
