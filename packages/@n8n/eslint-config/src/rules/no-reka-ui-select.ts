import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiSelectRule = createRekaUiImportBanRule({
	prefix: 'Select',
	allowedPath: designSystemComponentPath('v2/components/Select'),
	messageId: 'noRekaUiSelect',
	description:
		'Disallow importing Reka UI select primitives outside the design-system select. Use N8nSelect2 from @n8n/design-system.',
	replacement: 'N8nSelect2',
});
