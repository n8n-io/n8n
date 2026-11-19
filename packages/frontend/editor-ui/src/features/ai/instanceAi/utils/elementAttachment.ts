import type { InstanceAiElementAttachment } from '@n8n/api-types';

const ELEMENT_LABEL_TEXT_LIMIT = 24;

export function elementAttachmentLabel(element: InstanceAiElementAttachment): string {
	const text = element.text?.replace(/\s+/g, ' ').trim();
	if (!text) return element.tagName;
	const shortText =
		text.length > ELEMENT_LABEL_TEXT_LIMIT ? `${text.slice(0, ELEMENT_LABEL_TEXT_LIMIT)}...` : text;
	return `${element.tagName}: "${shortText}"`;
}
