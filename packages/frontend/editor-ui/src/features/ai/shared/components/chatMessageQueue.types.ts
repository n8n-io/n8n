import type { IconName } from '@n8n/design-system';

export interface ChatMessageQueueItem {
	/** Stable ID. */
	id: string;
	/** Message sent by user that is queued. */
	message: string;
	/** Lists attachment file names shown in the attachment card. */
	attachmentNames?: string[];
	/** Shows a status tooltip on the action group and hides the Steer button. */
	notice?: string;
}

export interface ChatMessageQueueSteerAction {
	/** Supplies the translated button text and accessible label. */
	label: string;
	/** Explains the Steer action in the button tooltip. */
	tooltip: string;
	/** Selects the icon shown before the button text. */
	icon: IconName;
}
