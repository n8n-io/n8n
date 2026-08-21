import type { MessageStructureObject } from 'imapflow';

/** imapflow leaves `part` unset on the root of a single-part message. */
const partIDOf = (node: MessageStructureObject) => node.part ?? '1';

const comparePartIDs = (a: string, b: string) => {
	const left = a.split('.');
	const right = b.split('.');

	for (let i = 0; i < Math.max(left.length, right.length); i++) {
		const difference = Number(left[i] ?? 0) - Number(right[i] ?? 0);
		if (difference !== 0) return difference;
	}
	return 0;
};

/**
 * The parts a client can FETCH, in canonical part-number order — an order the server assigned,
 * so it holds however the structure was walked.
 *
 * `message/rfc822` is a leaf; its encapsulated message hangs off `childNodes` but is only ever
 * downloaded whole.
 */
const fetchableParts = (structure: MessageStructureObject): MessageStructureObject[] => {
	const collect = (node: MessageStructureObject): MessageStructureObject[] => {
		const [type = '', subtype = ''] = (node.type ?? '').split('/');

		if (type === 'multipart') return (node.childNodes ?? []).flatMap(collect);

		// a leaf without a subtype is a malformed multipart, which has no part of its own to fetch
		return subtype ? [node] : [];
	};

	return collect(structure).sort((a, b) => comparePartIDs(partIDOf(a), partIDOf(b)));
};

/** The part holding the `text/<subtype>` body, or undefined when the message has none. */
export function bodyPartID(structure: MessageStructureObject, subtype: string): string | undefined {
	const wanted = `text/${subtype.toLowerCase()}`;
	const part = fetchableParts(structure).find((node) => node.type?.toLowerCase() === wanted);

	return part && partIDOf(part);
}

export function attachmentPartIDs(structure: MessageStructureObject): string[] {
	return fetchableParts(structure)
		.filter((node) => node.disposition?.toLowerCase() === 'attachment')
		.map(partIDOf);
}
