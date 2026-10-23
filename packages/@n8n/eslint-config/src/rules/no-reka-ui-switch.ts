import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

const ALLOWED_PATH = /[/\\]design-system[/\\]src[/\\]components[/\\]N8nSwitch[/\\]/;

export const NoRekaUiSwitchRule = createRekaUiImportBanRule({
	prefix: 'Switch',
	allowedPath: ALLOWED_PATH,
	messageId: 'noRekaUiSwitch',
	description:
		'Disallow importing Reka UI switch primitives outside the design-system switch component. Use N8nSwitch from @n8n/design-system instead.',
	replacement: 'N8nSwitch',
});
