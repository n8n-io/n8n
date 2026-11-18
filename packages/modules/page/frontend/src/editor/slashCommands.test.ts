import { N8nMarkdownEditor } from '@n8n/design-system';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import type { Editor } from '@tiptap/core';

import { createPageEditorExtensions } from './pageEditorExtensions';
import {
	DEFAULT_SLASH_COMMANDS,
	filterSlashCommands,
	insertMarkdownAtSelection,
	type SlashCommand,
} from './slashCommands';
import { createTestRouter } from '../__tests__/router';
import type { ResourceSearchResult } from '../resources/resource.api';

vi.mock('../resources/resource.api', () => ({
	createRestResourceFetchers: () => ({
		workflow: vi.fn().mockResolvedValue({ name: 'Sync orders', nodes: [] }),
		credential: vi.fn(),
		dataTable: vi.fn(),
		page: vi.fn(),
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost/rest', pushRef: 'test' } }),
}));

vi.mock('@tiptap/vue-3/menus', () => ({
	// A stub map is keyed by component name.
	// eslint-disable-next-line @typescript-eslint/naming-convention
	BubbleMenu: { name: 'BubbleMenu', template: '<div><slot /></div>' },
}));

const renderMarkdownEditor = createComponentRenderer(N8nMarkdownEditor);

const EMPTY_RECT = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0 };

/** jsdom has no layout. The editor measures a text range when it scrolls to the selection. */
function stubTextRangeLayout() {
	Range.prototype.getClientRects = () => [EMPTY_RECT] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect = () => EMPTY_RECT as DOMRect;
}

const searchResources = vi.fn<(query: string) => Promise<ResourceSearchResult[]>>();

async function renderEditor(markdown = '', slashCommands?: SlashCommand[]) {
	const ready = vi.fn<(editor: Editor) => void>();
	const wrapper = renderMarkdownEditor({
		props: {
			modelValue: markdown,
			showToolbar: 'never',
			extensions: createPageEditorExtensions({ searchResources, slashCommands }),
			onReady: ready,
		},
		global: { plugins: [createTestRouter()] },
	});
	await waitFor(() => expect(ready).toHaveBeenCalled());
	const editor = ready.mock.calls[0][0];
	const content = wrapper.container.querySelector<HTMLElement>(
		'[data-test-id="n8n-markdown-editor-content"]',
	);
	return { editor, content: content as HTMLElement };
}

async function typeSlash(editor: Editor, query = '') {
	editor.chain().focus('end').insertContent(`/${query}`).run();
	return await screen.findByTestId('page-slash-menu');
}

async function findItems(menu: HTMLElement) {
	return await within(menu).findAllByTestId('page-slash-item');
}

function idsOf(commands: SlashCommand[]) {
	return commands.map(({ id }) => id);
}

describe('filterSlashCommands', () => {
	const translate = (key: string) =>
		({
			'page.slash.heading1.title': 'Heading 1',
			'page.slash.heading2.title': 'Heading 2',
			'page.slash.heading3.title': 'Heading 3',
			'page.slash.taskList.title': 'To-do list',
			'page.slash.divider.title': 'Divider',
		})[key] ?? key;

	it('keeps every command for an empty query', () => {
		expect(filterSlashCommands(DEFAULT_SLASH_COMMANDS, '', translate)).toEqual(
			DEFAULT_SLASH_COMMANDS,
		);
	});

	it('finds commands by a part of the title, in menu order', () => {
		expect(idsOf(filterSlashCommands(DEFAULT_SLASH_COMMANDS, 'HEAD', translate))).toEqual([
			'heading1',
			'heading2',
			'heading3',
		]);
	});

	it('finds a command by the start of a keyword', () => {
		expect(idsOf(filterSlashCommands(DEFAULT_SLASH_COMMANDS, 'todo', translate))).toEqual([
			'taskList',
		]);
		expect(idsOf(filterSlashCommands(DEFAULT_SLASH_COMMANDS, 'hr', translate))).toEqual([
			'divider',
		]);
	});

	it('gives nothing when no command matches', () => {
		expect(filterSlashCommands(DEFAULT_SLASH_COMMANDS, 'workflow/abc123', translate)).toEqual([]);
	});
});

describe('/ menu', () => {
	beforeAll(stubTextRangeLayout);

	beforeEach(() => {
		vi.clearAllMocks();
		searchResources.mockResolvedValue([]);
	});

	it('lists every command with a title and a description', async () => {
		const { editor } = await renderEditor();

		const menu = await typeSlash(editor);
		const items = await findItems(menu);

		expect(items).toHaveLength(DEFAULT_SLASH_COMMANDS.length);
		expect(items[0]).toHaveTextContent('Heading 1');
		expect(items[0]).toHaveTextContent('Large section heading');
		expect(items[0]).toHaveAttribute('aria-selected', 'true');
	});

	it('opens after a space and filters as the user types', async () => {
		const { editor } = await renderEditor('Some text ');

		const menu = await typeSlash(editor, 'quo');

		await waitFor(async () => expect(await findItems(menu)).toHaveLength(1));
		expect(menu).toHaveTextContent('Quote');
	});

	it('does not open in the middle of a word', async () => {
		const { editor } = await renderEditor('and');

		editor.chain().focus('end').insertContent('/or').run();
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(screen.queryByTestId('page-slash-menu')).not.toBeInTheDocument();
	});

	it('shows no list when the typed text matches no command', async () => {
		const { editor } = await renderEditor();

		const menu = await typeSlash(editor, 'zzz');

		expect(within(menu).queryByRole('listbox')).not.toBeInTheDocument();
	});

	it('does not open for a typed path', async () => {
		const { editor } = await renderEditor();

		editor.chain().focus('end').insertContent('/workflow/abc123').run();
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(screen.queryByTestId('page-slash-menu')).not.toBeInTheDocument();
	});

	it.each([
		['heading1', '# Title'],
		['heading2', '## Title'],
		['heading3', '### Title'],
		['bulletList', '- Title'],
		['orderedList', '1. Title'],
		['taskList', '- [ ] Title'],
		['quote', '> Title'],
		['codeBlock', '```\nTitle \n```'],
	])('turns the block into %s and removes the typed query', async (id, markdown) => {
		const { editor } = await renderEditor('Title ');
		const menu = await typeSlash(editor);
		const items = await findItems(menu);
		const item = items.find((element) => element.dataset.commandId === id);

		await fireEvent.click(item as HTMLElement);

		expect(editor.getMarkdown().trim()).toBe(markdown);
		await waitFor(() => expect(screen.queryByTestId('page-slash-menu')).not.toBeInTheDocument());
	});

	it('inserts a divider', async () => {
		const { editor } = await renderEditor('Above\n\n');
		editor.chain().focus('end').insertContent({ type: 'paragraph' }).run();
		const menu = await typeSlash(editor, 'divider');

		await fireEvent.click((await findItems(menu))[0]);

		expect(editor.getMarkdown()).toContain('---');
		expect(editor.getText()).not.toContain('/divider');
	});

	it('runs the command that the user selects with the keyboard', async () => {
		const { editor, content } = await renderEditor();
		const menu = await typeSlash(editor);
		await findItems(menu);

		await fireEvent.keyDown(content, { key: 'ArrowDown' });
		await waitFor(() =>
			expect(within(menu).getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true'),
		);
		await fireEvent.keyDown(content, { key: 'Enter' });
		editor.commands.insertContent('Plan');

		expect(editor.getMarkdown().trim()).toBe('## Plan');
	});

	it('closes on escape and keeps the typed text', async () => {
		const { editor, content } = await renderEditor();
		await typeSlash(editor, 'head');

		await fireEvent.keyDown(content, { key: 'Escape' });

		await waitFor(() => expect(screen.queryByTestId('page-slash-menu')).not.toBeInTheDocument());
		expect(editor.getText()).toBe('/head');
	});

	it('opens the @ menu from the mention command', async () => {
		const { editor } = await renderEditor();
		const menu = await typeSlash(editor, 'mention');

		await fireEvent.click((await findItems(menu))[0]);

		expect(await screen.findByTestId('page-mention-menu')).toBeInTheDocument();
		expect(editor.getText()).toBe('@');
	});

	it('does not open in a code block', async () => {
		const { editor } = await renderEditor('```\ncode\n```');

		editor.chain().focus('end').insertContent(' /').run();
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(screen.queryByTestId('page-slash-menu')).not.toBeInTheDocument();
	});

	it('runs an added command that inserts markdown after an async action', async () => {
		const writeSummary: SlashCommand = {
			id: 'summary',
			icon: 'file-text',
			title: 'page.slash.quote.title',
			description: 'page.slash.quote.description',
			keywords: ['summary'],
			run: async ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).run();
				const markdown = await Promise.resolve('## Summary\n\n- **Done**');
				insertMarkdownAtSelection(editor, markdown);
			},
		};
		const { editor } = await renderEditor('', [...DEFAULT_SLASH_COMMANDS, writeSummary]);
		const menu = await typeSlash(editor, 'summary');

		await fireEvent.click((await findItems(menu))[0]);

		await waitFor(() => expect(editor.getMarkdown().trim()).toBe('## Summary\n\n- **Done**'));
	});
});
