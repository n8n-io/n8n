import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoBaseErrorImportFromWorkflowRule } from './no-base-error-import-from-workflow.js';

const ruleTester = new RuleTester();
const filename = '/Users/test/project/packages/cli/src/service.ts';

ruleTester.run('no-base-error-import-from-workflow', NoBaseErrorImportFromWorkflowRule, {
	valid: [
		{
			code: "import { UserError, type UserErrorOptions } from '@n8n/errors';",
			filename,
		},
		{
			code: "import { NodeOperationError, type INode } from 'n8n-workflow';",
			filename,
		},
		{
			code: "import { UserError } from './errors';",
			filename,
		},
		{
			code: "import * as workflow from 'n8n-workflow';",
			filename,
		},
		// The package that re-exports the errors
		{
			code: "export { UserError } from 'n8n-workflow';",
			filename: '/Users/test/project/packages/workflow/src/index.ts',
		},
		// Community-node tooling depends only on n8n-workflow
		{
			code: "import { UserError } from 'n8n-workflow';",
			filename: '/Users/test/project/packages/@n8n/node-cli/src/template/node.ts',
		},
		{
			code: "import { OperationalError } from 'n8n-workflow';",
			filename: 'C:\\project\\packages\\@n8n\\create-node\\src\\index.ts',
		},
	],
	invalid: [
		{
			code: "import { UserError } from 'n8n-workflow';",
			filename,
			errors: [{ messageId: 'importFromErrors', data: { name: 'UserError' } }],
		},
		{
			code: "import { NodeOperationError, OperationalError as OpError, UnexpectedError } from 'n8n-workflow';",
			filename,
			errors: [
				{ messageId: 'importFromErrors', data: { name: 'OperationalError' } },
				{ messageId: 'importFromErrors', data: { name: 'UnexpectedError' } },
			],
		},
		{
			code: "import type { BaseError, BaseErrorOptions } from 'n8n-workflow';",
			filename,
			errors: [
				{ messageId: 'importFromErrors', data: { name: 'BaseError' } },
				{ messageId: 'importFromErrors', data: { name: 'BaseErrorOptions' } },
			],
		},
		{
			code: "import { type UserErrorOptions, type OperationalErrorOptions, type UnexpectedErrorOptions } from 'n8n-workflow';",
			filename,
			errors: [
				{ messageId: 'importFromErrors', data: { name: 'UserErrorOptions' } },
				{ messageId: 'importFromErrors', data: { name: 'OperationalErrorOptions' } },
				{ messageId: 'importFromErrors', data: { name: 'UnexpectedErrorOptions' } },
			],
		},
		{
			code: "export { UserError } from 'n8n-workflow';",
			filename,
			errors: [{ messageId: 'importFromErrors', data: { name: 'UserError' } }],
		},
		{
			code: "import { UserError } from 'n8n-workflow';",
			filename: '/Users/test/project/packages/frontend/editor-ui/src/app/utils.ts',
			errors: [{ messageId: 'importFromErrors', data: { name: 'UserError' } }],
		},
	],
});
