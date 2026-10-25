import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiTagsInputRule = createRekaUiImportBanRule({
	prefix: 'TagsInput',
	allowedPath: designSystemComponentPath('v2/components/TagsInput'),
	messageId: 'noRekaUiTagsInput',
	description:
		'Disallow importing Reka UI tags-input primitives outside the design-system tags input. Use N8nTagsInput2 from @n8n/design-system.',
	replacement: 'N8nTagsInput2',
});
