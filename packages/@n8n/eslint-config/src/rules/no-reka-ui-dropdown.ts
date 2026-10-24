import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

const ALLOWED_PATH = /[/\\]design-system[/\\]src[/\\]components[/\\]N8nDropdownMenu[/\\]/;

export const NoRekaUiDropdownRule = createRekaUiImportBanRule({
	prefix: 'DropdownMenu',
	allowedPath: ALLOWED_PATH,
	messageId: 'noRekaUiDropdown',
	description:
		'Disallow importing Reka UI dropdown primitives outside the design-system dropdown component. Use N8nDropdownMenu from @n8n/design-system instead.',
	replacement: 'N8nDropdownMenu',
});
