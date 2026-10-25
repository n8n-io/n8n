import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

/**
 * Only the design-system pagination wrapper may import Reka UI pagination primitives.
 * Callers use `N8nPagination` from `@n8n/design-system`.
 */
export const NoRekaUiPaginationRule = createRekaUiImportBanRule({
	prefix: 'Pagination',
	allowedPath: designSystemComponentPath('components/N8nPagination'),
	messageId: 'noRekaUiPagination',
	description:
		'Disallow importing Reka UI pagination primitives outside the N8nPagination component. Use N8nPagination from @n8n/design-system instead.',
	replacement: 'N8nPagination',
});
