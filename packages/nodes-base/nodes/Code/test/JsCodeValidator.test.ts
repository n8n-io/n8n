import { validateNoDisallowedMethodsInRunForEach } from '../JsCodeValidator';

describe('JsCodeValidator', () => {
	describe('validateNoDisallowedMethodsInRunForEach', () => {
		it('should not throw error if disallow method is used within single line comments', () => {
			const code = [
				"// Add a new field called 'myNewField' to the JSON of the item",
				'$input.item.json.myNewField = 1;',
				' // const xxx = $input.all()',
				'return $input.item;',
			].join('\n');

			expect(() => validateNoDisallowedMethodsInRunForEach(code, 0)).not.toThrow();
		});

		it('should not throw error if disallow method is used in single multi line comments', () => {
			const code = [
				"// Add a new field called 'myNewField' to the JSON of the item",
				'$input.item.json.myNewField = 1;',
				'/** const xxx = $input.all()*/',
				'return $input.item;',
			].join('\n');

			expect(() => validateNoDisallowedMethodsInRunForEach(code, 0)).not.toThrow();
		});

		it('should not throw error if disallow method is used within multi line comments', () => {
			const code = [
				"// Add a new field called 'myNewField' to the JSON of the item",
				'$input.item.json.myNewField = 1;',
				'/**',
				'*const xxx = $input.all()',
				'*/',
				'return $input.item;',
			].join('\n');

			expect(() => validateNoDisallowedMethodsInRunForEach(code, 0)).not.toThrow();
		});

		it('should throw error if disallow method is used', () => {
			const code = [
				"// Add a new field called 'myNewField' to the JSON of the item",
				'$input.item.json.myNewField = 1;',
				'const xxx = $input.all()',
				'return $input.item;',
			].join('\n');

			expect(() => validateNoDisallowedMethodsInRunForEach(code, 0)).toThrow();
		});
	});
});
