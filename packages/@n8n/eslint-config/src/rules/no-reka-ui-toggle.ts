import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiToggleRule = createRekaUiImportBanRule({
	prefix: 'Toggle',
	allowedPath: designSystemComponentPath('components/N8nToggle', 'components/N8nToggleGroup'),
	messageId: 'noRekaUiToggle',
	description:
		'Disallow importing Reka UI toggle primitives outside the design-system toggles. Use N8nToggle or N8nToggleGroup from @n8n/design-system.',
	replacement: ['N8nToggle', 'N8nToggleGroup'],
});
