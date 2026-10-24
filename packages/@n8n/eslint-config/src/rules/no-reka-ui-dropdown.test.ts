import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRekaUiDropdownRule } from './no-reka-ui-dropdown.js';

const ruleTester = new RuleTester();

const dropdownPath =
	'/repo/packages/frontend/@n8n/design-system/src/components/N8nDropdownMenu/DropdownMenu.vue';
const dropdownTypesWindowsPath =
	'C:\\repo\\packages\\frontend\\@n8n\\design-system\\src\\components\\N8nDropdownMenu\\DropdownMenu.types.ts';

const error = (name: string) => ({
	messageId: 'noRekaUiDropdown' as const,
	data: { name },
});

ruleTester.run('no-reka-ui-dropdown', NoRekaUiDropdownRule, {
	valid: [
		{ code: "import { SelectRoot, DialogRoot, SwitchRoot } from 'reka-ui';" },
		{ code: "import { N8nDropdownMenu } from '@n8n/design-system';" },
		{ code: "import { DropdownMenuRoot } from 'some-other-pkg';" },
		{
			name: 'dropdown import inside N8nDropdownMenu',
			code: "import { DropdownMenuRoot, DropdownMenuContent, DropdownMenuItem } from 'reka-ui';",
			filename: dropdownPath,
		},
		{
			name: 'dropdown type import inside N8nDropdownMenu (windows separators)',
			code: "import type { DropdownMenuContentProps } from 'reka-ui';",
			filename: dropdownTypesWindowsPath,
		},
		{ name: 'namespace import bypass', code: "import * as Reka from 'reka-ui';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { DropdownMenuRoot } from 'reka-ui';",
			errors: [error('DropdownMenuRoot')],
		},
		{
			name: 'aliased import — flagged by the original export name',
			code: "import { DropdownMenuContent as Content } from 'reka-ui';",
			errors: [error('DropdownMenuContent')],
		},
		{
			name: 'multiple dropdown imports',
			code: "import { DropdownMenuItem, DropdownMenuTrigger } from 'reka-ui';",
			errors: [error('DropdownMenuItem'), error('DropdownMenuTrigger')],
		},
		{
			name: 'mixed specifiers — only dropdown primitives are flagged',
			code: "import { SelectRoot, DropdownMenuPortal, DialogRoot } from 'reka-ui';",
			errors: [error('DropdownMenuPortal')],
		},
		{
			name: 'type-only dropdown import',
			code: "import type { DropdownMenuContentProps } from 'reka-ui';",
			errors: [error('DropdownMenuContentProps')],
		},
		{
			name: 'dropdown import outside the design-system wrapper',
			code: "import { DropdownMenuRoot } from 'reka-ui';",
			filename: '/repo/packages/frontend/editor-ui/src/features/execution/ExecutionMenu.vue',
			errors: [error('DropdownMenuRoot')],
		},
		{
			name: 'named re-export',
			code: "export { DropdownMenuItem } from 'reka-ui';",
			errors: [error('DropdownMenuItem')],
		},
	],
});
