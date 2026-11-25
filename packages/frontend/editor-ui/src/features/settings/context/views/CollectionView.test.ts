import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import type {
	FrontendModuleSettings,
	KnowledgeCollectionAgentDto,
	KnowledgeCollectionDto,
	KnowledgeCollectionFileDto,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';

import { VIEWS } from '@/app/constants';
import { createProjectListItem } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCollectionsStore } from '@/features/settings/context/collections.store';
import { useSettingsStore } from '@n8n/stores/settings.store';

import CollectionView from './CollectionView.vue';

const showErrorMock = vi.fn();
const showMessageMock = vi.fn();
const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock, showMessage: showMessageMock }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: pushMock,
		replace: replaceMock,
		resolve: () => ({ href: '/somewhere' }),
	}),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

function file(id: string, fileName: string): KnowledgeCollectionFileDto {
	return {
		id,
		collectionId: 'c1',
		fileName,
		mimeType: 'application/pdf',
		fileSizeBytes: 1,
		createdAt: '2026-10-14T09:00:00.000Z',
	};
}

function collectionDto(overrides: Partial<KnowledgeCollectionDto> = {}): KnowledgeCollectionDto {
	return {
		id: 'c1',
		name: 'Customer support',
		description: 'Customer support: refunds and pricing',
		slug: 'customer-support',
		homeProject: { id: 'p1', name: 'Darwin', type: 'team' },
		fileCount: 0,
		totalFileSizeBytes: 0,
		agentCount: 0,
		createdAt: '2026-10-14T09:00:00.000Z',
		updatedAt: '2026-10-14T09:00:00.000Z',
		...overrides,
	};
}

const renderComponent = createComponentRenderer(CollectionView, {
	props: { projectId: 'p1', collectionId: 'c1' },
});

let collectionsStore: MockedStore<typeof useCollectionsStore>;

const setup = async ({
	files = [],
	agents = [],
	description = 'Customer support: refunds and pricing',
	canEdit = true,
}: {
	files?: KnowledgeCollectionFileDto[];
	agents?: KnowledgeCollectionAgentDto[];
	description?: string;
	/** Whether the user holds `agent:update` in the project of the collection. */
	canEdit?: boolean;
} = {}) => {
	const pinia = createTestingPinia();
	collectionsStore = mockedStore(useCollectionsStore);
	collectionsStore.getCollection.mockResolvedValue(collectionDto({ description }));
	collectionsStore.listCollectionFiles.mockResolvedValue({
		count: files.length,
		totalSizeBytes: 0,
		data: files,
	});
	collectionsStore.listCollectionAgents.mockResolvedValue(agents);
	mockedStore(useProjectsStore).myProjects = [
		{
			...createProjectListItem(),
			id: 'p1',
			name: 'Darwin',
			scopes: canEdit ? ['agent:read', 'agent:update'] : ['agent:read'],
		},
	];

	const rendered = renderComponent({ pinia });
	// The cards show after the first read.
	await screen.findByTestId('collection-files-upload-input');
	return rendered;
};

const filePills = () => screen.queryAllByTestId('collection-file-pill');
const pillNames = () => filePills().map((pill) => pill.textContent?.trim());

const selectFiles = async (files: File[]) => {
	await fireEvent.change(screen.getByTestId('collection-files-upload-input'), {
		target: { files },
	});
};

const titleEdit = () => screen.getByTestId('collection-name-inline-edit');
const titleInput = () => within(titleEdit()).getByTestId('inline-edit-input');
const titlePreview = () => within(titleEdit()).getByTestId('inline-edit-preview');
const currentCrumb = () => screen.getAllByTestId('breadcrumbs-item').at(-1);

/** Clicks the title, replaces its text and presses the given key. */
async function typeTitle(name: string, key = '{Enter}') {
	await userEvent.click(titlePreview());
	await userEvent.clear(titleInput());
	await userEvent.type(titleInput(), `${name}${key}`);
}

function menuLabels() {
	return screen.getAllByRole('menuitem').map((item) => item.textContent?.trim());
}

const moreActionsButton = () =>
	within(screen.getByTestId('collection-actions')).getByRole('button', { name: 'More actions' });

async function openMenu() {
	await userEvent.click(moreActionsButton());
}

async function pickAction(name: 'Edit description' | 'Delete') {
	await openMenu();
	await userEvent.click(await screen.findByRole('menuitem', { name }));
}

/** Tabs through the page and tells whether the focus lands in the title. */
async function tabsIntoTitle(maxSteps = 10) {
	const heading = screen.getByRole('heading', { level: 1 });
	for (let step = 0; step < maxSteps; step++) {
		await userEvent.tab();
		if (heading.contains(document.activeElement)) {
			return true;
		}
	}

	return false;
}

const descriptionField = () =>
	screen.getByTestId('collection-description-input').querySelector('textarea')!;

describe('CollectionView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads the files and the agents of the collection in the route', async () => {
		await setup();

		expect(collectionsStore.listCollectionFiles).toHaveBeenCalledWith('p1', 'c1');
		expect(collectionsStore.listCollectionAgents).toHaveBeenCalledWith('p1', 'c1');
	});

	it('shows the project and the collections crumbs', async () => {
		await setup();

		// The router link is a mock, so the crumbs render their title and no text.
		expect(screen.getByTitle('Darwin')).toBeInTheDocument();
		expect(screen.getByTitle('Collections')).toBeInTheDocument();
	});

	it('shows the name and the description of the collection', async () => {
		await setup();

		expect(collectionsStore.getCollection).toHaveBeenCalledWith('p1', 'c1');
		const heading = screen.getByRole('heading', { level: 1 });
		expect(within(heading).getByTestId('inline-edit-preview')).toHaveTextContent(
			'Customer support',
		);
		expect(screen.getByTestId('collection-description')).toHaveTextContent(
			'Customer support: refunds and pricing',
		);
		expect(currentCrumb()).toHaveAttribute('title', 'Customer support');
		expect(document.title).toContain('Customer support');
	});

	it('shows no description when the collection has none', async () => {
		await setup({ description: '' });

		expect(screen.queryByTestId('collection-description')).not.toBeInTheDocument();
	});

	it('offers the upload and the empty text when the collection is empty', async () => {
		await setup();

		expect(screen.getByRole('button', { name: 'Upload file' })).toBeInTheDocument();
		expect(screen.getByTestId('collection-used-by-empty')).toHaveTextContent(
			"No agents use this collection yet. Add it from an agent's Knowledge tab.",
		);
		expect(filePills()).toHaveLength(0);
	});

	it('shows one pill for each file, in the order of the server', async () => {
		await setup({ files: [file('f1', 'Refund policy.pdf'), file('f2', 'Price list.pdf')] });

		expect(pillNames()).toEqual(['Refund policy.pdf', 'Price list.pdf']);
	});

	it('uploads the selected files and adds their pills after the existing pills', async () => {
		await setup({ files: [file('f1', 'Refund policy.pdf')] });
		collectionsStore.uploadCollectionFiles.mockResolvedValue([file('f2', 'Shipping policy.pdf')]);
		const selected = [new File(['a'], 'Shipping policy.pdf')];

		await selectFiles(selected);

		expect(collectionsStore.uploadCollectionFiles).toHaveBeenCalledWith('p1', 'c1', selected);
		await waitFor(() => expect(pillNames()).toEqual(['Refund policy.pdf', 'Shipping policy.pdf']));
	});

	it('does not add the files of an upload that ends after the page opens a different collection', async () => {
		const rendered = await setup({ files: [file('f1', 'Refund policy.pdf')] });
		const upload = Promise.withResolvers<KnowledgeCollectionFileDto[]>();
		collectionsStore.uploadCollectionFiles.mockReturnValue(upload.promise);
		await selectFiles([new File(['a'], 'Late upload.pdf')]);

		collectionsStore.getCollection.mockResolvedValue(
			collectionDto({ id: 'c2', name: 'Legal', description: '' }),
		);
		collectionsStore.listCollectionFiles.mockResolvedValue({
			count: 1,
			totalSizeBytes: 0,
			data: [file('f9', 'NDA template.pdf')],
		});
		await rendered.rerender({ collectionId: 'c2' });
		await waitFor(() => expect(pillNames()).toEqual(['NDA template.pdf']));
		upload.resolve([file('f2', 'Late upload.pdf')]);
		await flushPromises();

		expect(pillNames()).toEqual(['NDA template.pdf']);
		// The row is usable again when the old upload ends.
		expect(screen.getByRole('button', { name: 'Upload file' })).toBeEnabled();
	});

	it('shows the server error and adds no pill when the upload fails', async () => {
		await setup();
		const error = new Error('Only CSV, PDF, Markdown, and TXT files are allowed');
		collectionsStore.uploadCollectionFiles.mockRejectedValue(error);

		await selectFiles([new File(['a'], 'a.exe')]);

		await waitFor(() =>
			expect(showErrorMock).toHaveBeenCalledWith(error, 'Could not upload a.exe'),
		);
		expect(filePills()).toHaveLength(0);
	});

	it('keeps the files that upload when another file of the selection fails', async () => {
		await setup();
		const error = new Error('Only CSV, PDF, Markdown, and TXT files are allowed');
		collectionsStore.uploadCollectionFiles
			.mockRejectedValueOnce(error)
			.mockResolvedValueOnce([file('f2', 'Price list.pdf')]);
		const selected = [new File(['a'], 'a.exe'), new File(['b'], 'Price list.pdf')];

		await selectFiles(selected);

		await waitFor(() => expect(pillNames()).toEqual(['Price list.pdf']));
		expect(collectionsStore.uploadCollectionFiles).toHaveBeenCalledWith('p1', 'c1', [selected[0]]);
		expect(collectionsStore.uploadCollectionFiles).toHaveBeenCalledWith('p1', 'c1', [selected[1]]);
		expect(showErrorMock).toHaveBeenCalledTimes(1);
		expect(showErrorMock).toHaveBeenCalledWith(error, 'Could not upload a.exe');
	});

	it('uploads no file when the selection has more files than the upload limit', async () => {
		await setup();
		useSettingsStore().moduleSettings = {
			knowledge: {
				limits: { maxFileSizeBytes: 100, maxFilesPerUpload: 1, maxTotalSizeBytes: 100 },
			},
		} as FrontendModuleSettings;

		await selectFiles([new File(['a'], 'a.pdf'), new File(['b'], 'b.pdf')]);

		await waitFor(() =>
			expect(showErrorMock).toHaveBeenCalledWith(expect.any(Error), 'Too many files'),
		);
		expect(collectionsStore.uploadCollectionFiles).not.toHaveBeenCalled();
	});

	it('removes a file from the right-click menu of its pill', async () => {
		await setup({ files: [file('f1', 'Refund policy.pdf'), file('f2', 'Price list.pdf')] });
		collectionsStore.deleteCollectionFile.mockResolvedValue();

		await fireEvent.contextMenu(screen.getByRole('button', { name: 'Refund policy.pdf' }));
		await userEvent.click(await screen.findByRole('menuitem', { name: 'Remove from collection' }));

		expect(collectionsStore.deleteCollectionFile).toHaveBeenCalledWith('p1', 'c1', 'f1');
		await waitFor(() => expect(pillNames()).toEqual(['Price list.pdf']));
	});

	it('keeps the pill and shows the error when the removal fails', async () => {
		await setup({ files: [file('f1', 'Refund policy.pdf')] });
		const error = new Error('You do not have permission to change this knowledge collection.');
		collectionsStore.deleteCollectionFile.mockRejectedValue(error);

		await fireEvent.contextMenu(screen.getByRole('button', { name: 'Refund policy.pdf' }));
		await userEvent.click(await screen.findByRole('menuitem', { name: 'Remove from collection' }));

		await waitFor(() => expect(showErrorMock).toHaveBeenCalledWith(error, expect.any(String)));
		expect(pillNames()).toEqual(['Refund policy.pdf']);
	});

	it('shows each agent with the name of its project', async () => {
		await setup({
			agents: [
				{ id: 'a1', name: 'Support agent', projectId: 'p1' },
				{ id: 'a2', name: 'Other agent', projectId: 'unknown' },
			],
		});

		const [known, unknown] = screen.getAllByTestId('collection-agent-pill');
		expect(known).toHaveTextContent('Support agent');
		expect(known).toHaveTextContent('Darwin');
		expect(unknown.textContent?.trim()).toBe('Other agent');
		expect(screen.queryByTestId('collection-used-by-empty')).not.toBeInTheDocument();
	});

	it('shows the error when the collection does not load', async () => {
		const error = new Error('Knowledge collection not found');
		const pinia = createTestingPinia();
		collectionsStore = mockedStore(useCollectionsStore);
		collectionsStore.getCollection.mockRejectedValue(error);

		renderComponent({ pinia });

		await waitFor(() => expect(showErrorMock).toHaveBeenCalledWith(error, expect.any(String)));
	});

	describe('actions menu', () => {
		it('offers Edit description and Delete to a user who can change the collection', async () => {
			await setup();

			await openMenu();

			await screen.findByRole('menuitem', { name: 'Edit description' });
			expect(menuLabels()).toEqual(['Edit description', 'Delete']);
		});

		it('shows no menu and a plain title to a user without the scope', async () => {
			await setup({ canEdit: false });
			const heading = screen.getByRole('heading', { level: 1 });

			expect(screen.queryByTestId('collection-actions')).toBeNull();
			expect(heading).toHaveTextContent('Customer support');
			expect(within(heading).queryByTestId('inline-edit-input')).toBeNull();
			expect(await tabsIntoTitle()).toBe(false);
			expect(collectionsStore.updateCollection).not.toHaveBeenCalled();
		});

		it('lets a user who can change the collection start the rename with the keyboard', async () => {
			await setup();

			expect(await tabsIntoTitle()).toBe(true);

			await waitFor(() => expect(titleInput()).toHaveFocus());
		});
	});

	describe('rename', () => {
		it('saves the new name and shows it in the title, the breadcrumb and the document title', async () => {
			await setup();
			collectionsStore.updateCollection.mockResolvedValue(
				collectionDto({ name: 'Support handbook' }),
			);

			await typeTitle('Support handbook');

			expect(collectionsStore.updateCollection).toHaveBeenCalledWith('p1', 'c1', {
				name: 'Support handbook',
			});
			await waitFor(() => expect(currentCrumb()).toHaveAttribute('title', 'Support handbook'));
			expect(titlePreview()).toHaveTextContent('Support handbook');
			expect(document.title).toContain('Support handbook');
			expect(showMessageMock).not.toHaveBeenCalled();
		});

		it('keeps the saved name and sends nothing when the user empties the title', async () => {
			await setup();

			await typeTitle('');

			expect(collectionsStore.updateCollection).not.toHaveBeenCalled();
			expect(titlePreview()).toHaveTextContent('Customer support');
		});

		it('keeps the saved name and sends nothing when the user cancels with Esc', async () => {
			await setup();

			await typeTitle('Support handbook', '{Escape}');

			expect(collectionsStore.updateCollection).not.toHaveBeenCalled();
			expect(titlePreview()).toHaveTextContent('Customer support');
		});

		it('shows a taken name under the title and keeps the typed name in the title only', async () => {
			await setup();
			collectionsStore.updateCollection.mockRejectedValue(
				new ResponseError('A collection with this name already exists in this project.', {
					httpStatusCode: 409,
				}),
			);

			await typeTitle('Product docs');

			await waitFor(() =>
				expect(screen.getByRole('alert')).toHaveTextContent(
					'A collection with this name already exists. The name is not saved.',
				),
			);
			expect(titlePreview()).toHaveTextContent('Product docs');
			expect(currentCrumb()).toHaveAttribute('title', 'Customer support');
			expect(showErrorMock).not.toHaveBeenCalled();

			// The saved name typed back needs no request and clears the error.
			await typeTitle('Customer support');

			expect(collectionsStore.updateCollection).toHaveBeenCalledTimes(1);
			expect(screen.queryByRole('alert')).toBeNull();
			expect(titlePreview()).toHaveTextContent('Customer support');
		});

		it('shows any other failure in a toast and puts the saved name back in the title', async () => {
			await setup();
			const failure = new Error('offline');
			collectionsStore.updateCollection.mockRejectedValue(failure);

			await typeTitle('Support handbook');

			await waitFor(() =>
				expect(showErrorMock).toHaveBeenCalledWith(failure, 'Could not save collection'),
			);
			expect(titlePreview()).toHaveTextContent('Customer support');
			expect(screen.queryByRole('alert')).toBeNull();
		});

		it('disables the title and the menu until the rename request ends', async () => {
			await setup();
			const rename = Promise.withResolvers<KnowledgeCollectionDto>();
			collectionsStore.updateCollection.mockReturnValue(rename.promise);

			await typeTitle('Support handbook');

			expect(titleInput()).toBeDisabled();
			expect(moreActionsButton()).toBeDisabled();

			rename.resolve(collectionDto({ name: 'Support handbook' }));
			await flushPromises();

			expect(titleInput()).toBeEnabled();
			expect(moreActionsButton()).toBeEnabled();
		});

		it('does not change the document title when a rename ends after the page closes', async () => {
			const { unmount } = await setup();
			const rename = Promise.withResolvers<KnowledgeCollectionDto>();
			collectionsStore.updateCollection.mockReturnValue(rename.promise);
			await typeTitle('Support handbook');

			unmount();
			const titleAfterClose = document.title;
			rename.resolve(collectionDto({ name: 'Support handbook' }));
			await flushPromises();

			expect(document.title).toBe(titleAfterClose);
			expect(document.title).not.toContain('Support handbook');
		});

		it('reports a taken name in a toast when the rename ends after the page closes', async () => {
			const { unmount } = await setup();
			const rename = Promise.withResolvers<KnowledgeCollectionDto>();
			collectionsStore.updateCollection.mockReturnValue(rename.promise);
			await typeTitle('Product docs');

			unmount();
			const failure = new ResponseError(
				'A collection with this name already exists in this project.',
				{ httpStatusCode: 409 },
			);
			rename.reject(failure);
			await flushPromises();

			expect(showErrorMock).toHaveBeenCalledWith(
				failure,
				'A collection with this name already exists. The name is not saved.',
			);
		});
	});

	describe('edit description', () => {
		it('opens the dialog with the current description and shows the saved description on the page', async () => {
			await setup();
			collectionsStore.updateCollection.mockResolvedValue(
				collectionDto({ description: 'Refunds, pricing and shipping' }),
			);

			await pickAction('Edit description');

			await screen.findByTestId('collection-modal');
			expect(descriptionField()).toHaveValue('Customer support: refunds and pricing');

			await userEvent.clear(descriptionField());
			await userEvent.type(descriptionField(), 'Refunds, pricing and shipping');
			await userEvent.click(screen.getByTestId('collection-modal-submit'));

			expect(collectionsStore.updateCollection).toHaveBeenCalledWith('p1', 'c1', {
				description: 'Refunds, pricing and shipping',
			});
			await waitFor(() =>
				expect(screen.getByTestId('collection-description')).toHaveTextContent(
					'Refunds, pricing and shipping',
				),
			);
			await waitFor(() => expect(screen.queryByTestId('collection-modal')).toBeNull());
		});
	});

	describe('delete', () => {
		it('opens the dialog and goes to the Collections list after the delete', async () => {
			await setup();
			collectionsStore.deleteCollection.mockResolvedValue();

			await pickAction('Delete');

			const dialog = await screen.findByTestId('collection-delete-dialog');
			expect(dialog).toHaveTextContent('Delete Customer support?');

			await userEvent.click(screen.getByTestId('collection-delete-confirm'));

			expect(collectionsStore.deleteCollection).toHaveBeenCalledWith('p1', 'c1');
			await waitFor(() =>
				expect(replaceMock).toHaveBeenCalledWith({ name: VIEWS.SETTINGS_CONTEXT_COLLECTIONS }),
			);
			expect(pushMock).not.toHaveBeenCalled();
		});
	});

	it('does not load the page data again after a rename or a description save', async () => {
		await setup();
		collectionsStore.updateCollection.mockResolvedValueOnce(
			collectionDto({ name: 'Support handbook' }),
		);
		await typeTitle('Support handbook');
		await waitFor(() => expect(currentCrumb()).toHaveAttribute('title', 'Support handbook'));

		collectionsStore.updateCollection.mockResolvedValueOnce(
			collectionDto({ name: 'Support handbook', description: 'Refunds only' }),
		);
		await pickAction('Edit description');
		await screen.findByTestId('collection-modal');
		await userEvent.clear(descriptionField());
		await userEvent.type(descriptionField(), 'Refunds only');
		await userEvent.click(screen.getByTestId('collection-modal-submit'));
		await waitFor(() =>
			expect(screen.getByTestId('collection-description')).toHaveTextContent('Refunds only'),
		);

		expect(collectionsStore.getCollection).toHaveBeenCalledTimes(1);
		expect(collectionsStore.listCollectionFiles).toHaveBeenCalledTimes(1);
		expect(collectionsStore.listCollectionAgents).toHaveBeenCalledTimes(1);
	});

	describe('when the page opens a different collection', () => {
		const openLegal = async (rendered: Awaited<ReturnType<typeof setup>>) => {
			collectionsStore.getCollection.mockResolvedValue(
				collectionDto({ id: 'c2', name: 'Legal', description: 'Contracts' }),
			);
			await rendered.rerender({ collectionId: 'c2' });
			await waitFor(() => expect(currentCrumb()).toHaveAttribute('title', 'Legal'));
		};

		it('closes the description dialog and ignores a late save of the old collection', async () => {
			const rendered = await setup();
			const save = Promise.withResolvers<KnowledgeCollectionDto>();
			collectionsStore.updateCollection.mockReturnValue(save.promise);
			await pickAction('Edit description');
			await screen.findByTestId('collection-modal');
			await userEvent.type(descriptionField(), ' and shipping');
			await userEvent.click(screen.getByTestId('collection-modal-submit'));

			await openLegal(rendered);
			await waitFor(() => expect(screen.queryByTestId('collection-modal')).toBeNull());
			save.resolve(collectionDto({ description: 'Late description' }));
			await flushPromises();

			expect(titlePreview()).toHaveTextContent('Legal');
			expect(screen.getByTestId('collection-description')).toHaveTextContent('Contracts');
		});

		it('removes the delete dialog and does not navigate', async () => {
			const rendered = await setup();
			await pickAction('Delete');
			await screen.findByTestId('collection-delete-dialog');

			await openLegal(rendered);

			await waitFor(() => expect(screen.queryByTestId('collection-delete-dialog')).toBeNull());
			expect(replaceMock).not.toHaveBeenCalled();
			expect(pushMock).not.toHaveBeenCalled();
		});

		it('does not change the new collection when a rename of the old one ends', async () => {
			const rendered = await setup();
			const rename = Promise.withResolvers<KnowledgeCollectionDto>();
			collectionsStore.updateCollection.mockReturnValue(rename.promise);
			await typeTitle('Support handbook');

			await openLegal(rendered);
			rename.resolve(collectionDto({ name: 'Support handbook' }));
			await flushPromises();

			expect(titlePreview()).toHaveTextContent('Legal');
			expect(currentCrumb()).toHaveAttribute('title', 'Legal');
			expect(document.title).toContain('Legal');
			expect(document.title).not.toContain('Support handbook');
		});

		it.each([
			[
				'a taken name',
				new ResponseError('A collection with this name already exists in this project.', {
					httpStatusCode: 409,
				}),
				'A collection with this name already exists. The name is not saved.',
			],
			['any other failure', new Error('offline'), 'Could not save collection'],
		])(
			'reports %s of a rename of the old collection in a toast and leaves the new page as it is',
			async (_case, failure, toastTitle) => {
				const rendered = await setup();
				const rename = Promise.withResolvers<KnowledgeCollectionDto>();
				collectionsStore.updateCollection.mockReturnValue(rename.promise);
				await typeTitle('Support handbook');

				await openLegal(rendered);
				rename.reject(failure);
				await flushPromises();

				expect(showErrorMock).toHaveBeenCalledWith(failure, toastTitle);
				expect(titlePreview()).toHaveTextContent('Legal');
				expect(screen.queryByRole('alert')).toBeNull();
			},
		);
	});
});
