import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

/**
 * Only the design-system context menu may import Reka UI context menu primitives.
 * Consumers must use `N8nContextMenu` from `@n8n/design-system`.
 */
const ALLOWED_PATH = /[/\\]design-system[/\\]src[/\\]components[/\\]N8nContextMenu[/\\]/;

export const NoRekaUiContextMenuRule = createRekaUiImportBanRule({
	prefix: 'ContextMenu',
	allowedPath: ALLOWED_PATH,
	messageId: 'noRekaUiContextMenu',
	description:
		'Disallow importing Reka UI context menu primitives outside the N8nContextMenu component. Use N8nContextMenu from @n8n/design-system instead.',
	replacement: 'N8nContextMenu',
});
