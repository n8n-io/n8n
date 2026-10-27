import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRawEnumRule } from './no-raw-enum.js';

const ruleTester = new RuleTester();

ruleTester.run('no-raw-enum', NoRawEnumRule, {
	valid: [
		'type Status = "ready" | "running";',
		'const enum Status { Ready, Running }',
		{
			code: 'declare const enum Status { Ready, Running }',
			filename: 'types.d.ts',
		},
	],
	invalid: [
		{
			code: 'enum Status { Ready, Running }',
			errors: [{ messageId: 'noRawEnum', line: 1, column: 1 }],
		},
		{
			code: 'enum Status { Ready = "ready", Running = "running" }',
			errors: [{ messageId: 'noRawEnum', line: 1, column: 1 }],
		},
		{
			code: 'enum Status {}',
			errors: [{ messageId: 'noRawEnum', line: 1, column: 1 }],
		},
		{
			code: 'export enum Status { Ready }',
			errors: [{ messageId: 'noRawEnum', line: 1, column: 8 }],
		},
		{
			code: 'declare enum Status { Ready }',
			filename: 'types.d.ts',
			errors: [{ messageId: 'noRawEnum', line: 1, column: 1 }],
		},
		{
			code: 'declare namespace Api { enum Status { Ready } }',
			filename: 'types.d.ts',
			errors: [{ messageId: 'noRawEnum', line: 1, column: 25 }],
		},
	],
});
