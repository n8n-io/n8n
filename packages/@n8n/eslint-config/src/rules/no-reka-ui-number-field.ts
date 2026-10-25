import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiNumberFieldRule = createRekaUiImportBanRule({
	prefix: 'NumberField',
	allowedPath: designSystemComponentPath('components/N8nInputNumber'),
	messageId: 'noRekaUiNumberField',
	description:
		'Disallow importing Reka UI number-field primitives outside the design-system number input. Use N8nInputNumber from @n8n/design-system.',
	replacement: 'N8nInputNumber',
});
