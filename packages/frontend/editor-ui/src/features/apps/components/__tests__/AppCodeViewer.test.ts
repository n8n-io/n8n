import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore, waitAllPromises } from '@/__tests__/utils';

import AppCodeViewer from '../AppCodeViewer.vue';
import { useAppsStore } from '../../apps.store';
import type { App } from '../../apps.types';

const showError = vi.hoisted(() => vi.fn());
const showMessage = vi.hoisted(() => vi.fn());
const confirm = vi.hoisted(() => vi.fn().mockResolvedValue('confirm'));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm }),
}));

const renderViewer = createComponentRenderer(AppCodeViewer, {
	global: {
		stubs: {
			FileCodeViewer: {
				props: ['path', 'content'],
				emits: ['update:content'],
				template: `
					<div data-test-id="file-code-viewer-stub">
						<span data-test-id="fcv-content">{{ path }}:{{ content }}</span>
						<button data-test-id="fcv-edit" @click="$emit('update:content', content + '!')">edit</button>
					</div>
				`,
			},
		},
	},
});

function makeApp(overrides: Partial<App> = {}): App {
	return {
		id: 'app-1',
		name: 'Greeter',
		namespace: 'greeter',
		theme: null,
		projectId: 'proj-1',
		activeVersionId: 'v-2',
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
		...overrides,
	};
}

describe('AppCodeViewer', () => {
	let appsStore: MockedStore<typeof useAppsStore>;

	beforeEach(() => {
		createTestingPinia();
		appsStore = mockedStore(useAppsStore);
		showError.mockReset();
		showMessage.mockReset();
		confirm.mockReset().mockResolvedValue('confirm');
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

	it("never pairs the new file's path with the previous file's content while its fetch is pending", async () => {
		appsStore.fetchAppVersionFiles.mockResolvedValue(['a.ts', 'b.ts']);
		let resolveA: (content: string) => void = () => {};
		appsStore.fetchAppVersionFileContent.mockImplementationOnce(
			async () => await new Promise((resolve) => (resolveA = resolve)),
		);
		const { getByText, getByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1', versionId: 'v-2' },
		});
		await waitAllPromises();
		await userEvent.click(getByText('a.ts'));
		resolveA('a content');
		await waitAllPromises();

		let resolveB: (content: string) => void = () => {};
		appsStore.fetchAppVersionFileContent.mockImplementationOnce(
			async () => await new Promise((resolve) => (resolveB = resolve)),
		);
		await userEvent.click(getByText('b.ts'));

		// While b.ts's content is still in flight, the viewer must keep showing
		// a.ts's own pairing — never b.ts's path against a.ts's stale content.
		expect(getByTestId('fcv-content')).toHaveTextContent('a.ts:a content');

		resolveB('b content');
		await waitAllPromises();

		expect(getByTestId('fcv-content')).toHaveTextContent('b.ts:b content');
	});

	it('shows an error toast when listing the files fails', async () => {
		appsStore.fetchAppVersionFiles.mockRejectedValue(new Error('boom'));
		renderViewer({ props: { projectId: 'proj-1', appId: 'app-1', versionId: 'v-1' } });
		await waitAllPromises();

		expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Error loading file');
	});

	it('enables Save only once the file is edited, and disables it again after a successful save', async () => {
		appsStore.fetchAppVersionFiles.mockResolvedValue(['main.ts']);
		appsStore.fetchAppVersionFileContent.mockResolvedValue('export {};');
		appsStore.saveAppVersionFileContent.mockResolvedValue(makeApp({ activeVersionId: 'v-3' }));
		const { getByText, getByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1', versionId: 'v-2' },
		});
		await waitAllPromises();
		await userEvent.click(getByText('main.ts'));
		await waitAllPromises();

		expect(getByTestId('app-code-save')).toHaveAttribute('aria-disabled', 'true');

		await userEvent.click(getByTestId('fcv-edit'));
		expect(getByTestId('app-code-save')).not.toHaveAttribute('aria-disabled', 'true');

		await userEvent.click(getByTestId('app-code-save'));
		await waitAllPromises();

		expect(appsStore.saveAppVersionFileContent).toHaveBeenCalledWith(
			'proj-1',
			'app-1',
			'v-2',
			'main.ts',
			'export {};!',
		);
		expect(getByTestId('app-code-save')).toHaveAttribute('aria-disabled', 'true');
	});

	it('emits saved with the updated app on a successful save', async () => {
		appsStore.fetchAppVersionFiles.mockResolvedValue(['main.ts']);
		appsStore.fetchAppVersionFileContent.mockResolvedValue('export {};');
		const updated = makeApp({ activeVersionId: 'v-3' });
		appsStore.saveAppVersionFileContent.mockResolvedValue(updated);
		const { getByText, getByTestId, emitted } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1', versionId: 'v-2' },
		});
		await waitAllPromises();
		await userEvent.click(getByText('main.ts'));
		await waitAllPromises();
		await userEvent.click(getByTestId('fcv-edit'));

		await userEvent.click(getByTestId('app-code-save'));
		await waitAllPromises();

		expect(emitted().saved[0]).toEqual([updated]);
	});

	it('shows the build error and keeps the edited content when saving fails', async () => {
		appsStore.fetchAppVersionFiles.mockResolvedValue(['main.ts']);
		appsStore.fetchAppVersionFileContent.mockResolvedValue('export {};');
		appsStore.saveAppVersionFileContent.mockRejectedValue(new Error('Build failed: syntax error'));
		const { getByText, getByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1', versionId: 'v-2' },
		});
		await waitAllPromises();
		await userEvent.click(getByText('main.ts'));
		await waitAllPromises();
		await userEvent.click(getByTestId('fcv-edit'));

		await userEvent.click(getByTestId('app-code-save'));
		await waitAllPromises();

		expect(getByTestId('app-code-build-error')).toHaveTextContent('Build failed: syntax error');
		expect(getByTestId('fcv-content')).toHaveTextContent('main.ts:export {};!');
		expect(getByTestId('app-code-save')).not.toHaveAttribute('aria-disabled', 'true');
	});

	it('keeps the current file when the user cancels the discard confirmation', async () => {
		appsStore.fetchAppVersionFiles.mockResolvedValue(['a.ts', 'b.ts']);
		appsStore.fetchAppVersionFileContent.mockImplementation(async (_p, _a, _v, path) =>
			path === 'a.ts' ? 'a content' : 'b content',
		);
		confirm.mockResolvedValue('cancel');
		const { getByText, getByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1', versionId: 'v-2' },
		});
		await waitAllPromises();
		await userEvent.click(getByText('a.ts'));
		await waitAllPromises();
		await userEvent.click(getByTestId('fcv-edit'));

		await userEvent.click(getByText('b.ts'));
		await waitAllPromises();

		expect(confirm).toHaveBeenCalled();
		expect(appsStore.fetchAppVersionFileContent).toHaveBeenCalledTimes(1);
		expect(getByTestId('fcv-content')).toHaveTextContent('a.ts:a content!');
	});

	it('switches files once the user confirms discarding unsaved changes', async () => {
		appsStore.fetchAppVersionFiles.mockResolvedValue(['a.ts', 'b.ts']);
		appsStore.fetchAppVersionFileContent.mockImplementation(async (_p, _a, _v, path) =>
			path === 'a.ts' ? 'a content' : 'b content',
		);
		confirm.mockResolvedValue('confirm');
		const { getByText, getByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1', versionId: 'v-2' },
		});
		await waitAllPromises();
		await userEvent.click(getByText('a.ts'));
		await waitAllPromises();
		await userEvent.click(getByTestId('fcv-edit'));

		await userEvent.click(getByText('b.ts'));
		await waitAllPromises();

		expect(confirm).toHaveBeenCalled();
		expect(getByTestId('fcv-content')).toHaveTextContent('b.ts:b content');
	});
});
