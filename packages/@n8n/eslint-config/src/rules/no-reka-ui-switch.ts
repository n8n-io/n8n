import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiSwitchRule = createRekaUiImportBanRule({
	prefix: 'Switch',
	allowedPath: designSystemComponentPath('components/N8nSwitch'),
	messageId: 'noRekaUiSwitch',
	description:
		'Disallow importing Reka UI switch primitives outside the design-system switch. Use N8nSwitch from @n8n/design-system.',
	replacement: 'N8nSwitch',
});
