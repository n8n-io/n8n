import { createElementPlusImportBanRule } from './element-plus-import-ban.factory.js';

export const NoElementPlusCollapseTransitionRule = createElementPlusImportBanRule({
	names: ['ElCollapseTransition'],
	componentPaths: ['collapse-transition'],
	templateNames: ['el-collapse-transition', 'ElCollapseTransition'],
	messageId: 'noElementPlusCollapseTransition',
	description:
		'Disallow Element Plus collapse transitions. Use N8nAnimatedCollapsibleContent from @n8n/design-system.',
	message:
		'Do not use Element Plus `{{name}}`. Use `N8nAnimatedCollapsibleContent` from `@n8n/design-system`.',
});
