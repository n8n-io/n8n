import { N8nMarkdownEditor } from '@n8n/design-system';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import type { Editor } from '@tiptap/core';

import { createPageEditorExtensions } from './pageEditorExtensions';
import { RESOURCE_CHIP_NODE } from './resourceChipNode';
import { createResourceLinkInserter, insertResourceChip } from './resourceLinkInsertion';
import { createResourcePasteHandler } from './resourcePaste';
import { createTestRouter } from '../__tests__/router';
import type { ResourceSearchResult } from '../resources/resource.api';
import type { ResourceFetchers } from '../resources/resourceNameResolver';
import { usePageResourceStore } from '../resources/resource.store';

const fetchers = vi.hoisted(() => ({
	workflow: vi.fn<ResourceFetchers['workflow']>(),
	credential: vi.fn<ResourceFetchers['credential']>(),
	dataTable: vi.fn<ResourceFetchers['dataTable']>(),
	page: vi.fn<ResourceFetchers['page']>(),
}));

vi.mock('../resources/resource.api', () => ({
	createRestResourceFetchers: () => fetchers,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost/rest', pushRef: 'test' } }),
}));

vi.mock('@tiptap/vue-3/menus', () => ({
	// A stub map is keyed by component name.
	// eslint-disable-next-line @typescript-eslint/naming-convention
	BubbleMenu: { name: 'BubbleMenu', template: '<div><slot /></div>' },
}));

const instance = { origin: 'https://n8n.example.com', basePath: '/n8n' };

const renderMarkdownEditor = createComponentRenderer(N8nMarkdownEditor);

const searchResources = vi.fn<(query: string) => Promise<ResourceSearchResult[]>>();

async function renderEditor(markdown: string) {
	const ready = vi.fn<(editor: Editor) => void>();
	const editorHolder: { editor?: Editor } = {};
	const resourceStore = usePageResourceStore();
	const wrapper = renderMarkdownEditor({
		props: {
			modelValue: markdown,
			showToolbar: 'never',
			extensions: createPageEditorExtensions({ searchResources }),
			editorProps: {
				handleDOMEvents: {
					paste: createResourcePasteHandler({
						getEditor: () => editorHolder.editor,
						getInstance: () => instance,
						insertResourceLink: createResourceLinkInserter(resourceStore.resolveName),
					}),
				},
			},
			onReady: ready,
		},
		global: { plugins: [createTestRouter()] },
	});
	await waitFor(() => expect(ready).toHaveBeenCalled());
	const editor = ready.mock.calls[0][0];
	editorHolder.editor = editor;
	const content = wrapper.container.querySelector<HTMLElement>(
		'[data-test-id="n8n-markdown-editor-content"]',
	);
	return { wrapper, editor, content: content as HTMLElement };
}

function chipNodesOf(editor: Editor) {
	const chips: Array<Record<string, unknown>> = [];
	editor.state.doc.descendants((node) => {
		if (node.type.name === RESOURCE_CHIP_NODE) {
			chips.push(node.attrs);
		}
	});
	return chips;
}

async function paste(content: HTMLElement, text: string) {
	await fireEvent.paste(content, {
		clipboardData: { getData: (type: string) => (type === 'text/plain' ? text : '') },
	});
}

describe('page editor resource links', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchers.workflow.mockResolvedValue({
			name: 'Sync orders v2',
			nodes: [{ id: 'node-1', name: 'HTTP Request' }],
		});
		fetchers.credential.mockRejectedValue(new Error('Forbidden'));
		fetchers.dataTable.mockResolvedValue({ name: 'Orders' });
		fetchers.page.mockResolvedValue({ name: 'Runbook' });
		searchResources.mockResolvedValue([]);
	});

	describe('markdown round trip', () => {
		it.each([
			['a workflow', 'See [Sync orders](/workflow/abc123) for details.'],
			['a node', '[Sync orders › HTTP Request](/workflow/abc123/node-1)'],
			['a page by its short address', '[Runbook](/page/p1)'],
			['a page inside its project', '[Runbook](/projects/proj1/pages/p1)'],
			['a credential of a project', '[Stripe key](/projects/proj1/credentials/c1)'],
			['a credential of the home view', '[Stripe key](/home/credentials/c1)'],
			['a data table', '[Orders](/projects/proj1/datatables/dt1)'],
			['a name with brackets', '[Orders \\[EU\\]](/workflow/abc123)'],
			['two links to one workflow', '[A](/workflow/abc123) and [B](/workflow/abc123)'],
			['an external link', 'Read [the docs](https://docs.n8n.io/) first.'],
			['a link in a list', '- [Sync orders](/workflow/abc123)\n- plain item'],
		])('keeps %s as a plain markdown link', async (_case, markdown) => {
			const { editor } = await renderEditor(markdown);

			expect(editor.getMarkdown().trimEnd()).toBe(markdown);
		});

		it('turns only the links to resources into chips', async () => {
			const { editor } = await renderEditor(
				'[Sync orders](/workflow/abc123), [docs](https://docs.n8n.io/), [users](/settings/users)',
			);

			expect(chipNodesOf(editor)).toEqual([{ href: '/workflow/abc123', label: 'Sync orders' }]);
		});
	});

	describe('chip', () => {
		it('shows the current name of the resource and keeps the stored text', async () => {
			const markdown = '[Sync orders](/workflow/abc123)';
			const { wrapper, editor } = await renderEditor(markdown);

			const chip = await wrapper.findByTestId('page-resource-chip');
			await waitFor(() => expect(chip).toHaveTextContent('Sync orders v2'));

			expect(chip).toHaveAttribute('data-resource-type', 'workflow');
			expect(chip).toHaveAttribute('href', '/workflow/abc123');
			expect(editor.getMarkdown().trimEnd()).toBe(markdown);
		});

		it('makes one request for ten chips of the same workflow', async () => {
			const markdown = Array.from({ length: 10 }, () => '[Sync](/workflow/abc123)').join(' ');
			const { wrapper } = await renderEditor(markdown);

			await waitFor(async () =>
				expect(await wrapper.findAllByText('Sync orders v2')).toHaveLength(10),
			);

			expect(fetchers.workflow).toHaveBeenCalledTimes(1);
		});

		it('names a node after its workflow and itself', async () => {
			const { wrapper } = await renderEditor('[old](/workflow/abc123/node-1)');

			expect(await wrapper.findByText('Sync orders v2 › HTTP Request')).toBeInTheDocument();
		});

		it('shows the stored text of a resource that cannot be read', async () => {
			const { wrapper } = await renderEditor('[Stripe key](/home/credentials/c1)');

			const chip = await wrapper.findByTestId('page-resource-chip');
			await waitFor(() => expect(chip.className).toContain('missing'));

			expect(chip).toHaveTextContent('Stripe key');
		});
	});

	describe('paste', () => {
		it('turns an absolute URL of this instance into a link with the resource name', async () => {
			const { editor, content } = await renderEditor('');

			await paste(content, 'https://n8n.example.com/n8n/workflow/abc123');

			await waitFor(() =>
				expect(editor.getMarkdown().trim()).toBe('[Sync orders v2](/workflow/abc123)'),
			);
		});

		it('turns a relative editor path into a link', async () => {
			const { editor, content } = await renderEditor('');

			await paste(content, '/projects/proj1/datatables/dt1');

			await waitFor(() =>
				expect(editor.getMarkdown().trim()).toBe('[Orders](/projects/proj1/datatables/dt1)'),
			);
		});

		it('keeps the path as link text when the resource cannot be read', async () => {
			const { editor, content } = await renderEditor('');

			await paste(content, '/home/credentials/c1');
			await waitFor(() => expect(fetchers.credential).toHaveBeenCalled());

			expect(editor.getMarkdown().trim()).toBe('[/home/credentials/c1](/home/credentials/c1)');
		});

		it.each([
			['a URL of another instance', 'https://other.example.com/workflow/abc123'],
			['an address that opens no resource', 'https://n8n.example.com/n8n/settings/users'],
			['plain text', 'just some words'],
		])('pastes %s as usual', async (_case, text) => {
			const { editor, content } = await renderEditor('');

			await paste(content, text);

			await waitFor(() => expect(editor.getText()).toContain(text));
			expect(chipNodesOf(editor)).toEqual([]);
		});
	});

	describe('insertResourceChip', () => {
		it('inserts the link that the @ menu selects', async () => {
			const { editor } = await renderEditor('Before');

			insertResourceChip(editor, '/page/p1', 'Runbook');

			expect(editor.getMarkdown().trim()).toContain('[Runbook](/page/p1)');
		});
	});

	describe('@ menu', () => {
		const results: ResourceSearchResult[] = [
			{ resourceType: 'workflow', id: 'abc123', name: 'Sync orders', path: '/workflow/abc123' },
			{ resourceType: 'page', id: 'p1', name: 'Sync runbook', path: '/page/p1' },
		];

		async function typeMention(editor: Editor, query: string) {
			editor.chain().focus().insertContent(`@${query}`).run();
			return await screen.findByTestId('page-mention-menu');
		}

		it('searches what the user types and labels the results by type', async () => {
			searchResources.mockResolvedValue(results);
			const { editor } = await renderEditor('');

			const menu = await typeMention(editor, 'sync');

			await waitFor(() => expect(within(menu).getAllByTestId('page-mention-item')).toHaveLength(2));
			expect(searchResources).toHaveBeenLastCalledWith('sync');
			expect(menu).toHaveTextContent('Workflows');
			expect(menu).toHaveTextContent('Pages');
			expect(within(menu).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
		});

		it('inserts the result that the user selects with the keyboard', async () => {
			searchResources.mockResolvedValue(results);
			const { editor, content } = await renderEditor('');
			const menu = await typeMention(editor, 'sync');
			await waitFor(() => expect(within(menu).getAllByTestId('page-mention-item')).toHaveLength(2));

			await fireEvent.keyDown(content, { key: 'ArrowDown' });
			await waitFor(() =>
				expect(within(menu).getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true'),
			);
			await fireEvent.keyDown(content, { key: 'Enter' });

			expect(editor.getMarkdown().trim()).toBe('[Sync runbook](/page/p1)');
			await waitFor(() =>
				expect(screen.queryByTestId('page-mention-menu')).not.toBeInTheDocument(),
			);
		});

		it('inserts the result that the user clicks', async () => {
			searchResources.mockResolvedValue(results);
			const { editor } = await renderEditor('');
			const menu = await typeMention(editor, 'sync');

			await fireEvent.click(await within(menu).findByText('Sync orders'));

			expect(editor.getMarkdown().trim()).toBe('[Sync orders](/workflow/abc123)');
		});

		it('closes on escape and keeps the typed text', async () => {
			searchResources.mockResolvedValue(results);
			const { editor, content } = await renderEditor('');
			await typeMention(editor, 'sync');

			await fireEvent.keyDown(content, { key: 'Escape' });

			await waitFor(() =>
				expect(screen.queryByTestId('page-mention-menu')).not.toBeInTheDocument(),
			);
			expect(editor.getText()).toBe('@sync');
		});
	});
});
