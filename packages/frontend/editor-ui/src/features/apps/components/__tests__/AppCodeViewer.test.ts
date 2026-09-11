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
		hasUnpublishedChanges: false,
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

	it('shows an empty state when the app has no source yet', async () => {
		appsStore.fetchAppDraftFiles.mockResolvedValue(null);
		const { getByText } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1' },
		});
		await waitAllPromises();

		expect(
			getByText('Ask the AI Assistant to create this app to see its source files here'),
		).toBeInTheDocument();
		expect(appsStore.fetchAppVersionFileContent).not.toHaveBeenCalled();
	});

	it('lists the files in a tree and shows a placeholder before any file is selected', async () => {
		appsStore.fetchAppDraftFiles.mockResolvedValue({ versionId: 'v-1', files: ['main.ts', 'index.html'] });
		const { getByText, queryByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1' },
		});
		await waitAllPromises();

		expect(appsStore.fetchAppDraftFiles).toHaveBeenCalledWith('proj-1', 'app-1');
		expect(getByText('main.ts')).toBeInTheDocument();
		expect(getByText('index.html')).toBeInTheDocument();
		expect(getByText('Select a file to view its contents')).toBeInTheDocument();
		expect(queryByTestId('file-code-viewer-stub')).not.toBeInTheDocument();
	});

	it("loads a clicked file's content into the viewer", async () => {
		appsStore.fetchAppDraftFiles.mockResolvedValue({ versionId: 'v-1', files: ['main.ts'] });
		appsStore.fetchAppVersionFileContent.mockResolvedValue('export {};');
		const { getByText, getByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1' },
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
		appsStore.fetchAppDraftFiles.mockResolvedValue({ versionId: 'v-1', files: ['a.ts', 'b.ts'] });
		let resolveA: (content: string) => void = () => {};
		appsStore.fetchAppVersionFileContent.mockImplementationOnce(
			async () => await new Promise((resolve) => (resolveA = resolve)),
		);
		const { getByText, getByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1' },
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
		appsStore.fetchAppDraftFiles.mockRejectedValue(new Error('boom'));
		renderViewer({ props: { projectId: 'proj-1', appId: 'app-1' } });
		await waitAllPromises();

		expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Error loading file');
	});

	it('enables Save only once the file is edited, and disables it again after a successful save', async () => {
		appsStore.fetchAppDraftFiles.mockResolvedValue({ versionId: 'v-1', files: ['main.ts'] });
		appsStore.fetchAppVersionFileContent.mockResolvedValue('export {};');
		appsStore.saveAppDraftFile.mockResolvedValue(makeApp({ activeVersionId: 'v-3' }));
		const { getByText, getByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1' },
		});
		await waitAllPromises();
		await userEvent.click(getByText('main.ts'));
		await waitAllPromises();

		expect(getByTestId('app-code-save')).toHaveAttribute('aria-disabled', 'true');

		await userEvent.click(getByTestId('fcv-edit'));
		expect(getByTestId('app-code-save')).not.toHaveAttribute('aria-disabled', 'true');

		await userEvent.click(getByTestId('app-code-save'));
		await waitAllPromises();

		expect(appsStore.saveAppDraftFile).toHaveBeenCalledWith(
			'proj-1',
			'app-1',
			'main.ts',
			'export {};!',
		);
		expect(getByTestId('app-code-save')).toHaveAttribute('aria-disabled', 'true');
	});

	it('emits saved with the updated app on a successful save', async () => {
		appsStore.fetchAppDraftFiles.mockResolvedValue({ versionId: 'v-1', files: ['main.ts'] });
		appsStore.fetchAppVersionFileContent.mockResolvedValue('export {};');
		const updated = makeApp({ activeVersionId: 'v-3' });
		appsStore.saveAppDraftFile.mockResolvedValue(updated);
		const { getByText, getByTestId, emitted } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1' },
		});
		await waitAllPromises();
		await userEvent.click(getByText('main.ts'));
		await waitAllPromises();
		await userEvent.click(getByTestId('fcv-edit'));

		await userEvent.click(getByTestId('app-code-save'));
		await waitAllPromises();

		expect(emitted().saved[0]).toEqual([updated]);
	});

	it('shows the save error and keeps the edited content when saving fails', async () => {
		appsStore.fetchAppDraftFiles.mockResolvedValue({ versionId: 'v-1', files: ['main.ts'] });
		appsStore.fetchAppVersionFileContent.mockResolvedValue('export {};');
		appsStore.saveAppDraftFile.mockRejectedValue(new Error("Could not find the file: 'main.ts'"));
		const { getByText, getByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1' },
		});
		await waitAllPromises();
		await userEvent.click(getByText('main.ts'));
		await waitAllPromises();
		await userEvent.click(getByTestId('fcv-edit'));

		await userEvent.click(getByTestId('app-code-save'));
		await waitAllPromises();

		expect(getByTestId('app-code-save-error')).toHaveTextContent("Could not find the file: 'main.ts'");
		expect(getByTestId('fcv-content')).toHaveTextContent('main.ts:export {};!');
		expect(getByTestId('app-code-save')).not.toHaveAttribute('aria-disabled', 'true');
	});

	it('keeps the current file when the user cancels the discard confirmation', async () => {
		appsStore.fetchAppDraftFiles.mockResolvedValue({ versionId: 'v-1', files: ['a.ts', 'b.ts'] });
		appsStore.fetchAppVersionFileContent.mockImplementation(async (_p, _a, _v, path) =>
			path === 'a.ts' ? 'a content' : 'b content',
		);
		confirm.mockResolvedValue('cancel');
		const { getByText, getByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1' },
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
		appsStore.fetchAppDraftFiles.mockResolvedValue({ versionId: 'v-1', files: ['a.ts', 'b.ts'] });
		appsStore.fetchAppVersionFileContent.mockImplementation(async (_p, _a, _v, path) =>
			path === 'a.ts' ? 'a content' : 'b content',
		);
		confirm.mockResolvedValue('confirm');
		const { getByText, getByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1' },
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

	it('clears the buffer immediately when appId changes, before the new app has loaded', async () => {
		appsStore.fetchAppDraftFiles.mockResolvedValue({ versionId: 'v-1', files: ['main.ts'] });
		appsStore.fetchAppVersionFileContent.mockResolvedValue('export {};');
		const { getByText, getByTestId, queryByTestId, rerender } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1' },
		});
		await waitAllPromises();
		await userEvent.click(getByText('main.ts'));
		await waitAllPromises();
		await userEvent.click(getByTestId('fcv-edit'));
		expect(getByTestId('file-code-viewer-stub')).toBeInTheDocument();

		await rerender({ projectId: 'proj-2', appId: 'app-2' });

		expect(queryByTestId('file-code-viewer-stub')).not.toBeInTheDocument();
		expect(getByText('Select a file to view its contents')).toBeInTheDocument();
	});

	it('does not apply an in-flight save result after appId changes before it resolves', async () => {
		appsStore.fetchAppDraftFiles.mockResolvedValue({ versionId: 'v-1', files: ['main.ts'] });
		appsStore.fetchAppVersionFileContent.mockResolvedValue('export {};');
		let resolveSave: (app: App) => void = () => {};
		appsStore.saveAppDraftFile.mockImplementation(
			async () => await new Promise((resolve) => (resolveSave = resolve)),
		);
		const { getByText, getByTestId, emitted, rerender } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1' },
		});
		await waitAllPromises();
		await userEvent.click(getByText('main.ts'));
		await waitAllPromises();
		await userEvent.click(getByTestId('fcv-edit'));
		await userEvent.click(getByTestId('app-code-save'));

		// Switch apps while app-1's save is still in flight.
		await rerender({ projectId: 'proj-2', appId: 'app-2' });
		resolveSave(makeApp({ id: 'app-1', activeVersionId: 'v-99' }));
		await waitAllPromises();

		expect(emitted().saved).toBeUndefined();
	});

	it('ignores an older file-list response that resolves after a newer one', async () => {
		let resolveV1: (files: string[]) => void = () => {};
		const draft = (files: string[]) => ({ versionId: 'v-1', files });
		appsStore.fetchAppDraftFiles.mockImplementationOnce(
			async () => await new Promise<string[]>((resolve) => (resolveV1 = resolve)).then(draft),
		);
		const { queryByText, rerender } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1', refreshKey: 0 },
		});
		await waitAllPromises();

		let resolveV2: (files: string[]) => void = () => {};
		appsStore.fetchAppDraftFiles.mockImplementationOnce(
			async () => await new Promise<string[]>((resolve) => (resolveV2 = resolve)).then(draft),
		);
		await rerender({ projectId: 'proj-1', appId: 'app-1', refreshKey: 1 });

		// Resolve out of order: the newer request first, then the stale one.
		resolveV2(['v2-file.ts']);
		await waitAllPromises();
		resolveV1(['v1-file.ts']);
		await waitAllPromises();

		expect(queryByText('v2-file.ts')).toBeInTheDocument();
		expect(queryByText('v1-file.ts')).not.toBeInTheDocument();
	});

	it('shows a loading indicator instead of an empty tree while the first file list request is pending', async () => {
		let resolveFiles: (files: string[]) => void = () => {};
		appsStore.fetchAppDraftFiles.mockImplementationOnce(
			async () =>
				await new Promise<string[]>((resolve) => (resolveFiles = resolve)).then((files) => ({
					versionId: 'v-1',
					files,
				})),
		);
		const { getByTestId, queryByTestId } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1' },
		});
		await waitAllPromises();

		expect(getByTestId('app-code-tree-loading')).toBeInTheDocument();
		expect(queryByTestId('app-code-tree')).not.toBeInTheDocument();

		resolveFiles(['main.ts']);
		await waitAllPromises();

		expect(queryByTestId('app-code-tree-loading')).not.toBeInTheDocument();
		expect(getByTestId('app-code-tree')).toBeInTheDocument();
	});

	it('reloads the list on refreshKey but keeps unsaved edits in the open file', async () => {
		appsStore.fetchAppDraftFiles.mockResolvedValue({ versionId: 'v-1', files: ['main.ts'] });
		appsStore.fetchAppVersionFileContent.mockResolvedValue('export {};');
		const { getByText, getByTestId, rerender } = renderViewer({
			props: { projectId: 'proj-1', appId: 'app-1', refreshKey: 0 },
		});
		await waitAllPromises();
		await userEvent.click(getByText('main.ts'));
		await waitAllPromises();
		await userEvent.click(getByTestId('fcv-edit'));

		appsStore.fetchAppDraftFiles.mockResolvedValue({
			versionId: 'v-2',
			files: ['main.ts', 'new.ts'],
		});
		await rerender({ projectId: 'proj-1', appId: 'app-1', refreshKey: 1 });
		await waitAllPromises();

		expect(getByText('new.ts')).toBeInTheDocument();
		expect(appsStore.fetchAppVersionFileContent).toHaveBeenCalledTimes(1);
		expect(getByTestId('fcv-content')).toHaveTextContent('main.ts:export {};!');
	});
});
