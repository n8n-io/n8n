import type { InjectionKey } from 'vue';

export interface AttachmentGroupContext {
	/** Move focus when an attachment starts removal. */
	onRemoveStart: (attachment: HTMLElement) => Promise<void>;
}

export const attachmentGroupContextKey: InjectionKey<AttachmentGroupContext> =
	Symbol('N8nAttachmentGroup');
