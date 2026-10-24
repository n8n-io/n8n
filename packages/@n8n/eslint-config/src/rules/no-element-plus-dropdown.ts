import { createElementPlusImportBanRule } from './element-plus-import-ban.factory.js';

export const NoElementPlusDropdownRule = createElementPlusImportBanRule({
	names: ['ElDropdown', 'ElDropdownMenu', 'ElDropdownItem'],
	componentPaths: ['dropdown'],
	templateNames: [
		'el-dropdown',
		'ElDropdown',
		'el-dropdown-menu',
		'ElDropdownMenu',
		'el-dropdown-item',
		'ElDropdownItem',
	],
	messageId: 'noElementPlusDropdown',
	description: 'Disallow Element Plus dropdowns. Use N8nDropdownMenu from @n8n/design-system.',
	message: 'Do not use Element Plus `{{name}}`. Use `N8nDropdownMenu` from `@n8n/design-system`.',
});
