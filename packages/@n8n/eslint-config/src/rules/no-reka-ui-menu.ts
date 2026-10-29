import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

const ALLOWED_PATH = /[/\\]design-system[/\\]src[/\\]components[/\\]N8nNavigationDropdown[/\\]/;

export const NoRekaUiMenuRule = createRekaUiImportBanRule({
	prefix: 'NavigationMenu',
	allowedPath: ALLOWED_PATH,
	messageId: 'noRekaUiMenu',
	description:
		'Disallow importing Reka UI navigation menu primitives outside the design-system navigation dropdown. Use N8nNavigationDropdown from @n8n/design-system instead.',
	replacement: 'N8nNavigationDropdown',
});
