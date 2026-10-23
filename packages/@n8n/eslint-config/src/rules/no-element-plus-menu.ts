import { createElementPlusImportBanRule } from './element-plus-import-ban.factory.js';

export const NoElementPlusMenuRule = createElementPlusImportBanRule({
	names: ['ElMenu', 'ElSubMenu', 'ElMenuItem'],
	componentPaths: ['menu'],
	templateNames: ['el-menu', 'ElMenu', 'el-sub-menu', 'ElSubMenu', 'el-menu-item', 'ElMenuItem'],
	messageId: 'noElementPlusMenu',
	description: 'Disallow Element Plus menus. Use N8nNavigationDropdown from @n8n/design-system.',
	message:
		'Do not use Element Plus `{{name}}`. Use `N8nNavigationDropdown` from `@n8n/design-system`.',
});
