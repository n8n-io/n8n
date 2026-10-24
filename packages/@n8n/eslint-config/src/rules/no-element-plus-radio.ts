import { createElementPlusImportBanRule } from './element-plus-import-ban.factory.js';

export const NoElementPlusRadioRule = createElementPlusImportBanRule({
	names: ['ElRadio', 'ElRadioGroup', 'ElRadioButton'],
	componentPaths: ['radio'],
	templateNames: [
		'el-radio',
		'ElRadio',
		'el-radio-group',
		'ElRadioGroup',
		'el-radio-button',
		'ElRadioButton',
	],
	messageId: 'noElementPlusRadio',
	description: 'Disallow Element Plus radios. Use N8nRadioGroup from @n8n/design-system.',
	message: 'Do not use Element Plus `{{name}}`. Use `N8nRadioGroup` from `@n8n/design-system`.',
});
