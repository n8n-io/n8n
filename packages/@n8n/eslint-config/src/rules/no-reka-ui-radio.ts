import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

/**
 * N8nRadioGroup is the radio control. N8nSegmentControl is a radio group
 * with a segmented appearance, so it is the other allowed caller.
 */
const ALLOWED_PATH =
	/[/\\]design-system[/\\]src[/\\]components[/\\]N8n(?:RadioGroup|SegmentControl)[/\\]/;

export const NoRekaUiRadioRule = createRekaUiImportBanRule({
	prefix: 'RadioGroup',
	allowedPath: ALLOWED_PATH,
	messageId: 'noRekaUiRadio',
	description:
		'Disallow importing Reka UI radio primitives outside the design-system radio components. Use N8nRadioGroup from @n8n/design-system instead.',
	replacement: 'N8nRadioGroup',
});
