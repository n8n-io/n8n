import { createEventBus } from 'n8n-design-system/utils';

export interface HtmlEditorEventBusEvents {
	/** Command to format the content in the HtmlEditor */
	'format-html': never;
}

export const htmlEditorEventBus = createEventBus<HtmlEditorEventBusEvents>();
