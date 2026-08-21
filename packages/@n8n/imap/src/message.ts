import type { MessagePart } from './types';

/** Flattens `message.attributes.struct` into the parts that can be fetched on their own. */
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

export const bodyPart = (parts: MessagePart[], subtype: string): MessagePart | undefined =>
	parts.find(
		(part) =>
			part.type?.toUpperCase() === 'TEXT' && part.subtype?.toUpperCase() === subtype.toUpperCase(),
	);

export const attachmentParts = (parts: MessagePart[]): MessagePart[] =>
	parts.filter((part) => part.disposition?.type?.toUpperCase() === 'ATTACHMENT');
