import { designSystemComponentPath } from './design-system-component-path.js';
import { createElementPlusImportBanRule } from './element-plus-import-ban.factory.js';

export const NoElementPlusMenuRule = createElementPlusImportBanRule({
	names: ['ElMenu', 'ElSubMenu', 'ElMenuItem'],
	componentPaths: ['menu', 'sub-menu'],
	templateNames: ['el-menu', 'ElMenu', 'el-sub-menu', 'ElSubMenu', 'el-menu-item', 'ElMenuItem'],
	allowedPath: designSystemComponentPath('components/N8nNavigationDropdown'),
	messageId: 'noElementPlusMenu',
	description:
		'Disallow Element Plus menus outside the design-system navigation dropdown. Use N8nNavigationDropdown from @n8n/design-system.',
	message:
		'Do not use Element Plus `{{name}}`. Use `N8nNavigationDropdown` from `@n8n/design-system`.',
});
