import type { AppBuildStatus, AppResponse, AppVersionResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { defineComponent, h, ref } from 'vue';

import { getApp, listAppVersions } from '../apps.api';
import AppView from './AppView.vue';

vi.mock('../apps.api');

const { showError, track } = vi.hoisted(() => ({ showError: vi.fn(), track: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));

const app = (id: string): AppResponse => ({
	id,
	projectId: 'project-1',
	name: `App ${id}`,
	namespace: `app-${id}`,
	visibility: 'project',
	draftVersionId: null,
	publishedVersionId: null,
	publishedUrl: null,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-02T10:00:00.000Z',
});

const version = (id: string, buildStatus: AppBuildStatus): AppVersionResponse => ({
	id,
	appId: 'app-1',
	label: null,
	description: null,
	sourceArtifactId: 1,
	bundleArtifactId: buildStatus === 'succeeded' ? 2 : null,
	buildStatus,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-01T10:00:00.000Z',
});

const globalOptions = {
	stubs: {
		AppHeader: {
			props: ['projectId', 'app', 'tab', 'publishableVersion'],
			emits: ['deleted', 'updated', 'update:tab', 'showVersions'],
			template: `<div>
					<button data-test-id="app-header" @click="$emit('deleted', app?.id)">{{ app?.name }}</button>
					<span data-test-id="publishable-version">{{ publishableVersion?.id }}</span>
					<button data-test-id="publish" @click="$emit('updated', { ...app, name: 'Published app', publishedVersionId: 'v9' })" />
					<button data-test-id="share" @click="$emit('updated', { ...app, visibility: 'public' })" />
					<button data-test-id="configure" @click="$emit('update:tab', 'configure')" />
					<button data-test-id="show-versions" @click="$emit('showVersions')" />
				</div>`,
		},
		AppVersionsPanel: {
			props: ['app', 'versions'],
			emits: ['updated', 'restored', 'close'],
			template: `<div data-test-id="app-versions-panel">
				<button data-test-id="versions-restored" @click="$emit('restored')" />
				<button data-test-id="versions-rollback" @click="$emit('updated', { ...app, name: 'Rolled back', publishedVersionId: 'v0' })" />
				<button data-test-id="versions-close" @click="$emit('close')" />
			</div>`,
		},
		AppPreview: {
			props: ['projectId', 'app', 'versions', 'inspectable', 'elementSelected'],
			emits: ['element-selected'],
			template: `<div data-test-id="app-view-preview">
				{{ app.id }}
				<span data-test-id="preview-inspectable">{{ inspectable }}</span>
				<span data-test-id="preview-element-selected">{{ elementSelected }}</span>
				<button data-test-id="pick" @click="$emit('element-selected', { tagName: 'button' })" />
			</div>`,
		},
		AppConfigure: {
			props: ['app'],
			emits: ['updated'],
			template: `<div data-test-id="app-view-configure">
				<button data-test-id="configure-rename" @click="$emit('updated', { ...app, name: 'Renamed app' })" />
			</div>`,
		},
	},
};

const renderComponent = createComponentRenderer(AppView, {
	props: { projectId: 'project-1', appId: 'app-1' },
	global: globalOptions,
});

const view = ref<{ refresh: () => Promise<void> }>();
const renderWithRef = createComponentRenderer(
	defineComponent(() => () => h(AppView, { ref: view, projectId: 'project-1', appId: 'app-1' })),
	{ global: globalOptions },
);

describe('AppView', () => {
	beforeEach(() => {
		vi.mocked(listAppVersions).mockResolvedValue([]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('shows the app after it loads', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByTestId } = renderComponent();

		expect(getByTestId('app-view-loading')).toBeInTheDocument();
		expect(await findByTestId('app-view-preview')).toBeInTheDocument();
		expect(getByTestId('app-header')).toHaveTextContent('App app-1');
		expect(getByTestId('app-view-preview')).toBeInTheDocument();
		expect(getApp).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1');
	});

	it('passes the inspect props to the preview and re-emits the picked element', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByTestId, emitted } = renderComponent({
			props: { inspectable: true, elementSelected: true },
		});

		await findByTestId('app-view-preview');
		expect(getByTestId('preview-inspectable')).toHaveTextContent('true');
		expect(getByTestId('preview-element-selected')).toHaveTextContent('true');

		await userEvent.click(getByTestId('pick'));

		expect(emitted('element-selected')).toEqual([[{ tagName: 'button' }]]);
	});

	it('shows the not-found state without an error toast for a missing app', async () => {
		vi.mocked(getApp).mockRejectedValue(new ResponseError('Not found', { httpStatusCode: 404 }));
		const { findByTestId, queryByTestId } = renderComponent();

		expect(await findByTestId('app-view-not-found')).toBeInTheDocument();
		expect(queryByTestId('app-header')).not.toBeInTheDocument();
		expect(showError).not.toHaveBeenCalled();
	});

	it('shows an error toast and the not-found state when loading fails', async () => {
		vi.mocked(getApp).mockRejectedValue(new Error('Network error'));
		const { findByTestId } = renderComponent();

		expect(await findByTestId('app-view-not-found')).toBeInTheDocument();
		expect(showError).toHaveBeenCalled();
	});

	it('ignores a response for an app that is no longer shown', async () => {
		let resolveFirst: (value: AppResponse) => void = () => {};
		vi.mocked(getApp)
			.mockImplementationOnce(async () => await new Promise((resolve) => (resolveFirst = resolve)))
			.mockResolvedValueOnce(app('app-2'));
		const { findByTestId, getByTestId, rerender } = renderComponent();

		await rerender({ projectId: 'project-1', appId: 'app-2' });
		await findByTestId('app-view-preview');
		expect(getByTestId('app-header')).toHaveTextContent('App app-2');
		resolveFirst(app('app-1'));
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(getByTestId('app-header')).toHaveTextContent('App app-2');
	});

	it('does not show the previous app while the next app loads', async () => {
		vi.mocked(getApp)
			.mockResolvedValueOnce(app('app-1'))
			.mockReturnValueOnce(new Promise(() => {}));
		const { findByTestId, getByTestId, rerender } = renderComponent();
		await findByTestId('app-view-preview');

		await rerender({ projectId: 'project-1', appId: 'app-2' });

		expect(getByTestId('app-header')).toHaveTextContent('');
		expect(getByTestId('app-view-loading')).toBeInTheDocument();
	});

	it('emits deleted when the app is deleted', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByTestId, emitted } = renderComponent();

		await findByTestId('app-view-preview');
		await userEvent.click(getByTestId('app-header'));

		expect(emitted('deleted')).toEqual([['app-1']]);
	});

	it('switches between the preview and configure tabs', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByTestId, queryByTestId } = renderComponent();
		expect(await findByTestId('app-view-preview')).toBeInTheDocument();

		await userEvent.click(getByTestId('configure'));

		expect(await findByTestId('app-view-configure')).toBeInTheDocument();
		expect(queryByTestId('app-view-preview')).not.toBeInTheDocument();
	});

	it('opens the configure tab from the section', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId } = renderComponent({ props: { section: 'configure' } });

		expect(await findByTestId('app-view-configure')).toBeInTheDocument();
	});

	it('shows the app from a configure update', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByTestId } = renderComponent({ props: { section: 'configure' } });
		await findByTestId('app-view-configure');

		await userEvent.click(getByTestId('configure-rename'));

		expect(getByTestId('app-header')).toHaveTextContent('Renamed app');
	});

	it('emits the section when the tab changes', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByTestId, emitted } = renderComponent();
		await findByTestId('app-view-preview');

		await userEvent.click(getByTestId('configure'));

		expect(emitted('update:section')).toEqual([['configure']]);
	});

	it('passes the newest built version to the header', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		vi.mocked(listAppVersions).mockResolvedValue([
			version('v2', 'running'),
			version('v1', 'succeeded'),
		]);
		const { findByTestId } = renderComponent();

		await waitFor(async () =>
			expect(await findByTestId('publishable-version')).toHaveTextContent('v1'),
		);
		expect(listAppVersions).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1');
	});

	it('shows the app from the header update', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByTestId } = renderComponent();
		await findByTestId('app-view-preview');

		await userEvent.click(getByTestId('publish'));

		expect(getByTestId('app-header')).toHaveTextContent('Published app');
		await waitFor(() => expect(listAppVersions).toHaveBeenCalledTimes(2));
	});

	it('does not reload the versions when the published version stays the same', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByTestId } = renderComponent();
		await findByTestId('app-view-preview');
		await waitFor(() => expect(listAppVersions).toHaveBeenCalledTimes(1));

		await userEvent.click(getByTestId('share'));

		expect(listAppVersions).toHaveBeenCalledTimes(1);
	});

	it('refreshes the app and its versions without the loading state', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByTestId, queryByTestId } = renderWithRef();
		await findByTestId('app-view-preview');
		vi.mocked(getApp).mockResolvedValue({ ...app('app-1'), name: 'Changed by the assistant' });
		vi.mocked(listAppVersions).mockResolvedValue([version('v1', 'succeeded')]);

		const refresh = view.value?.refresh();

		expect(queryByTestId('app-view-loading')).not.toBeInTheDocument();
		await refresh;
		await waitFor(() =>
			expect(getByTestId('app-header')).toHaveTextContent('Changed by the assistant'),
		);
		expect(getByTestId('publishable-version')).toHaveTextContent('v1');
		expect(getByTestId('app-view-preview')).toBeInTheDocument();
	});

	it('tracks the builder open once and not on a refresh', async () => {
		vi.mocked(getApp).mockResolvedValue({ ...app('app-1'), publishedVersionId: 'v1' });
		const { findByTestId } = renderWithRef();
		await findByTestId('app-view-preview');

		await view.value?.refresh();

		expect(track).toHaveBeenCalledExactlyOnceWith(TELEMETRY_EVENT.APPS.USER_OPENED_APP_BUILDER, {
			app_id: 'app-1',
			project_id: 'project-1',
			is_published: true,
		});
	});

	it('does not track the builder open for a missing app', async () => {
		vi.mocked(getApp).mockRejectedValue(new ResponseError('Not found', { httpStatusCode: 404 }));
		const { findByTestId } = renderComponent();
		await findByTestId('app-view-not-found');

		expect(track).not.toHaveBeenCalled();
	});

	it('opens the versions panel from the header and shows its update', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByTestId, queryByTestId } = renderComponent();
		await findByTestId('app-view-preview');
		expect(queryByTestId('app-versions-panel')).not.toBeInTheDocument();

		await userEvent.click(getByTestId('show-versions'));
		await userEvent.click(getByTestId('versions-rollback'));

		expect(getByTestId('app-header')).toHaveTextContent('Rolled back');
		await waitFor(() => expect(listAppVersions).toHaveBeenCalledTimes(2));
		await userEvent.click(getByTestId('versions-close'));
		expect(queryByTestId('app-versions-panel')).not.toBeInTheDocument();
	});

	it('reloads the app and its versions after a restore', async () => {
		vi.mocked(getApp).mockResolvedValue(app('app-1'));
		const { findByTestId, getByTestId } = renderComponent();
		await findByTestId('app-view-preview');
		await userEvent.click(getByTestId('show-versions'));

		await userEvent.click(getByTestId('versions-restored'));

		await waitFor(() => expect(getApp).toHaveBeenCalledTimes(2));
		expect(listAppVersions).toHaveBeenCalledTimes(2);
	});

	it('closes the versions panel when another app opens', async () => {
		vi.mocked(getApp).mockImplementation(async (_context, _projectId, id) => app(id));
		const { findByTestId, getByTestId, queryByTestId, rerender } = renderComponent();
		await findByTestId('app-view-preview');
		await userEvent.click(getByTestId('show-versions'));

		await rerender({ projectId: 'project-1', appId: 'app-2' });

		await waitFor(() => expect(getByTestId('app-header')).toHaveTextContent('App app-2'));
		expect(queryByTestId('app-versions-panel')).not.toBeInTheDocument();
	});
});
