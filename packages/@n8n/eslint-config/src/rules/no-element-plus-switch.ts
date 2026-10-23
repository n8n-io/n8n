import { createElementPlusImportBanRule } from './element-plus-import-ban.factory.js';

export const NoElementPlusSwitchRule = createElementPlusImportBanRule({
	names: ['ElSwitch'],
	componentPaths: ['switch'],
	templateNames: ['el-switch', 'ElSwitch'],
	messageId: 'noElementPlusSwitch',
	description: 'Disallow Element Plus switches. Use N8nSwitch from @n8n/design-system.',
	message: 'Do not use Element Plus `{{name}}`. Use `N8nSwitch` from `@n8n/design-system`.',
});
