import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

const ALLOWED_PATH = /[/\\]design-system[/\\]src[/\\]components[/\\]N8nScrollArea[/\\]/;

export const NoRekaUiScrollAreaRule = createRekaUiImportBanRule({
	prefix: 'ScrollArea',
	allowedPath: ALLOWED_PATH,
	messageId: 'noRekaUiScrollArea',
	description:
		'Disallow importing Reka UI scroll area primitives outside the design-system scroll area. Use N8nScrollArea from @n8n/design-system instead.',
	replacement: 'N8nScrollArea',
});
