import { RuleTester } from '@typescript-eslint/rule-tester';
import { RequirePublicApiControllerRule } from './require-public-api-controller.js';

const ruleTester = new RuleTester();

ruleTester.run('require-public-api-controller', RequirePublicApiControllerRule, {
	valid: [
		// The controller pattern: a class export, no `export =`.
		{
			code: '@PublicApiController("/tags") export class TagsPublicController {}',
			filename: '/repo/packages/cli/src/public-api/v1/controllers/tags.public.controller.ts',
		},
		// Named exports are fine.
		{
			code: 'export const helper = () => {};',
			filename: '/repo/packages/cli/src/public-api/v1/handlers/tags/tags.handler.ts',
		},
	],
	invalid: [
		// The legacy tuple module ends in `export = handlers`.
		{
			code: 'const handlers = {}; export = handlers;',
			filename: '/repo/packages/cli/src/public-api/v1/handlers/tags/tags.handler.ts',
			errors: [{ messageId: 'useController' }],
		},
	],
});
