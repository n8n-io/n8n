import type { Editor } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';

import { readPastedResourcePath, type InstanceLocation } from '../resources/resourceUrl';

export type ResourcePasteOptions = {
	getEditor: () => Editor | undefined;
	getInstance: () => InstanceLocation;
	insertResourceLink: (editor: Editor, path: string) => void;
};

/**
 * Builds the paste handler that turns the address of an n8n resource into a link to it.
 * The handler returns `false` for any other paste, so the editor handles it as usual.
 */
export function createResourcePasteHandler({
	getEditor,
	getInstance,
	insertResourceLink,
}: ResourcePasteOptions) {
	return function pasteResourceLink(_view: EditorView, event: ClipboardEvent): boolean {
		const editor = getEditor();
		const text = event.clipboardData?.getData('text/plain') ?? '';
		const path = readPastedResourcePath(text, getInstance());
		const isResourcePaste =
			editor !== undefined && path !== undefined && !editor.isActive('codeBlock');

		if (isResourcePaste) {
			event.preventDefault();
			insertResourceLink(editor, path);
		}
		return isResourcePaste;
	};
}
