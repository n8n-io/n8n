import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoApplicationErrorRule } from './no-application-error.js';

const ruleTester = new RuleTester();

ruleTester.run('no-application-error', NoApplicationErrorRule, {
	valid: [
		// Importing the approved error classes is fine
		{
			code: 'import { UserError, OperationalError, UnexpectedError } from "n8n-workflow";',
			filename: '/Users/test/project/packages/cli/src/service.ts',
		},
		// An identically named import from an unrelated module is fine
		{
			code: 'import { ApplicationError } from "some-other-lib";',
			filename: '/Users/test/project/packages/cli/src/service.ts',
		},
		// Allowlisted boundaries may import it (e.g. for instanceof recognition)
		{
			code: 'import { ApplicationError } from "n8n-workflow";',
			filename: '/Users/test/project/packages/core/src/errors/error-reporter.ts',
		},
		{
			code: 'import { ApplicationError } from "@n8n/errors";',
			filename: '/Users/test/project/packages/workflow/test/application-error.test.ts',
		},
	],
	invalid: [
		{
			code: 'import { ApplicationError } from "n8n-workflow";',
			filename: '/Users/test/project/packages/cli/src/service.ts',
			errors: [{ messageId: 'noApplicationError' }],
		},
		{
			code: 'import { ApplicationError } from "@n8n/errors";',
			filename: '/Users/test/project/packages/workflow/src/foo.ts',
			errors: [{ messageId: 'noApplicationError' }],
		},
		{
			code: 'import type { ApplicationError } from "@n8n/errors";',
			filename: '/Users/test/project/packages/workflow/src/errors/some.error.ts',
			errors: [{ messageId: 'noApplicationError' }],
		},
		{
			code: 'import { ApplicationError, UserError } from "./errors";',
			filename: '/Users/test/project/packages/workflow/src/bar.ts',
			errors: [{ messageId: 'noApplicationError' }],
		},
	],
});
