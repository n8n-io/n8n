import { expressionWithFirstItem } from '../utils';
import { javascriptLanguage } from '@codemirror/lang-javascript';

describe('completion utils', () => {
	describe('expressionWithFirstItem', () => {
		it('should replace $input.item', () => {
			const source = '$input.item.json.foo.bar';
			const expected = '$input.first().json.foo.bar';
			const tree = javascriptLanguage.parser.parse(source);
			const result = expressionWithFirstItem(tree, source);
			expect(result).toBe(expected);
		});

		it('should replace $input.itemMatching()', () => {
			const source = '$input.itemMatching(4).json.foo.bar';
			const expected = '$input.first().json.foo.bar';
			const tree = javascriptLanguage.parser.parse(source);
			const result = expressionWithFirstItem(tree, source);
			expect(result).toBe(expected);
		});

		it('should replace $("Node Name").itemMatching()', () => {
			const source = '$("Node Name").itemMatching(4).json.foo.bar';
			const expected = '$("Node Name").first().json.foo.bar';
			const tree = javascriptLanguage.parser.parse(source);
			const result = expressionWithFirstItem(tree, source);
			expect(result).toBe(expected);
		});

		it('should replace $("Node Name").item', () => {
			const source = '$("Node Name").item.json.foo.bar';
			const expected = '$("Node Name").first().json.foo.bar';
			const tree = javascriptLanguage.parser.parse(source);
			const result = expressionWithFirstItem(tree, source);
			expect(result).toBe(expected);
		});

		it('should not replace anything in unrelated expressions', () => {
			const source = '$input.first().foo.item.fn($json.item.foo)';
			const expected = '$input.first().foo.item.fn($json.item.foo)';
			const tree = javascriptLanguage.parser.parse(source);
			const result = expressionWithFirstItem(tree, source);
			expect(result).toBe(expected);
		});
	});
});
