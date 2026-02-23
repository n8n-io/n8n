import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoInvalidDataTestidRule } from './no-invalid-data-testid.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: await import('vue-eslint-parser'),
		parserOptions: {
			parser: '@typescript-eslint/parser',
		},
	},
});

ruleTester.run('no-invalid-data-testid', NoInvalidDataTestidRule, {
	valid: [
		// Single-value testid
		{ code: '<template><div data-testid="my-element"></div></template>' },
		// Kebab-case testid
		{ code: '<template><button data-testid="submit-button"></button></template>' },
		// No value
		{ code: '<template><div data-testid></div></template>' },
		// Other attributes with spaces are fine
		{ code: '<template><div class="foo bar"></div></template>' },
	],

	invalid: [
		{
			code: '<template><div data-testid="my element"></div></template>',
			errors: [{ messageId: 'noSpacesInTestId' }],
		},
		{
			code: '<template><div data-testid="my element other"></div></template>',
			errors: [{ messageId: 'noSpacesInTestId' }],
		},
		{
			code: '<template><div data-testid="has\ttab"></div></template>',
			errors: [{ messageId: 'noSpacesInTestId' }],
		},
	],
});
