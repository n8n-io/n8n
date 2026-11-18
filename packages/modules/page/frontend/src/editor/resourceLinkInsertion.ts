import { parseResourcePath, type PageResourceReference } from '@n8n/api-types';
import type { Editor, Range } from '@tiptap/core';

import { RESOURCE_CHIP_NODE, toResourceChipContent } from './resourceChipNode';

export type ResolveResourceName = (reference: PageResourceReference) => Promise<string | undefined>;

/** Gives the stored link text `name` to the chips of `path` that still show the path. */
function nameUnnamedChips(editor: Editor, path: string, name: string): void {
	const transaction = editor.state.tr;
	editor.state.doc.descendants((node, position) => {
		const isUnnamedChip =
			node.type.name === RESOURCE_CHIP_NODE &&
			node.attrs.href === path &&
			node.attrs.label === path;
		if (isUnnamedChip) {
			transaction.setNodeMarkup(position, undefined, { ...node.attrs, label: name });
		}
	});
	if (transaction.docChanged) {
		editor.view.dispatch(transaction);
	}
}

/** Inserts a chip and a space at the selection, or in place of `range`. */
export function insertResourceChip(
	editor: Editor,
	path: string,
	label: string,
	range?: Range,
): void {
	const content = [toResourceChipContent(path, label), { type: 'text', text: ' ' }];
	editor
		.chain()
		.focus()
		.insertContentAt(range ?? editor.state.selection, content)
		.run();
}

/**
 * Builds the function that links to a resource whose name is not known yet.
 * The chip appears at once with the path as link text.
 * The link text becomes the name of the resource when the server answers.
 */
export function createResourceLinkInserter(resolveName: ResolveResourceName) {
	async function nameChipsWhenResolved(editor: Editor, path: string): Promise<void> {
		const reference = parseResourcePath(path);
		const name = reference ? await resolveName(reference) : undefined;
		if (name !== undefined && !editor.isDestroyed) {
			nameUnnamedChips(editor, path, name);
		}
	}

	return function insertResourceLink(editor: Editor, path: string): void {
		insertResourceChip(editor, path, path);
		void nameChipsWhenResolved(editor, path);
	};
}
