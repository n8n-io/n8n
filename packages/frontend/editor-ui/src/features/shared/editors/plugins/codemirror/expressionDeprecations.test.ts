import { usesDeprecatedExpressionFunction } from './expressionDeprecations';

describe('usesDeprecatedExpressionFunction', () => {
	it('detects $getPairedItem used as a bare reference', () => {
		expect(usesDeprecatedExpressionFunction('{{ $getPairedItem }}')).toBe(true);
	});

	it('detects $getPairedItem used as a call', () => {
		expect(usesDeprecatedExpressionFunction('{{ $getPairedItem("Node", null, {}) }}')).toBe(true);
	});

	it('does not flag benign expressions', () => {
		expect(usesDeprecatedExpressionFunction('{{ $json.foo }}')).toBe(false);
	});

	it('does not flag $getPairedItem inside a string literal', () => {
		expect(usesDeprecatedExpressionFunction('{{ "$getPairedItem" }}')).toBe(false);
	});
});
