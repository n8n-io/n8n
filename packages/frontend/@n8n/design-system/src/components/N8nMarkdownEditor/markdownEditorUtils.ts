import type { Content, Editor } from '@tiptap/core';

const emptyEditorContent: Content = {
	type: 'doc',
	content: [{ type: 'paragraph' }],
};

export const getEditorContent = (markdown: string): Content => markdown || emptyEditorContent;

export const setEditorContent = (editor: Editor, markdown: string) => {
	if (markdown) {
		editor.commands.setContent(markdown, {
			contentType: 'markdown',
			emitUpdate: false,
		});

		return;
	}

	editor.commands.setContent(emptyEditorContent, {
		emitUpdate: false,
	});
};

export const isUrl = (value: string) => {
	try {
		const url = new URL(value);

		return ['http:', 'https:', 'mailto:'].includes(url.protocol);
	} catch {
		return false;
	}
};

export const isSelectionInsideNode = (editor: Editor, nodeName: string) => {
	const { $from } = editor.state.selection;

	for (let depth = $from.depth; depth >= 0; depth--) {
		if ($from.node(depth).type.name === nodeName) return true;
	}

	return false;
};

export const copyMarkdown = (editor: Editor, event: ClipboardEvent) => {
	if (!event.clipboardData) return false;

	event.clipboardData.setData('text/plain', editor.getMarkdown());
	event.preventDefault();

	return true;
};

export const pasteMarkdown = (editor: Editor, event: ClipboardEvent) => {
	if (!event.clipboardData) return false;

	const plainText = event.clipboardData.getData('text/plain');

	if (!plainText) return false;

	const pastedText = plainText.trim();
	const { empty } = editor.state.selection;

	if (isSelectionInsideNode(editor, 'codeBlock')) {
		editor.commands.insertContent(plainText);
		event.preventDefault();

		return true;
	}

	if (!empty && isUrl(pastedText)) {
		editor.chain().focus().extendMarkRange('link').setLink({ href: pastedText }).run();
		event.preventDefault();

		return true;
	}

	const command =
		editor.getMarkdown().trim() === '' ? editor.commands.setContent : editor.commands.insertContent;

	command(plainText, {
		contentType: 'markdown',
	});
	event.preventDefault();

	return true;
};
