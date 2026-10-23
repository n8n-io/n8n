import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

const ALLOWED_PATH =
	/[/\\]design-system[/\\]src[/\\]components[/\\]N8n(?:AnimatedCollapsibleContent|CollapsiblePanel|AiActivityStep|AiActivityStepGroup)[/\\]/;

export const NoRekaUiCollapsibleRule = createRekaUiImportBanRule({
	prefix: 'Collapsible',
	allowedPath: ALLOWED_PATH,
	messageId: 'noRekaUiCollapsible',
	description:
		'Disallow importing Reka UI collapsible primitives outside the design-system collapsible components. Use N8nAnimatedCollapsibleContent or N8nCollapsiblePanel from @n8n/design-system instead.',
	replacement: ['N8nAnimatedCollapsibleContent', 'N8nCollapsiblePanel'],
});
