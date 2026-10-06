import type { InstanceAiFileAttachment } from '@n8n/api-types';

/** Turns a base64 composer attachment back into a file for the Agents chat upload. */
export function fileAttachmentToFile(attachment: InstanceAiFileAttachment): File {
	const binary = atob(attachment.data);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new File([bytes], attachment.fileName ?? 'unnamed', { type: attachment.mimeType });
}
