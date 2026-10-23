import { createElementPlusImportBanRule } from './element-plus-import-ban.factory.js';

export const NoElementPlusScrollbarRule = createElementPlusImportBanRule({
	names: ['ElScrollbar'],
	componentPaths: ['scrollbar'],
	templateNames: ['el-scrollbar', 'ElScrollbar'],
	messageId: 'noElementPlusScrollbar',
	description: 'Disallow Element Plus scrollbars. Use N8nScrollArea from @n8n/design-system.',
	message: 'Do not use Element Plus `{{name}}`. Use `N8nScrollArea` from `@n8n/design-system`.',
});
