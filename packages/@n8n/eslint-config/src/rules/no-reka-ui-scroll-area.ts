import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiScrollAreaRule = createRekaUiImportBanRule({
	prefix: 'ScrollArea',
	allowedPath: designSystemComponentPath('components/N8nScrollArea'),
	messageId: 'noRekaUiScrollArea',
	description:
		'Disallow importing Reka UI scroll-area primitives outside the design-system scroll area. Use N8nScrollArea from @n8n/design-system.',
	replacement: 'N8nScrollArea',
});
