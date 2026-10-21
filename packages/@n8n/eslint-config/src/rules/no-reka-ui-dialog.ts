import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

/**
 * Only the design-system dialog wrappers may reach Reka UI dialog primitives.
 * Consumers must use `N8nDialog` or `N8nAlertDialog` from `@n8n/design-system`.
 */
const ALLOWED_PATH = /[/\\]design-system[/\\]src[/\\]components[/\\]N8n(?:Dialog|AlertDialog)[/\\]/;

export const NoRekaUiDialogRule = createRekaUiImportBanRule({
	prefix: ['Dialog', 'AlertDialog'],
	allowedPath: ALLOWED_PATH,
	messageId: 'noRekaUiDialog',
	description:
		'Disallow importing Reka UI dialog primitives outside the design-system dialog components. Use N8nDialog or N8nAlertDialog from @n8n/design-system instead.',
	replacement: ['N8nDialog', 'N8nAlertDialog'],
});
