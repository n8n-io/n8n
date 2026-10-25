import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiTreeRule = createRekaUiImportBanRule({
	prefix: 'Tree',
	allowedPath: designSystemComponentPath('v2/components/Tree'),
	messageId: 'noRekaUiTree',
	description:
		'Disallow importing Reka UI tree primitives outside the design-system tree. Use N8nTree2 from @n8n/design-system.',
	replacement: 'N8nTree2',
});
