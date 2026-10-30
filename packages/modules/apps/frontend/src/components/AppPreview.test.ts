import type { AppBuildStatus, AppResponse, AppVersionResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { createAppPreview, getAppBuild, listAppVersions } from '../apps.api';
import AppPreview from './AppPreview.vue';

vi.mock('../apps.api');

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

const app = (draftVersionId: string | null = 'v2'): AppResponse => ({
	id: 'app-1',
	projectId: 'project-1',
	name: 'Sales',
	namespace: 'sales',
	visibility: 'project',
	draftVersionId,
	publishedVersionId: null,
	publishedUrl: null,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-02T10:00:00.000Z',
});

const version = (id: string, buildStatus: AppBuildStatus): AppVersionResponse => ({
	id,
	appId: 'app-1',
	label: `Label ${id}`,
	sourceArtifactId: 1,
	bundleArtifactId: buildStatus === 'succeeded' ? 2 : null,
	buildStatus,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-01T10:00:00.000Z',
});

let grants = 0;

const renderComponent = createComponentRenderer(AppPreview, {
	props: { projectId: 'project-1', app: app() },
});

describe('AppPreview', () => {
	beforeEach(() => {
		grants = 0;
		vi.mocked(createAppPreview).mockImplementation(async (_ctx, _p, _a, versionId) => ({
			url: `https://sales--preview.apps.example.com/_n8n/preview?code=${versionId}-${++grants}`,
		}));
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
		vi.useRealTimers();
		delete document.body.dataset.theme;
	});

	it('shows the newest successful version with a new grant', async () => {
		vi.mocked(listAppVersions).mockResolvedValue([
			version('v3', 'failed'),
			version('v2', 'succeeded'),
			version('v1', 'succeeded'),
		]);
		const { findByTestId, getByTestId } = renderComponent();

		const frame = await findByTestId('app-preview-frame');

		expect(frame).toHaveAttribute('src', expect.stringContaining('code=v2-1'));
		expect(frame.getAttribute('sandbox')).not.toContain('allow-top-navigation');
		expect(createAppPreview).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1', 'v2');
		expect(getByTestId('app-preview-version')).toHaveTextContent('Label v2');
		expect(getByTestId('app-preview-status')).toHaveTextContent('Build failed');
	});

	it('shows an empty state when the app has no build', async () => {
		vi.mocked(listAppVersions).mockResolvedValue([]);
		const { findByTestId } = renderComponent({ props: { app: app(null) } });

		expect(await findByTestId('app-preview-empty')).toBeInTheDocument();
		expect(createAppPreview).not.toHaveBeenCalled();
	});

	it('polls while a build runs and shows the new version when it succeeds', async () => {
		vi.useFakeTimers();
		vi.mocked(listAppVersions).mockResolvedValueOnce([version('v1', 'running')]);
		vi.mocked(getAppBuild).mockResolvedValueOnce({
			versionId: 'v1',
			status: 'running',
			attempts: 1,
			statusUpdatedAt: null,
		});
		vi.mocked(getAppBuild).mockResolvedValueOnce({
			versionId: 'v1',
			status: 'succeeded',
			attempts: 1,
			statusUpdatedAt: null,
		});
		const { findByTestId, getByTestId } = renderComponent();

		expect(await findByTestId('app-preview-first-build')).toBeInTheDocument();
		expect(getByTestId('app-preview-status')).toHaveTextContent('Building');

		await vi.advanceTimersByTimeAsync(3000);
		expect(getAppBuild).toHaveBeenCalledTimes(1);

		vi.mocked(listAppVersions).mockResolvedValueOnce([version('v1', 'succeeded')]);
		await vi.advanceTimersByTimeAsync(3000);

		expect(await findByTestId('app-preview-frame')).toHaveAttribute(
			'src',
			expect.stringContaining('code=v1-1'),
		);
		await vi.advanceTimersByTimeAsync(9000);
		expect(getAppBuild).toHaveBeenCalledTimes(2);
	});

	it('keeps the previous preview while a newer build runs', async () => {
		vi.useFakeTimers();
		vi.mocked(listAppVersions).mockResolvedValue([
			version('v2', 'queued'),
			version('v1', 'succeeded'),
		]);
		const { findByTestId, getByTestId } = renderComponent();

		expect(await findByTestId('app-preview-frame')).toHaveAttribute(
			'src',
			expect.stringContaining('code=v1-1'),
		);
		expect(getByTestId('app-preview-status')).toHaveTextContent('Building');
	});

	it('keeps the frame when a new draft does not change the shown version', async () => {
		vi.mocked(listAppVersions).mockResolvedValue([version('v2', 'succeeded')]);
		const { findByTestId, getByTestId, rerender } = renderComponent();
		const frame = await findByTestId('app-preview-frame');

		vi.mocked(listAppVersions).mockResolvedValue([
			version('v3', 'failed'),
			version('v2', 'succeeded'),
		]);
		await rerender({ app: app('v3') });

		await waitFor(() =>
			expect(getByTestId('app-preview-status')).toHaveTextContent('Build failed'),
		);
		expect(getByTestId('app-preview-frame')).toBe(frame);
		expect(createAppPreview).toHaveBeenCalledOnce();
	});

	it('shows a new draft version with a new grant', async () => {
		vi.mocked(listAppVersions).mockResolvedValue([version('v2', 'succeeded')]);
		const { findByTestId, getByTestId, rerender } = renderComponent();
		await findByTestId('app-preview-frame');

		vi.mocked(listAppVersions).mockResolvedValue([
			version('v3', 'succeeded'),
			version('v2', 'succeeded'),
		]);
		await rerender({ app: app('v3') });

		await waitFor(() =>
			expect(getByTestId('app-preview-frame')).toHaveAttribute(
				'src',
				expect.stringContaining('code=v3-2'),
			),
		);
	});

	it('requests a new grant for the same version on reload', async () => {
		vi.mocked(listAppVersions).mockResolvedValue([version('v2', 'succeeded')]);
		const { findByTestId, getByTestId } = renderComponent();
		await findByTestId('app-preview-frame');

		await userEvent.click(getByTestId('app-preview-reload'));

		await waitFor(() =>
			expect(getByTestId('app-preview-frame')).toHaveAttribute(
				'src',
				expect.stringContaining('code=v2-2'),
			),
		);
	});

	it('requests a new grant 55 minutes after the last one', async () => {
		vi.useFakeTimers();
		vi.mocked(listAppVersions).mockResolvedValue([version('v2', 'succeeded')]);
		const { findByTestId, getByTestId } = renderComponent();
		await findByTestId('app-preview-frame');

		await vi.advanceTimersByTimeAsync(54 * 60 * 1000);
		expect(createAppPreview).toHaveBeenCalledOnce();

		await vi.advanceTimersByTimeAsync(60 * 1000);
		expect(getByTestId('app-preview-frame')).toHaveAttribute(
			'src',
			expect.stringContaining('code=v2-2'),
		);
	});

	it('keeps the preview and shows a toast when a reload fails', async () => {
		vi.mocked(listAppVersions).mockResolvedValue([version('v2', 'succeeded')]);
		const { findByTestId, getByTestId, queryByTestId } = renderComponent();
		const frame = await findByTestId('app-preview-frame');

		vi.mocked(listAppVersions).mockRejectedValue(new Error('offline'));
		await userEvent.click(getByTestId('app-preview-reload'));

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Could not load the preview'),
		);
		expect(getByTestId('app-preview-frame')).toBe(frame);
		expect(queryByTestId('app-preview-error')).not.toBeInTheDocument();
	});

	it('shows a build failed state when no version has built', async () => {
		vi.mocked(listAppVersions).mockResolvedValue([version('v1', 'failed')]);
		const { findByTestId, queryByTestId } = renderComponent();

		expect(await findByTestId('app-preview-build-failed')).toBeInTheDocument();
		expect(queryByTestId('app-preview-empty')).not.toBeInTheDocument();
	});

	it('labels a version without a label by the end of its id', async () => {
		vi.mocked(listAppVersions).mockResolvedValue([
			{ ...version('01234567-89ab-7cde-8f01-23456789abcd', 'succeeded'), label: null },
		]);
		const { findByTestId } = renderComponent();

		expect(await findByTestId('app-preview-version')).toHaveTextContent('Version 6789abcd');
	});

	it('opens the preview in a new tab with a new grant', async () => {
		vi.mocked(listAppVersions).mockResolvedValue([version('v2', 'succeeded')]);
		const tab = { opener: {}, location: { href: '' }, close: vi.fn() };
		const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
		const { findByTestId, getByTestId } = renderComponent();
		await findByTestId('app-preview-frame');

		await userEvent.click(getByTestId('app-preview-open'));

		expect(open).toHaveBeenCalledWith('about:blank', '_blank');
		await waitFor(() => expect(tab.location.href).toContain('code=v2-2'));
		expect(tab.opener).toBeNull();
	});

	it('changes the frame width with the screen size', async () => {
		vi.mocked(listAppVersions).mockResolvedValue([version('v2', 'succeeded')]);
		const { findByTestId, getByText } = renderComponent();
		const frame = await findByTestId('app-preview-frame');
		expect(frame).toHaveStyle({ width: '100%' });

		await userEvent.click(getByText('Mobile'));

		expect(frame).toHaveStyle({ width: '375px' });
	});

	it('starts with the editor theme and switches the color scheme of the frame', async () => {
		document.body.dataset.theme = 'dark';
		vi.mocked(listAppVersions).mockResolvedValue([version('v2', 'succeeded')]);
		const { findByTestId, getByText } = renderComponent();
		const frame = await findByTestId('app-preview-frame');
		expect(frame).toHaveStyle({ colorScheme: 'dark' });

		await userEvent.click(getByText('Light'));

		expect(frame).toHaveStyle({ colorScheme: 'light' });
	});

	it('shows an error state when the grant fails', async () => {
		vi.mocked(listAppVersions).mockResolvedValue([version('v2', 'succeeded')]);
		vi.mocked(createAppPreview).mockRejectedValue(new Error('denied'));
		const { findByTestId } = renderComponent();

		expect(await findByTestId('app-preview-error')).toBeInTheDocument();
		expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Could not load the preview');
	});
});
