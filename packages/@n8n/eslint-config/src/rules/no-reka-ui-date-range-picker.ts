import { designSystemComponentPath } from './design-system-component-path.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

export const NoRekaUiDateRangePickerRule = createRekaUiImportBanRule({
	prefix: 'DateRangePicker',
	allowedPath: designSystemComponentPath('components/DateRangePicker'),
	messageId: 'noRekaUiDateRangePicker',
	description:
		'Disallow importing Reka UI date-range picker primitives outside the design-system date-range picker. Use N8nDateRangePicker from @n8n/design-system.',
	replacement: 'N8nDateRangePicker',
});
