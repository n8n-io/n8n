import { usesRemovedExpressionFunction } from './expressionDeprecations';

describe('usesRemovedExpressionFunction', () => {
	it('detects $getPairedItem used as a bare reference', () => {
		expect(usesRemovedExpressionFunction('{{ $getPairedItem }}')).toBe(true);
	});

	it('detects $getPairedItem used as a call', () => {
		expect(usesRemovedExpressionFunction('{{ $getPairedItem("Node", null, {}) }}')).toBe(true);
	});

	it('does not flag benign expressions', () => {
		expect(usesRemovedExpressionFunction('{{ $json.foo }}')).toBe(false);
	});

	it('does not flag $getPairedItem inside a string literal', () => {
		expect(usesRemovedExpressionFunction('{{ "$getPairedItem" }}')).toBe(false);
	});
});
