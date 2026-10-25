import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiRadioGroupRule = createRekaUiImportBanRule({
	prefix: 'RadioGroup',
	allowedPath: designSystemComponentPath(
		'components/N8nRadioGroup',
		'components/N8nSegmentControl',
	),
	messageId: 'noRekaUiRadioGroup',
	description:
		'Disallow importing Reka UI radio-group primitives outside the design-system radio controls. Use N8nRadioGroup or N8nSegmentControl from @n8n/design-system.',
	replacement: ['N8nRadioGroup', 'N8nSegmentControl'],
});
