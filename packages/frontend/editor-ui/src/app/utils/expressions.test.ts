import { ExpressionError } from 'n8n-workflow';
import {
	completeExpressionSyntax,
	getExpressionErrorMessage,
	getExternalSecretPreview,
	getRuntimeCredentialPreview,
	getRuntimeCredentialReferences,
	isPairedItemNotOnBranchError,
	shouldConvertToExpression,
	removeExpressionPrefix,
	stringifyExpressionResult,
	unwrapExpression,
} from './expressions';
import { executionRetryMessage } from '@/features/execution/executions/executions.utils';

describe('Utils: Expressions', () => {
	describe('isPairedItemNotOnBranchError()', () => {
		it('should return true for a not-on-branch expression error', () => {
			const error = new ExpressionError('error message', { type: 'paired_item_not_on_branch' });
			expect(isPairedItemNotOnBranchError(error)).toBe(true);
		});

		it('should return false for other paired item errors', () => {
			const error = new ExpressionError('error message', { type: 'paired_item_no_connection' });
			expect(isPairedItemNotOnBranchError(error)).toBe(false);
		});

		it('should return false for errors that are not expression errors', () => {
			expect(isPairedItemNotOnBranchError(new Error('error message'))).toBe(false);
		});
	});

	describe('getExpressionErrorMessage()', () => {
		it('should name the node that is on another branch', () => {
			const error = new ExpressionError('error message', {
				type: 'paired_item_not_on_branch',
				functionality: 'pairedItem',
				nodeCause: 'out3',
			});
			expect(getExpressionErrorMessage(error, {})).toBe('‘out3’ is on another branch');
		});
	});

	describe('getRuntimeCredentialReferences()', () => {
		it.each([
			['={{ $runtimeCredentials.tenant_key }}', ['tenant_key']],
			["=Bearer {{ $runtimeCredentials['tenant_key'] }}", ['tenant_key']],
			['={{ $runtimeCredentials.a + $runtimeCredentials.b }}', ['a', 'b']],
			['={{ $runtimeCredentials[$vars.key] }}', [null]],
			['={{ $runtimeCredentials?.tenant_key }}', ['tenant_key']],
			["={{ $runtimeCredentials?.['tenant_key'] }}", ['tenant_key']],
			['={{ $secrets.vault.key }}', []],
			['=$runtimeCredentials.tenant_key outside a block', []],
		])('should read the aliases in "%s"', (expression, expected) => {
			expect(getRuntimeCredentialReferences(expression)).toEqual(expected);
		});
	});

	describe('getRuntimeCredentialPreview()', () => {
		const aliases = ['tenant_key', 'partner_token'];

		it('should defer a known alias to the execution', () => {
			expect(
				getRuntimeCredentialPreview('=Bearer {{ $runtimeCredentials.tenant_key }}', aliases),
			).toEqual({ text: '[runtime value, set during the execution]', exists: true });
		});

		it.each([
			'={{ $runtimeCredentials.unknown }}',
			'={{ $runtimeCredentials.tenant_key + $runtimeCredentials.unknown }}',
		])('should report an alias that no rule defines in "%s"', (expression) => {
			expect(getRuntimeCredentialPreview(expression, aliases)).toEqual({
				text: '[no admin rule defines this runtime value]',
				exists: false,
			});
		});

		it('should not judge a computed alias, which is known only during the execution', () => {
			expect(getRuntimeCredentialPreview('={{ $runtimeCredentials[$vars.key] }}', aliases)).toBe(
				undefined,
			);
		});

		it('should leave expressions without runtime values alone', () => {
			expect(getRuntimeCredentialPreview('={{ $json.id }}', aliases)).toBeUndefined();
		});
	});

	describe('getExternalSecretPreview()', () => {
		const secrets = {
			vault: {
				key: '*********',
				'json/path': '*********',
			},
		};

		it.each([
			'={{ $secrets.vault.key }}',
			"={{ JSON.parse($secrets.vault['json/path']).password }}",
			'={{ JSON.parse($secrets . vault ["json/path"]).password }}',
			'={{ $secrets.vault.key + $secrets.vault["json/path"] }}',
			'={{ $secrets[\'vault\']["key"] }}',
		])('should defer an existing secret in "%s"', (expression) => {
			expect(getExternalSecretPreview(expression, secrets)).toEqual({
				text: '[evaluated during execution]',
				exists: true,
			});
		});

		it.each([
			'={{ $secrets.invalidVault.key }}',
			'={{ $secrets.vault.nameWithTypo }}',
			'={{ $secrets.vault.key + $secrets.vault.nameWithTypo }}',
			'={{ $secrets.invalidVault[$vars.key] }}',
		])('should report a secret that does not exist in "%s"', (expression) => {
			expect(getExternalSecretPreview(expression, secrets)).toEqual({
				text: '[secret not found]',
				exists: false,
			});
		});

		it.each([
			'={{ $secrets.vault.key.nameWithTypo }}',
			'={{ $secrets.vault.key?.nameWithTypo }}',
			'={{ $secrets[provider].key }}',
			'={{ $secrets.vault[$vars.secret] }}',
		])('should not judge a secret path it cannot read in "%s"', (expression) => {
			expect(getExternalSecretPreview(expression, secrets)).toBeUndefined();
		});

		it.each(['={{ $json.password }}', 'plain $secrets.vault.key'])(
			'should ignore non-expression secret references in "%s"',
			(expression) => {
				expect(getExternalSecretPreview(expression, secrets)).toBeUndefined();
			},
		);

		it.each([undefined, {}, { vault: {} }])(
			'should not claim a missing secret when metadata is %s',
			(unavailableSecrets) => {
				expect(
					getExternalSecretPreview('={{ $secrets.vault.key }}', unavailableSecrets),
				).toBeUndefined();
			},
		);
	});

	describe('stringifyExpressionResult()', () => {
		it('should return empty string for non-critical errors', () => {
			expect(
				stringifyExpressionResult(
					{
						ok: false,
						error: new ExpressionError('error message', { type: 'no_execution_data' }),
					},
					{},
				),
			).toEqual('');
		});

		it('should return an error message for critical errors', () => {
			expect(
				stringifyExpressionResult(
					{
						ok: false,
						error: new ExpressionError('error message', { type: 'no_input_connection' }),
					},
					{},
				),
			).toEqual('[ERROR: No input connected]');
		});

		it('should name the node when it is not on the item branch', () => {
			expect(
				stringifyExpressionResult(
					{
						ok: false,
						error: new ExpressionError('error message', {
							type: 'paired_item_not_on_branch',
							functionality: 'pairedItem',
							nodeCause: 'out2',
						}),
					},
					{},
				),
			).toEqual('[ERROR: ‘out2’ is on another branch]');
		});

		it('should return empty string when result is null', () => {
			expect(stringifyExpressionResult({ ok: true, result: null }, {})).toEqual('');
		});

		it('should return NaN when result is NaN', () => {
			expect(stringifyExpressionResult({ ok: true, result: NaN }, {})).toEqual('NaN');
		});

		it('should return [empty] message when result is empty string', () => {
			expect(stringifyExpressionResult({ ok: true, result: '' }, {})).toEqual('[empty]');
		});

		it('should return the result when it is a string', () => {
			expect(stringifyExpressionResult({ ok: true, result: 'foo' }, {})).toEqual('foo');
		});
	});

	describe('unwrapExpression', () => {
		it('should remove the brackets around an expression', () => {
			expect(unwrapExpression('{{ $json.foo }}')).toBe('$json.foo');
		});
	});

	describe('removeExpressionPrefix', () => {
		it.each([
			['=expression', 'expression'],
			['notAnExpression', 'notAnExpression'],
			[undefined, ''],
			[4, 4],
		])('turns "%s" into "%s"', (input, output) => {
			expect(removeExpressionPrefix(input)).toBe(output);
		});
	});

	describe('completeExpressionSyntax', () => {
		it('should complete expressions with "{{ " at the end', () => {
			expect(completeExpressionSyntax('test {{ ')).toBe('=test {{  }}');
		});

		it('should complete expressions with "{{$" at the end', () => {
			expect(completeExpressionSyntax('test {{$')).toBe('=test {{ $ }}');
		});

		it('should not modify already valid expressions', () => {
			expect(completeExpressionSyntax('=valid expression')).toBe('=valid expression');
		});

		it('should return non-string values unchanged', () => {
			expect(completeExpressionSyntax(123)).toBe(123);
			expect(completeExpressionSyntax(true)).toBe(true);
			expect(completeExpressionSyntax(null)).toBe(null);
		});

		it('should return unchanged value if special editor type', () => {
			expect(completeExpressionSyntax('test {{ ', true)).toBe('test {{ ');
		});
	});

	describe('shouldConvertToExpression', () => {
		it('should return true for strings with expression syntax', () => {
			expect(shouldConvertToExpression('test {{ value }}')).toBe(true);
		});

		it('should return false for strings without expression syntax', () => {
			expect(shouldConvertToExpression('just a string')).toBe(false);
		});

		it('should return false for strings starting with "="', () => {
			expect(shouldConvertToExpression('=expression {{ value }}')).toBe(false);
		});

		it('should return false for non-string values', () => {
			expect(shouldConvertToExpression(123)).toBe(false);
			expect(shouldConvertToExpression(true)).toBe(false);
			expect(shouldConvertToExpression(null)).toBe(false);
		});

		it('should return false if special editor type', () => {
			expect(shouldConvertToExpression('test {{ value }}', true)).toBe(false);
		});
	});

	describe('executionRetryMessage', () => {
		it('returns success message for success status', () => {
			expect(executionRetryMessage('success')).toEqual({
				title: 'Retry successful',
				type: 'success',
			});
		});

		it('returns info message for waiting status', () => {
			expect(executionRetryMessage('waiting')).toEqual({
				title: 'Retry waiting',
				type: 'info',
			});
		});

		it('returns info message for running status', () => {
			expect(executionRetryMessage('running')).toEqual({
				title: 'Retry running',
				type: 'info',
			});
		});

		it('returns error message for crashed status', () => {
			expect(executionRetryMessage('crashed')).toEqual({
				title: 'Retry crashed',
				type: 'error',
			});
		});

		it('returns error message for canceled status', () => {
			expect(executionRetryMessage('canceled')).toEqual({
				title: 'Retry canceled',
				type: 'error',
			});
		});

		it('returns error message for error status', () => {
			expect(executionRetryMessage('error')).toEqual({
				title: 'Retry unsuccessful',
				type: 'error',
			});
		});

		it('returns undefined for an unknown status', () => {
			expect(executionRetryMessage('unknown')).toBeUndefined();
		});
	});
});
