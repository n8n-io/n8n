import type { AppBuildStatus, AppVersionResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { capabilityRegistry } from '@n8n/frontend-module-sdk';
import { ResponseError } from '@n8n/rest-api-client';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';
import { computed, ref } from 'vue';

import { providePermissions, testApp, testVersion } from '../../__tests__/fixtures';
import { listAppVersions, restoreAppVersion } from '../../apps.api';
import type { AppVersions } from '../../composables/useAppVersions';
import AppVersionsPanel from './AppVersionsPanel.vue';

vi.mock('../../apps.api');

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

const version = (
	id: string,
	buildStatus: AppBuildStatus = 'succeeded',
	overrides: Partial<AppVersionResponse> = {},
): AppVersionResponse => ({ ...testVersion, id, buildStatus, ...overrides });

function fakeVersions(
	list: AppVersionResponse[],
	{ failed = false, loading = false } = {},
): AppVersions {
	const versions = ref(list);
	return {
		versions,
		head: computed(() => versions.value[0] ?? null),
		latestBuilt: computed(() => null),
		building: computed(() => false),
		loading: ref(loading),
		failed: ref(failed),
		refresh: vi.fn(),
	};
}

const renderComponent = createComponentRenderer(AppVersionsPanel, {
	props: { app: testApp({ publishedVersionId: 'v2' }) },
	global: {
		stubs: {
			ActionDropdown: {
				props: ['items'],
				emits: ['select'],
				template: `<div>
					<button
						v-for="item in items"
						:key="item.id"
						:disabled="item.disabled"
						:data-test-id="'app-version-' + item.id"
						@click="$emit('select', item.id)"
					><slot name="menuItem" v-bind="item" /></button>
				</div>`,
			},
			N8nTooltip: {
				props: ['content', 'disabled'],
				template: '<span :data-tooltip="disabled ? undefined : content"><slot /></span>',
			},
			AppPublishDialog: {
				props: ['open', 'app', 'version'],
				emits: ['updated'],
				template: `<div v-if="open" data-test-id="publish-dialog">
					{{ version.id }}
					<button data-test-id="publish-confirm" @click="$emit('updated', { ...app, publishedVersionId: version.id })" />
				</div>`,
			},
		},
	},
});

function rows() {
	return screen.getAllByTestId('app-version-row');
}

function publishButton(row: HTMLElement) {
	return row.querySelector<HTMLButtonElement>('[data-test-id="app-version-publish"]');
}

function restoreButton(row: HTMLElement) {
	return row.querySelector<HTMLButtonElement>('[data-test-id="app-version-restore"]');
}

function tooltip(button: HTMLElement | null) {
	return button?.querySelector('[data-tooltip]')?.getAttribute('data-tooltip');
}

describe('AppVersionsPanel', () => {
	afterEach(() => {
		capabilityRegistry.clear();
		vi.clearAllMocks();
	});

	it('lists the versions with their label and marks the published one', () => {
		providePermissions(['app:update']);
		renderComponent({
			props: {
				versions: fakeVersions([
					version('version-3', 'succeeded', { label: 'Launch' }),
					version('v2'),
				]),
			},
		});

		const [newest, published] = rows();
		expect(newest).toHaveTextContent('Launch');
		expect(publishButton(newest)).toBeEnabled();
		expect(published).toHaveTextContent('v2');
		expect(published.querySelector('[data-test-id="app-version-published"]')).not.toBeNull();
		expect(publishButton(published)).toBeNull();
		expect(listAppVersions).not.toHaveBeenCalled();
	});

	it('shows the empty state without versions', () => {
		providePermissions(['app:update']);
		renderComponent({ props: { versions: fakeVersions([]) } });

		expect(screen.getByTestId('app-versions-empty')).toBeInTheDocument();
	});

	it('shows an error with a retry when the versions cannot load', async () => {
		providePermissions(['app:update']);
		const versions = fakeVersions([], { failed: true });
		renderComponent({ props: { versions } });

		expect(screen.queryByTestId('app-versions-empty')).not.toBeInTheDocument();
		await userEvent.click(screen.getByTestId('app-versions-retry'));

		expect(versions.refresh).toHaveBeenCalled();
	});

	it('shows the loading state while the first load runs', () => {
		providePermissions(['app:update']);
		renderComponent({ props: { versions: fakeVersions([], { loading: true }) } });

		expect(screen.getByTestId('app-versions-loading')).toBeInTheDocument();
		expect(screen.queryByTestId('app-versions-empty')).not.toBeInTheDocument();
	});

	it('keeps the loaded versions when a later reload fails', () => {
		providePermissions(['app:update']);
		renderComponent({ props: { versions: fakeVersions([version('v1')], { failed: true }) } });

		expect(rows()).toHaveLength(1);
		expect(screen.queryByTestId('app-versions-error')).not.toBeInTheDocument();
	});

	it('closes', async () => {
		providePermissions(['app:update']);
		const { emitted } = renderComponent({ props: { versions: fakeVersions([]) } });

		await userEvent.click(screen.getByTestId('app-versions-close'));

		expect(emitted('close')).toHaveLength(1);
	});

	it('publishes an older version through the publish dialog', async () => {
		providePermissions(['app:update']);
		const { emitted } = renderComponent({
			props: { versions: fakeVersions([version('v3'), version('v2'), version('v1')]) },
		});

		await userEvent.click(publishButton(rows()[2])!);
		expect(screen.getByTestId('publish-dialog')).toHaveTextContent('v1');
		await userEvent.click(screen.getByTestId('publish-confirm'));

		expect(emitted('updated')).toEqual([[testApp({ publishedVersionId: 'v1' })]]);
	});

	it.each<[string, AppVersionResponse]>([
		['a failed build', version('v1', 'failed')],
		['a running build', version('v1', 'running')],
		['a pruned bundle', version('v1', 'succeeded', { bundleArtifactId: null })],
	])('disables publish for %s and says why', (_case, row) => {
		providePermissions(['app:update']);
		renderComponent({
			props: { app: testApp({ draftVersionId: 'v1' }), versions: fakeVersions([row]) },
		});

		expect(publishButton(rows()[0])).toBeDisabled();
		expect(publishButton(rows()[0])).toHaveTextContent(/^Publish version$/);
		expect(tooltip(publishButton(rows()[0]))).toBe('This version has no successful build');
	});

	it('points to restore when an older version has no build', () => {
		providePermissions(['app:update']);
		renderComponent({
			props: { versions: fakeVersions([version('v3'), version('v1', 'failed')]) },
		});

		expect(tooltip(publishButton(rows()[1]))).toBe(
			'This version has no successful build. Restore it to build it again.',
		);
	});

	it('offers restore on every version except the current draft', () => {
		providePermissions(['app:update']);
		renderComponent({
			props: {
				app: testApp({ draftVersionId: 'v3', publishedVersionId: 'v2' }),
				versions: fakeVersions([version('v3'), version('v2'), version('v1', 'failed')]),
			},
		});

		const [draft, published, failedBuild] = rows();
		expect(restoreButton(draft)).toBeNull();
		expect(restoreButton(published)).toBeEnabled();
		expect(restoreButton(failedBuild)).toBeEnabled();
	});

	it('restores a version on top of the current draft', async () => {
		providePermissions(['app:update']);
		vi.mocked(restoreAppVersion).mockResolvedValue(version('v4', 'queued'));
		const { emitted } = renderComponent({
			props: { versions: fakeVersions([version('v3'), version('v1')]) },
		});

		await userEvent.click(restoreButton(rows()[1])!);

		await waitFor(() => expect(emitted('restored')).toHaveLength(1));
		expect(restoreAppVersion).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1', 'v1', {
			baseVersionId: 'v2',
		});
	});

	it('shows an error and reloads when the draft changed during a restore', async () => {
		providePermissions(['app:update']);
		vi.mocked(restoreAppVersion).mockRejectedValue(
			new ResponseError('The app draft changed.', { httpStatusCode: 409 }),
		);
		const { emitted } = renderComponent({
			props: { versions: fakeVersions([version('v3'), version('v1')]) },
		});

		await userEvent.click(restoreButton(rows()[1])!);

		await waitFor(() => expect(showError).toHaveBeenCalled());
		expect(emitted('restored')).toHaveLength(1);
	});

	it('shows an error without a reload when a restore fails otherwise', async () => {
		providePermissions(['app:update']);
		vi.mocked(restoreAppVersion).mockRejectedValue(new Error('Network error'));
		const { emitted } = renderComponent({
			props: { versions: fakeVersions([version('v3'), version('v1')]) },
		});

		await userEvent.click(restoreButton(rows()[1])!);

		await waitFor(() => expect(showError).toHaveBeenCalled());
		expect(emitted('restored')).toBeUndefined();
	});

	it('shows the build status and enables publish when the build ends', async () => {
		providePermissions(['app:update']);
		const versions = fakeVersions([version('v3', 'running')]);
		renderComponent({ props: { versions } });
		expect(screen.getByTestId('app-version-status')).toHaveTextContent('Building');

		versions.versions.value = [version('v3', 'succeeded')];

		await waitFor(() => expect(screen.queryByTestId('app-version-status')).toBeNull());
		expect(publishButton(rows()[0])).toBeEnabled();
	});

	it.each<[string, boolean]>([
		['without the update scope', false],
		['in a read-only instance', true],
	])('disables publish and restore %s', (_case, readOnly) => {
		providePermissions(readOnly ? ['app:update'] : ['app:read'], readOnly);
		renderComponent({ props: { versions: fakeVersions([version('v3'), version('v1')]) } });

		const older = rows()[1];
		expect(publishButton(older)).toBeDisabled();
		expect(restoreButton(older)).toBeDisabled();
		expect(tooltip(publishButton(older))).toBe('You do not have permission to change this app');
		expect(tooltip(restoreButton(older))).toBe('You do not have permission to change this app');
	});
});
