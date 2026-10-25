import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiTooltipRule = createRekaUiImportBanRule({
	prefix: 'Tooltip',
	allowedPath: designSystemComponentPath('components/N8nTooltip'),
	messageId: 'noRekaUiTooltip',
	description:
		'Disallow importing Reka UI tooltip primitives outside the design-system tooltip. Use N8nTooltip from @n8n/design-system.',
	replacement: 'N8nTooltip',
});
