import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiCheckboxRule = createRekaUiImportBanRule({
	prefix: 'Checkbox',
	allowedPath: designSystemComponentPath('v2/components/Checkbox'),
	messageId: 'noRekaUiCheckbox',
	description:
		'Disallow importing Reka UI checkbox primitives outside the design-system checkbox. Use N8nCheckbox from @n8n/design-system.',
	replacement: 'N8nCheckbox',
});
