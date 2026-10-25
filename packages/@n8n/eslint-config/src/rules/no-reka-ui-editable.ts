import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiEditableRule = createRekaUiImportBanRule({
	prefix: 'Editable',
	allowedPath: designSystemComponentPath('components/N8nInlineTextEdit'),
	messageId: 'noRekaUiEditable',
	description:
		'Disallow importing Reka UI editable primitives outside the design-system inline text edit. Use N8nInlineTextEdit from @n8n/design-system.',
	replacement: 'N8nInlineTextEdit',
});
