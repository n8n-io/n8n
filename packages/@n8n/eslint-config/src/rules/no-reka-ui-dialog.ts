import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiDialogRule = createRekaUiImportBanRule({
	prefix: 'Dialog',
	allowedPath: designSystemComponentPath('components/N8nDialog', 'components/N8nAlertDialog'),
	messageId: 'noRekaUiDialog',
	description:
		'Disallow importing Reka UI dialog primitives outside the design-system dialogs. Use N8nDialog or N8nAlertDialog from @n8n/design-system.',
	replacement: ['N8nDialog', 'N8nAlertDialog'],
});
