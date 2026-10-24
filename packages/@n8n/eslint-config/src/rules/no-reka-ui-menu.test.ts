import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRekaUiMenuRule } from './no-reka-ui-menu.js';

const ruleTester = new RuleTester();

const menuPath =
	'/repo/packages/frontend/@n8n/design-system/src/components/N8nNavigationDropdown/NavigationDropdown.vue';
const menuWindowsPath =
	'C:\\repo\\packages\\frontend\\@n8n\\design-system\\src\\components\\N8nNavigationDropdown\\NavigationDropdown.vue';

const error = (name: string) => ({
	messageId: 'noRekaUiMenu' as const,
	data: { name },
});

ruleTester.run('no-reka-ui-menu', NoRekaUiMenuRule, {
	valid: [
		{ code: "import { DropdownMenuRoot, SelectRoot, DialogRoot } from 'reka-ui';" },
		{ code: "import { N8nNavigationDropdown } from '@n8n/design-system';" },
		{ code: "import { NavigationMenuRoot } from 'some-other-pkg';" },
		{
			name: 'navigation menu import inside N8nNavigationDropdown',
			code: "import { NavigationMenuRoot, NavigationMenuItem, NavigationMenuLink } from 'reka-ui';",
			filename: menuPath,
		},
		{
			name: 'navigation menu import inside N8nNavigationDropdown (windows separators)',
			code: "import type { NavigationMenuRootProps } from 'reka-ui';",
			filename: menuWindowsPath,
		},
		{ name: 'namespace import bypass', code: "import * as Reka from 'reka-ui';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { NavigationMenuRoot } from 'reka-ui';",
			errors: [error('NavigationMenuRoot')],
		},
		{
			name: 'aliased import — flagged by the original export name',
			code: "import { NavigationMenuItem as Item } from 'reka-ui';",
			errors: [error('NavigationMenuItem')],
		},
		{
			name: 'multiple menu imports',
			code: "import { NavigationMenuList, NavigationMenuTrigger } from 'reka-ui';",
			errors: [error('NavigationMenuList'), error('NavigationMenuTrigger')],
		},
		{
			name: 'mixed specifiers — only navigation menu primitives are flagged',
			code: "import { DropdownMenuRoot, NavigationMenuContent, DialogRoot } from 'reka-ui';",
			errors: [error('NavigationMenuContent')],
		},
		{
			name: 'type-only menu import',
			code: "import type { NavigationMenuRootProps } from 'reka-ui';",
			errors: [error('NavigationMenuRootProps')],
		},
		{
			name: 'menu import outside the design-system wrapper',
			code: "import { NavigationMenuRoot } from 'reka-ui';",
			filename: '/repo/packages/frontend/editor-ui/src/app/components/SidebarMenu.vue',
			errors: [error('NavigationMenuRoot')],
		},
		{
			name: 'named re-export',
			code: "export { NavigationMenuLink } from 'reka-ui';",
			errors: [error('NavigationMenuLink')],
		},
	],
});
