import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoUselessCatchThrowRule } from './no-useless-catch-throw.js';

const ruleTester = new RuleTester();

ruleTester.run('no-useless-catch-throw', NoUselessCatchThrowRule, {
	valid: [
		{
			code: 'try { foo(); } catch (e) { console.error(e); }',
		},
		{
			code: 'try { foo(); } catch (e) { throw new Error("Custom error"); }',
		},
	],
	invalid: [
		{
			code: `
try {
	// Some comment
	if (foo) {
		bar();
	}
} catch (e) {
	throw e;
}`,
			errors: [{ messageId: 'noUselessCatchThrow' }],
			output: `
// Some comment
if (foo) {
	bar();
}`,
		},
	],
});
