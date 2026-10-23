import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoElementPlusScrollbarRule } from './no-element-plus-scrollbar.js';

const ruleTester = new RuleTester();

const error = { messageId: 'noElementPlusScrollbar' as const };

ruleTester.run('no-element-plus-scrollbar', NoElementPlusScrollbarRule, {
	valid: [
		{ code: "import { ElSelect, ElMenu } from 'element-plus';" },
		{ code: "import { N8nScrollArea } from '@n8n/design-system';" },
		{ code: "import { ElScrollbar } from 'some-other-pkg';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { ElScrollbar } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'aliased import',
			code: "import { ElScrollbar as Scrollbar } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'type-only import',
			code: "import type { ElScrollbar } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'mixed specifiers — only ElScrollbar is flagged',
			code: "import { ElSelect, ElScrollbar, ElButton } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'deep scrollbar module import',
			code: "import Scrollbar from 'element-plus/es/components/scrollbar';",
			errors: [error],
		},
		{
			name: 'named re-export',
			code: "export { ElScrollbar } from 'element-plus';",
			errors: [error],
		},
	],
});
