import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiPopoverRule = createRekaUiImportBanRule({
	prefix: 'Popover',
	allowedPath: designSystemComponentPath('components/N8nPopover', 'components/DateRangePicker'),
	messageId: 'noRekaUiPopover',
	description:
		'Disallow importing Reka UI popover primitives outside the design-system popover. Use N8nPopover from @n8n/design-system.',
	replacement: 'N8nPopover',
});
