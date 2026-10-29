import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoElementPlusMenuRule } from './no-element-plus-menu.js';

const ruleTester = new RuleTester();

const error = { messageId: 'noElementPlusMenu' as const };

ruleTester.run('no-element-plus-menu', NoElementPlusMenuRule, {
	valid: [
		{ code: "import { ElSelect, ElDropdown } from 'element-plus';" },
		{ code: "import { N8nNavigationDropdown } from '@n8n/design-system';" },
		{ code: "import { ElMenu } from 'some-other-pkg';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { ElMenu } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'submenu and item imports',
			code: "import { ElSubMenu, ElMenuItem } from 'element-plus';",
			errors: [error, error],
		},
		{
			name: 'aliased import',
			code: "import { ElMenu as Menu } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'type-only import',
			code: "import type { ElMenuItem } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'mixed specifiers — only menu exports are flagged',
			code: "import { ElSelect, ElMenu, ElButton } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'deep menu module import',
			code: "import Menu from 'element-plus/es/components/menu';",
			errors: [error],
		},
		{
			name: 'named re-export',
			code: "export { ElSubMenu } from 'element-plus';",
			errors: [error],
		},
	],
});
