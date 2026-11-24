import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import type {
	FrontendModuleSettings,
	KnowledgeCollectionAgentDto,
	KnowledgeCollectionDto,
	KnowledgeCollectionFileDto,
} from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';

import { createProjectListItem } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCollectionsStore } from '@/features/settings/context/collections.store';
import { useSettingsStore } from '@n8n/stores/settings.store';

import CollectionView from './CollectionView.vue';

const showErrorMock = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn(), resolve: () => ({ href: '/somewhere' }) }),
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
}: {
	files?: KnowledgeCollectionFileDto[];
	agents?: KnowledgeCollectionAgentDto[];
	description?: string;
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
		{ ...createProjectListItem(), id: 'p1', name: 'Darwin' },
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
		expect(screen.getByRole('heading', { level: 1, name: 'Customer support' })).toBeInTheDocument();
		expect(screen.getByTestId('collection-description')).toHaveTextContent(
			'Customer support: refunds and pricing',
		);
		expect(screen.getByTitle('Customer support')).toBeInTheDocument();
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
});
