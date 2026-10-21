import { createElementPlusImportBanRule } from './element-plus-import-ban.factory.js';

export const NoElementPlusDialogRule = createElementPlusImportBanRule({
	names: ['ElDialog'],
	componentPaths: ['dialog'],
	templateNames: ['el-dialog', 'ElDialog'],
	messageId: 'noElementPlusDialog',
	description:
		'Disallow Element Plus dialogs. Use N8nDialog or N8nAlertDialog from @n8n/design-system.',
	message:
		'Do not use Element Plus `ElDialog`. Use `N8nDialog` or `N8nAlertDialog` from `@n8n/design-system`.',
});
