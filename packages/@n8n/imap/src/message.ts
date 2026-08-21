import type { MessagePart } from './types';

/**
 * Flattens `message.attributes.struct` into the parts that can be fetched on their own.
 *
 * Code taken from http://stackoverflow.com/questions/25247207/how-to-read-and-save-attachments-using-node-imap
 */
export function getParts(struct: unknown, parts: MessagePart[] = []): MessagePart[] {
	if (!Array.isArray(struct)) return parts;

	for (const entry of struct) {
		if (Array.isArray(entry)) getParts(entry, parts);
		else if (entry !== null && typeof entry === 'object' && 'partID' in entry) {
			parts.push(entry as MessagePart);
		}
	}

	return parts;
}

/** The part holding the message body in the wanted form, `plain` or `html`. */
export const bodyPart = (parts: MessagePart[], subtype: string): MessagePart | undefined =>
	parts.find(
		(part) =>
			part.type?.toUpperCase() === 'TEXT' && part.subtype?.toUpperCase() === subtype.toUpperCase(),
	);

export const attachmentParts = (parts: MessagePart[]): MessagePart[] =>
	parts.filter((part) => part.disposition?.type?.toUpperCase() === 'ATTACHMENT');
