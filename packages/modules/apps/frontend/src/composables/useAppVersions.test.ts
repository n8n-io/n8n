import type { AppBuildStatus, AppVersionResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { defineComponent } from 'vue';

import { getAppBuild, listAppVersions } from '../apps.api';
import { useAppVersions, type AppVersions } from './useAppVersions';

vi.mock('../apps.api');

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

const version = (id: string, buildStatus: AppBuildStatus): AppVersionResponse => ({
	id,
	appId: 'app-1',
	label: null,
	sourceArtifactId: 1,
	bundleArtifactId: buildStatus === 'succeeded' ? 2 : null,
	buildStatus,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-01T10:00:00.000Z',
});

const build = (status: AppBuildStatus) => ({
	versionId: 'v2',
	status,
	attempts: 1,
	statusUpdatedAt: null,
});

let versions: AppVersions;

const renderComposable = createComponentRenderer(
	defineComponent({
		props: { appId: { type: String, default: undefined } },
		setup(props) {
			versions = useAppVersions('project-1', () => props.appId);
			return () => null;
		},
	}),
	{ props: { appId: 'app-1' } },
);

describe('useAppVersions', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it('picks the newest version and the newest built version', async () => {
		vi.mocked(listAppVersions).mockResolvedValue([
			version('v3', 'failed'),
			version('v2', 'succeeded'),
			version('v1', 'succeeded'),
		]);
		renderComposable();

		await vi.waitFor(() => expect(versions.latestBuilt.value?.id).toBe('v2'));
		expect(versions.head.value?.id).toBe('v3');
		expect(versions.building.value).toBe(false);
		expect(listAppVersions).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1');
	});

	it('polls while the newest build runs and refreshes when it ends', async () => {
		vi.mocked(listAppVersions).mockResolvedValueOnce([
			version('v2', 'running'),
			version('v1', 'succeeded'),
		]);
		vi.mocked(getAppBuild)
			.mockResolvedValueOnce(build('running'))
			.mockResolvedValueOnce(build('succeeded'));
		renderComposable();
		await vi.waitFor(() => expect(versions.building.value).toBe(true));

		await vi.advanceTimersByTimeAsync(3000);
		expect(getAppBuild).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1', 'v2');
		expect(listAppVersions).toHaveBeenCalledOnce();

		vi.mocked(listAppVersions).mockResolvedValueOnce([
			version('v2', 'succeeded'),
			version('v1', 'succeeded'),
		]);
		await vi.advanceTimersByTimeAsync(3000);

		expect(versions.latestBuilt.value?.id).toBe('v2');
		expect(versions.building.value).toBe(false);
		await vi.advanceTimersByTimeAsync(9000);
		expect(getAppBuild).toHaveBeenCalledTimes(2);
	});

	it('stops polling when the component unmounts', async () => {
		vi.mocked(listAppVersions).mockResolvedValue([version('v2', 'queued')]);
		const { unmount } = renderComposable();
		await vi.waitFor(() => expect(versions.building.value).toBe(true));

		unmount();
		await vi.advanceTimersByTimeAsync(9000);

		expect(getAppBuild).not.toHaveBeenCalled();
	});

	it('clears the versions without an app', async () => {
		vi.mocked(listAppVersions).mockResolvedValue([version('v1', 'succeeded')]);
		const { rerender } = renderComposable();
		await vi.waitFor(() => expect(versions.latestBuilt.value?.id).toBe('v1'));

		await rerender({ appId: undefined });

		expect(versions.versions.value).toEqual([]);
		expect(listAppVersions).toHaveBeenCalledOnce();
	});

	it('marks the versions as failed and shows a toast when the list fails', async () => {
		vi.mocked(listAppVersions).mockRejectedValue(new Error('offline'));
		renderComposable();

		await vi.waitFor(() => expect(versions.failed.value).toBe(true));
		expect(versions.loading.value).toBe(false);
		expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Could not load the app versions');
	});

	it('clears the failed state when the next refresh starts', async () => {
		vi.mocked(listAppVersions).mockRejectedValueOnce(new Error('offline'));
		renderComposable();
		await vi.waitFor(() => expect(versions.failed.value).toBe(true));
		vi.mocked(listAppVersions).mockReturnValueOnce(new Promise(() => {}));

		void versions.refresh();

		expect(versions.failed.value).toBe(false);
		expect(versions.loading.value).toBe(true);
	});
});
