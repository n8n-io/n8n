import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRekaUiDialogRule } from './no-reka-ui-dialog.js';

const ruleTester = new RuleTester();

const dialogPath = '/repo/packages/frontend/@n8n/design-system/src/components/N8nDialog/Dialog.vue';
const alertDialogWindowsPath =
	'C:\\repo\\packages\\frontend\\@n8n\\design-system\\src\\components\\N8nAlertDialog\\AlertDialog.vue';

const error = (name: string) => ({
	messageId: 'noRekaUiDialog' as const,
	data: { name },
});

ruleTester.run('no-reka-ui-dialog', NoRekaUiDialogRule, {
	valid: [
		{ code: "import { SelectRoot, PaginationRoot } from 'reka-ui';" },
		{ code: "import { N8nDialog, N8nAlertDialog } from '@n8n/design-system';" },
		{ code: "import { DialogRoot } from 'some-other-pkg';" },
		{
			name: 'dialog import inside N8nDialog',
			code: "import { DialogRoot, DialogPortal } from 'reka-ui';",
			filename: dialogPath,
		},
		{
			name: 'dialog import inside N8nAlertDialog (windows separators)',
			code: "import { DialogRoot, DialogPortal } from 'reka-ui';",
			filename: alertDialogWindowsPath,
		},
		{ name: 'namespace import bypass', code: "import * as Reka from 'reka-ui';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { DialogRoot } from 'reka-ui';",
			errors: [error('DialogRoot')],
		},
		{
			name: 'aliased import — flagged by the original export name',
			code: "import { DialogContent as Content } from 'reka-ui';",
			errors: [error('DialogContent')],
		},
		{
			name: 'multiple dialog imports',
			code: "import { DialogTitle, DialogDescription } from 'reka-ui';",
			errors: [error('DialogTitle'), error('DialogDescription')],
		},
		{
			name: 'mixed specifiers — only dialog primitives are flagged',
			code: "import { SelectRoot, DialogPortal, PaginationRoot } from 'reka-ui';",
			errors: [error('DialogPortal')],
		},
		{
			name: 'type-only dialog import',
			code: "import type { DialogContentProps } from 'reka-ui';",
			errors: [error('DialogContentProps')],
		},
		{
			name: 'alert dialog primitive',
			code: "import { AlertDialogRoot } from 'reka-ui';",
			errors: [error('AlertDialogRoot')],
		},
		{
			name: 'dialog import outside the design-system wrappers',
			code: "import { DialogRoot } from 'reka-ui';",
			filename: '/repo/packages/frontend/editor-ui/src/features/roles/RoleDialog.vue',
			errors: [error('DialogRoot')],
		},
		{
			name: 'named re-export',
			code: "export { DialogClose } from 'reka-ui';",
			errors: [error('DialogClose')],
		},
	],
});
