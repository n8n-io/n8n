import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoElementPlusDialogRule } from './no-element-plus-dialog.js';

const ruleTester = new RuleTester();

const error = { messageId: 'noElementPlusDialog' as const };

ruleTester.run('no-element-plus-dialog', NoElementPlusDialogRule, {
	valid: [
		{ code: "import { ElSelect, ElOption } from 'element-plus';" },
		{ code: "import { ElMessageBox } from 'element-plus';" },
		{ code: "import { N8nDialog } from '@n8n/design-system';" },
		{ code: "import { ElDialog } from 'some-other-pkg';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { ElDialog } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'aliased import',
			code: "import { ElDialog as Dialog } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'type-only import',
			code: "import type { ElDialog } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'mixed specifiers — only ElDialog is flagged',
			code: "import { ElSelect, ElDialog, ElButton } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'deep dialog module import',
			code: "import Dialog from 'element-plus/es/components/dialog';",
			errors: [error],
		},
		{
			name: 'named re-export',
			code: "export { ElDialog } from 'element-plus';",
			errors: [error],
		},
	],
});
