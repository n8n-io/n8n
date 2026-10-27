import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoOnLeaderTakeoverRule } from './no-on-leader-takeover.js';

const ruleTester = new RuleTester();

ruleTester.run('no-on-leader-takeover', NoOnLeaderTakeoverRule, {
	valid: [
		{ code: "import { OnShutdown, OnLeaderStepdown } from '@n8n/decorators';" },
		{ code: "import { SystemTask } from '@n8n/decorators';" },
		{ code: "import { OnLeaderTakeover } from './my-local-decorators';" },
		{ code: "import * as decorators from './my-local-decorators';" },
	],
	invalid: [
		{
			code: "import { OnLeaderTakeover } from '@n8n/decorators';",
			errors: [{ messageId: 'useSystemTask' }],
		},
		{
			code: "import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';",
			errors: [{ messageId: 'useSystemTask' }],
		},
		{
			code: "import * as decorators from '@n8n/decorators';",
			errors: [{ messageId: 'noNamespaceImport' }],
		},
	],
});
