import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

// LLM headings can come with "## " or different case, so compare loosely.
const normalize = (text: string) =>
	text
		.replace(/^#+\s*/, '')
		.trim()
		.toLowerCase();

/**
 * Finds the top-level section that starts at the heading with this text.
 * The section ends before the next heading of the same or a higher level, or at the doc end.
 */
export function findSectionRange(
	doc: ProseMirrorNode,
	heading: string,
): { from: number; to: number } | null {
	const target = normalize(heading);
	let from = -1;
	let level = 0;
	let pos = 0;

	for (let i = 0; i < doc.childCount; i++) {
		const node = doc.child(i);
		if (node.type.name === 'heading') {
			const nodeLevel = Number(node.attrs.level);
			if (from === -1) {
				if (normalize(node.textContent) === target) {
					from = pos;
					level = nodeLevel;
				}
			} else if (nodeLevel <= level) {
				return { from, to: pos };
			}
		}
		pos += node.nodeSize;
	}

	return from === -1 ? null : { from, to: doc.content.size };
}
