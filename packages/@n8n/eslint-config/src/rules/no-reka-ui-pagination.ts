import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

/**
 * Only the design-system Pagination wrapper may reach Reka UI pagination primitives.
 * Consumers must use `N8nPagination` from `@n8n/design-system`.
 */
const ALLOWED_PATH = /[/\\]design-system[/\\]src[/\\]components[/\\]N8nPagination[/\\]/;

export const NoRekaUiPaginationRule = createRekaUiImportBanRule({
	prefix: 'Pagination',
	allowedPath: ALLOWED_PATH,
	messageId: 'noRekaUiPagination',
	description:
		'Disallow importing Reka UI pagination primitives outside the N8nPagination component. Use N8nPagination from @n8n/design-system instead.',
	replacement: 'N8nPagination',
});
