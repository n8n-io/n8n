import type { Editor } from '@tiptap/core';
import { fireEvent, render, waitFor } from '@testing-library/vue';

import N8nMarkdownEditor from './MarkdownEditor.vue';

describe('components/N8nMarkdownEditorToolbar', () => {
	it('renders the toolbar from toggle groups by default', async () => {
		const wrapper = render(N8nMarkdownEditor, {
			props: {
				modelValue: 'Content',
			},
		});

		await waitFor(() => expect(wrapper.getByTestId('markdown-editor-toolbar')).toBeInTheDocument());

		/** NOTE(@heymynameisrob): These are the defaults we always want.  */
		expect(wrapper.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
		expect(wrapper.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
		expect(wrapper.getByRole('button', { name: 'Strikethrough' })).toBeInTheDocument();
		expect(wrapper.getByRole('button', { name: 'Text' })).toBeInTheDocument();
		expect(wrapper.getByRole('button', { name: 'Bullet list' })).toBeInTheDocument();
		expect(wrapper.getByRole('button', { name: 'Task list' })).toBeInTheDocument();
		expect(wrapper.getByRole('button', { name: 'Code block' })).toBeInTheDocument();
		expect(wrapper.getByRole('button', { name: 'Blockquote' })).toBeInTheDocument();
		expect(wrapper.getByRole('button', { name: 'Link' })).toBeInTheDocument();
		expect(wrapper.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
		expect(wrapper.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
	});

	it('hides the toolbar when showToolbar is never', () => {
		const wrapper = render(N8nMarkdownEditor, {
			props: {
				modelValue: 'Content',
				showToolbar: 'never',
			},
		});

		expect(wrapper.queryByTestId('markdown-editor-toolbar')).not.toBeInTheDocument();
	});

	it('renders the toolbar when showToolbar is always', async () => {
		const wrapper = render(N8nMarkdownEditor, {
			props: {
				modelValue: 'Content',
				showToolbar: 'always',
			},
		});

		await waitFor(() => expect(wrapper.getByTestId('markdown-editor-toolbar')).toBeInTheDocument());
		expect(wrapper.getByRole('button', { name: 'Text' })).toBeInTheDocument();
	});

	it('disables toolbar controls when editor is disabled', async () => {
		const wrapper = render(N8nMarkdownEditor, {
			props: {
				modelValue: 'Content',
				disabled: true,
			},
		});

		await waitFor(() => expect(wrapper.getByTestId('markdown-editor-toolbar')).toBeInTheDocument());

		expect(wrapper.getByRole('button', { name: 'Bold' })).toBeDisabled();
		expect(wrapper.getByRole('button', { name: 'Undo' })).toBeDisabled();
	});
});

describe('components/N8nMarkdownEditor', () => {
	const getEditorElement = (container: Element) =>
		container.querySelector<HTMLElement>('[data-test-id="n8n-markdown-editor-content"]');

	const renderEditor = async (modelValue: string) => {
		let editor: Editor | undefined;
		const wrapper = render(N8nMarkdownEditor, {
			props: {
				modelValue,
				showToolbar: 'never',
				onReady: (readyEditor: Editor) => {
					editor = readyEditor;
				},
			},
		});

		await waitFor(() => expect(getEditorElement(wrapper.container)).toBeInTheDocument());
		await waitFor(() => expect(editor).toBeDefined());

		return { wrapper, editor: editor as Editor };
	};

	it('renders the editor', async () => {
		const wrapper = render(N8nMarkdownEditor, {
			props: {
				modelValue: 'Content',
			},
		});

		await waitFor(() => expect(getEditorElement(wrapper.container)).toBeInTheDocument());
		expect(getEditorElement(wrapper.container)).toHaveTextContent('Content');
	});

	it('renders markdown content as editor nodes', async () => {
		const { wrapper, editor } = await renderEditor(
			[
				'# Heading',
				'',
				'This has **bold**, *italic*, ~~struck~~, and [a link](https://n8n.io).',
				'',
				'- First item',
				'- Second item',
				'',
				'> Quoted text',
				'',
				'```ts',
				'const value = 1;',
				'```',
			].join('\n'),
		);
		const editorElement = getEditorElement(wrapper.container)!;

		expect(editorElement.querySelector('h1')).toHaveTextContent('Heading');
		expect(editorElement.querySelector('strong')).toHaveTextContent('bold');
		expect(editorElement.querySelector('em')).toHaveTextContent('italic');
		expect(editorElement.querySelector('s')).toHaveTextContent('struck');
		expect(editorElement.querySelector('a')).toHaveAttribute('href', 'https://n8n.io');
		expect(editorElement.querySelectorAll('li')).toHaveLength(2);
		expect(editorElement.querySelector('blockquote')).toHaveTextContent('Quoted text');
		expect(editorElement.querySelector('pre code')).toHaveTextContent('const value = 1;');
		expect(editor.getMarkdown()).toContain('**bold**');
	});

	it('shows placeholder before the editor is focused', async () => {
		const wrapper = render(N8nMarkdownEditor, {
			props: {
				modelValue: '',
				placeholder: 'Write instructions...',
				showToolbar: 'never',
			},
		});

		await waitFor(() =>
			expect(
				wrapper.container.querySelector('[data-placeholder="Write instructions..."]'),
			).toBeTruthy(),
		);
	});

	it('disables the editor when disabled', async () => {
		const wrapper = render(N8nMarkdownEditor, {
			props: {
				modelValue: 'Content',
				disabled: true,
			},
		});

		await waitFor(() => expect(getEditorElement(wrapper.container)).toBeInTheDocument());
		expect(getEditorElement(wrapper.container)).toHaveAttribute('contenteditable', 'false');
	});

	it('sets the editor to readonly', async () => {
		const wrapper = render(N8nMarkdownEditor, {
			props: {
				modelValue: 'Content',
				readonly: true,
			},
		});

		await waitFor(() => expect(getEditorElement(wrapper.container)).toBeInTheDocument());
		expect(getEditorElement(wrapper.container)).toHaveAttribute('contenteditable', 'false');
	});

	it('copies editor content as markdown', async () => {
		const { wrapper } = await renderEditor(
			['# Heading', '', '**Bold text**', '', '- List item 1', '- List item 2'].join('\n'),
		);
		const textbox = getEditorElement(wrapper.container) as HTMLElement;
		const range = document.createRange();
		const selection = window.getSelection();
		const clipboardData = {
			setData: vi.fn(),
			getData: vi.fn(),
			clearData: vi.fn(),
		};
		const copyEvent = new Event('copy', { bubbles: true, cancelable: true });

		range.selectNodeContents(textbox);
		selection?.removeAllRanges();
		selection?.addRange(range);
		Object.defineProperty(copyEvent, 'clipboardData', {
			value: clipboardData,
		});

		await fireEvent(textbox, copyEvent);

		expect(clipboardData.setData).toHaveBeenCalledWith(
			'text/plain',
			'# Heading\n\n**Bold text**\n\n- List item 1\n- List item 2',
		);
	});

	it('pastes markdown content into the editor', async () => {
		const { wrapper, editor } = await renderEditor('');
		const textbox = getEditorElement(wrapper.container) as HTMLElement;
		const markdownContent = [
			'# Heading',
			'',
			'**Bold text**',
			'',
			'- List item 1',
			'- List item 2',
		].join('\n');

		await fireEvent.paste(textbox, {
			clipboardData: {
				getData: (type: string) => (type === 'text/plain' ? markdownContent : ''),
			},
		});

		await waitFor(() => expect(textbox).toHaveTextContent('Heading'));
		expect(textbox.querySelector('h1')).toHaveTextContent('Heading');
		expect(textbox.querySelector('strong')).toHaveTextContent('Bold text');
		expect(textbox.querySelectorAll('li')).toHaveLength(2);
		expect(editor.getMarkdown().trimEnd()).toBe(markdownContent);
		expect((wrapper.emitted('update:modelValue') as Array<[string]>).at(-1)?.[0].trimEnd()).toBe(
			markdownContent,
		);
	});
});
