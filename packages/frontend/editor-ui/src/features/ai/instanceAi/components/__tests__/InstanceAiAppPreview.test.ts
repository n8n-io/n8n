import type { AppPreviewStatus, InstanceAiAppPreviewDiagnostic } from '@n8n/api-types';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InstanceAiAppPreview from '../InstanceAiAppPreview.vue';

const threadState = {
	id: 'thread-1',
	producedArtifacts: new Map([
		['app-1', { type: 'app', id: 'app-1', name: 'Greeter', projectId: 'proj-1' }],
	]),
};
const metadataState = ref<Record<string, unknown>>();
const updateThreadMetadataMock = vi.fn(
	async (_threadId: string, metadata: Record<string, unknown>) => {
		metadataState.value = { ...metadataState.value, ...metadata };
	},
);

const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

vi.mock('../../instanceAi.store', () => ({
	useThread: () => threadState,
	useInstanceAiStore: () => ({
		getThreadMetadata: () => metadataState.value,
		updateThreadMetadata: updateThreadMetadataMock,
	}),
}));

const liveStatus = ref<AppPreviewStatus>();
const useAppLivePreviewMock = vi.fn(() => ({
	status: liveStatus,
	liveUrl: computed(() =>
		liveStatus.value?.status === 'ready' ? liveStatus.value.url : undefined,
	),
	reason: computed(() => undefined),
}));
vi.mock('@/features/apps/composables/useAppLivePreview', () => ({
	useAppLivePreview: (...args: unknown[]) => useAppLivePreviewMock(...(args as [])),
}));

const AppDetailsViewStub = {
	name: 'AppDetailsView',
	props: {
		artifactMode: Boolean,
		projectId: String,
		appId: String,
		artifactVersionId: String,
		liveUrl: String,
		liveStatus: Object,
	},
	emits: ['diagnostic'],
	template:
		'<div data-test-id="app-details-view-stub" :data-artifact-mode="String(artifactMode)" :data-app-id="appId" :data-project-id="projectId" :data-version-id="artifactVersionId" :data-live-url="liveUrl" :data-live-status="liveStatus?.status" @click="$emit(\'diagnostic\', { kind: \'uncaught\', message: \'boom\', at: \'2026-09-08T10:00:00.000Z\' })" />',
};

const diagnostics = { add: vi.fn<(item: InstanceAiAppPreviewDiagnostic) => void>() };

function mountPreview(props: Partial<InstanceType<typeof InstanceAiAppPreview>['$props']> = {}) {
	return mount(InstanceAiAppPreview, {
		props: { appId: 'app-1', projectId: 'proj-1', ...props },
		global: {
			stubs: { AppDetailsView: AppDetailsViewStub },
			provide: { appPreviewDiagnostics: diagnostics },
		},
	});
}

describe('InstanceAiAppPreview', () => {
	beforeEach(() => {
		metadataState.value = undefined;
		liveStatus.value = undefined;
		updateThreadMetadataMock.mockClear();
		useAppLivePreviewMock.mockClear();
		diagnostics.add.mockClear();
		showError.mockClear();
	});

	it('runs the live preview for this thread and hands its state to the details view', async () => {
		liveStatus.value = { status: 'starting' };
		const wrapper = mountPreview({ versionId: 'v-1' });

		const [target] = useAppLivePreviewMock.mock.calls[0] as unknown as [
			{ projectId: () => string; appId: () => string; threadId: () => string },
		];
		expect([target.projectId(), target.appId(), target.threadId()]).toEqual([
			'proj-1',
			'app-1',
			'thread-1',
		]);

		const view = wrapper.get('[data-test-id="app-details-view-stub"]');
		expect(view.attributes('data-live-status')).toBe('starting');
		expect(view.attributes('data-live-url')).toBeUndefined();

		liveStatus.value = {
			status: 'ready',
			url: '/apps-preview/tok/',
			expiresAt: '2026-09-09T00:00:00Z',
		};
		await flushPromises();
		expect(view.attributes('data-live-url')).toBe('/apps-preview/tok/');
	});

	it('pushes frame diagnostics into the thread buffer', async () => {
		const wrapper = mountPreview();

		await wrapper.get('[data-test-id="app-details-view-stub"]').trigger('click');

		expect(diagnostics.add).toHaveBeenCalledWith({
			kind: 'uncaught',
			message: 'boom',
			at: '2026-09-08T10:00:00.000Z',
		});
	});

	it('hosts the app details view in artifact mode with the built version', () => {
		const wrapper = mountPreview({ versionId: 'v-1' });

		const view = wrapper.get('[data-test-id="app-details-view-stub"]');
		expect(view.attributes('data-artifact-mode')).toBe('true');
		expect(view.attributes('data-app-id')).toBe('app-1');
		expect(view.attributes('data-project-id')).toBe('proj-1');
		expect(view.attributes('data-version-id')).toBe('v-1');
	});

	it('binds the thread to the shown app when no target is recorded yet', async () => {
		mountPreview();
		await flushPromises();

		expect(updateThreadMetadataMock).toHaveBeenCalledWith('thread-1', {
			instanceAiAppBuilderTarget: { appId: 'app-1', projectId: 'proj-1', name: 'Greeter' },
		});
	});

	it('leaves the recorded target alone when it already points at this app', async () => {
		metadataState.value = {
			instanceAiAppBuilderTarget: { appId: 'app-1', projectId: 'proj-1', name: 'Greeter' },
		};

		mountPreview();
		await flushPromises();

		expect(updateThreadMetadataMock).not.toHaveBeenCalled();
	});

	it('toasts instead of throwing when binding the thread fails', async () => {
		const failure = new Error('offline');
		updateThreadMetadataMock.mockRejectedValueOnce(failure);

		mountPreview();
		await flushPromises();

		expect(showError).toHaveBeenCalledWith(failure, 'Something went wrong');
	});

	it('shows the building indicator while an apps build call is in flight', () => {
		const wrapper = mountPreview({ versionId: 'v-1', building: true });

		expect(wrapper.find('[data-test-id="instance-ai-app-building-indicator"]').exists()).toBe(true);
	});
});
