import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiComboboxRule = createRekaUiImportBanRule({
	prefix: 'Combobox',
	allowedPath: designSystemComponentPath('v2/components/Combobox'),
	messageId: 'noRekaUiCombobox',
	description:
		'Disallow importing Reka UI combobox primitives outside the design-system combobox. Use N8nCombobox2 from @n8n/design-system.',
	replacement: 'N8nCombobox2',
});
