import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore, waitAllPromises } from '@/__tests__/utils';

import AppCodeViewer from '../AppCodeViewer.vue';
import { useAppsStore } from '../../apps.store';

const showError = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage: vi.fn() }),
}));

const renderViewer = createComponentRenderer(AppCodeViewer, {
	global: {
		stubs: {
			FileCodeViewer: {
				props: ['path', 'content'],
				template: '<div data-test-id="file-code-viewer-stub">{{ path }}:{{ content }}</div>',
			},
		},
	},
});

describe('AppCodeViewer', () => {
	let appsStore: MockedStore<typeof useAppsStore>;

	beforeEach(() => {
		createTestingPinia();
		appsStore = mockedStore(useAppsStore);
		showError.mockReset();
	});

	it('shows an empty state and fetches nothing when the app has no active version', async () => {
		const { getByText } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1', versionId: undefined },
		});
		await waitAllPromises();

		expect(getByText('Build this app to see its source files here')).toBeInTheDocument();
		expect(appsStore.fetchAppVersionFiles).not.toHaveBeenCalled();
	});

	it('lists the files in a tree and shows a placeholder before any file is selected', async () => {
		appsStore.fetchAppVersionFiles.mockResolvedValue(['main.ts', 'index.html']);
		const { getByText, queryByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1', versionId: 'v-1' },
		});
		await waitAllPromises();

		expect(appsStore.fetchAppVersionFiles).toHaveBeenCalledWith('proj-1', 'app-1', 'v-1');
		expect(getByText('main.ts')).toBeInTheDocument();
		expect(getByText('index.html')).toBeInTheDocument();
		expect(getByText('Select a file to view its contents')).toBeInTheDocument();
		expect(queryByTestId('file-code-viewer-stub')).not.toBeInTheDocument();
	});

	it("loads a clicked file's content into the viewer", async () => {
		appsStore.fetchAppVersionFiles.mockResolvedValue(['main.ts']);
		appsStore.fetchAppVersionFileContent.mockResolvedValue('export {};');
		const { getByText, getByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1', versionId: 'v-1' },
		});
		await waitAllPromises();

		await userEvent.click(getByText('main.ts'));
		await waitAllPromises();

		expect(appsStore.fetchAppVersionFileContent).toHaveBeenCalledWith(
			'proj-1',
			'app-1',
			'v-1',
			'main.ts',
		);
		expect(getByTestId('file-code-viewer-stub')).toHaveTextContent('main.ts:export {};');
	});

	it('shows an error toast when listing the files fails', async () => {
		appsStore.fetchAppVersionFiles.mockRejectedValue(new Error('boom'));
		renderViewer({ props: { projectId: 'proj-1', appId: 'app-1', versionId: 'v-1' } });
		await waitAllPromises();

		expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Error loading file');
	});
});
