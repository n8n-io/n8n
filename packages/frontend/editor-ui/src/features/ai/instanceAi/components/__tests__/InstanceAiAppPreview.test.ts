import type {
	AppPreviewStatus,
	InstanceAiAgentNode,
	InstanceAiAppPreviewDiagnostic,
} from '@n8n/api-types';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, reactive, ref, type Ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from '@/features/apps/apps.types';
import InstanceAiAppPreview from '../InstanceAiAppPreview.vue';

const appEdit = (toolCallId: string, path: string): InstanceAiAgentNode => ({
	agentId: 'agent-1',
	role: 'orchestrator',
	status: 'active',
	textContent: '',
	reasoning: '',
	toolCalls: [{ toolCallId, toolName: 'workspace_write_file', args: { path }, isLoading: true }],
	children: [],
	timeline: [],
});

const threadState = reactive({
	id: 'thread-1',
	isStreaming: false,
	producedArtifacts: new Map<
		string,
		{ type: string; id: string; name: string; projectId: string; namespace?: string }
	>([['app-1', { type: 'app', id: 'app-1', name: 'Greeter', projectId: 'proj-1' }]]),
	messages: [] as Array<{ agentTree?: InstanceAiAgentNode }>,
});
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
const settledCount = ref(0);
const previewAhead = ref(false);
const markPreviewPublished = vi.fn();
const useAppLivePreviewMock = vi.fn(() => ({
	status: liveStatus,
	liveUrl: computed(() =>
		liveStatus.value?.status === 'ready' ? liveStatus.value.url : undefined,
	),
	reason: computed(() => undefined),
	settledCount,
	previewAhead,
	markPreviewPublished,
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
		refreshKey: Number,
		draftDirty: Boolean,
	},
	emits: ['diagnostic', 'app-loaded'],
	template:
		'<div data-test-id="app-details-view-stub" :data-artifact-mode="String(artifactMode)" :data-app-id="appId" :data-project-id="projectId" :data-version-id="artifactVersionId" :data-live-url="liveUrl" :data-live-status="liveStatus?.status" :data-refresh-key="refreshKey" :data-draft-dirty="String(draftDirty)" @click="$emit(\'diagnostic\', { kind: \'uncaught\', message: \'boom\', at: \'2026-09-08T10:00:00.000Z\' })" />',
};

const loadedApp = (overrides: Partial<App> = {}): App => ({
	id: 'app-1',
	name: 'Greeter',
	namespace: 'greeter',
	theme: null,
	projectId: 'proj-1',
	activeVersionId: 'v-1',
	hasUnpublishedChanges: false,
	createdAt: '2026-04-01T00:00:00.000Z',
	updatedAt: '2026-04-01T00:00:00.000Z',
	...overrides,
});

const diagnostics = { add: vi.fn<(item: InstanceAiAppPreviewDiagnostic) => void>() };

const latestSourceEditIdArg = () =>
	(
		useAppLivePreviewMock.mock.calls[0] as unknown as [
			unknown,
			unknown,
			unknown,
			unknown,
			Ref<string | undefined>,
		]
	)[4];

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
		settledCount.value = 0;
		previewAhead.value = false;
		threadState.messages = [];
		threadState.producedArtifacts.get('app-1')!.namespace = undefined;
		markPreviewPublished.mockClear();
		updateThreadMetadataMock.mockClear();
		useAppLivePreviewMock.mockClear();
		diagnostics.add.mockClear();
		showError.mockClear();
	});

	it('runs the live preview for the app and hands its state to the details view', async () => {
		liveStatus.value = { status: 'starting' };
		const wrapper = mountPreview({ versionId: 'v-1' });

		const [target, , builtVersionId, running] = useAppLivePreviewMock.mock.calls[0] as unknown as [
			{ projectId: () => string; appId: () => string },
			unknown,
			() => string | undefined,
			() => boolean,
		];
		expect([target.projectId(), target.appId(), builtVersionId()]).toEqual([
			'proj-1',
			'app-1',
			'v-1',
		]);
		expect(running()).toBe(false);
		threadState.isStreaming = true;
		expect(running()).toBe(true);
		threadState.isStreaming = false;

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

	it('hands the settled count and the ahead flag of the live preview to the details view', async () => {
		const wrapper = mountPreview();
		const view = wrapper.get('[data-test-id="app-details-view-stub"]');
		expect(view.attributes('data-refresh-key')).toBe('0');
		expect(view.attributes('data-draft-dirty')).toBe('false');

		settledCount.value = 1;
		previewAhead.value = true;
		await flushPromises();

		expect(view.attributes('data-refresh-key')).toBe('1');
		expect(view.attributes('data-draft-dirty')).toBe('true');
	});

	it('marks the frame as published when the loaded app has no unpublished changes', async () => {
		const wrapper = mountPreview();
		const view = wrapper.getComponent(AppDetailsViewStub);

		view.vm.$emit('app-loaded', loadedApp({ hasUnpublishedChanges: true }));
		expect(markPreviewPublished).not.toHaveBeenCalled();

		view.vm.$emit('app-loaded', loadedApp({ hasUnpublishedChanges: false }));
		expect(markPreviewPublished).toHaveBeenCalledTimes(1);
	});

	it('derives the latest source edit of the app from the thread, by the registry namespace', () => {
		threadState.producedArtifacts.get('app-1')!.namespace = 'greeter';
		threadState.messages = [
			{ agentTree: appEdit('tc-1', 'apps/greeter/src/App.vue') },
			{},
			{ agentTree: appEdit('tc-2', 'apps/other/src/App.vue') },
		];
		mountPreview();
		const latestSourceEditId = latestSourceEditIdArg();

		expect(latestSourceEditId.value).toBe('tc-1');

		threadState.messages.push({ agentTree: appEdit('tc-3', 'apps/greeter/src/pages/Home.vue') });
		expect(latestSourceEditId.value).toBe('tc-3');
	});

	it('learns the namespace from the loaded app when the registry has none', () => {
		threadState.messages = [{ agentTree: appEdit('tc-1', 'apps/greeter/src/App.vue') }];
		const wrapper = mountPreview();
		const latestSourceEditId = latestSourceEditIdArg();
		expect(latestSourceEditId.value).toBeUndefined();

		wrapper.getComponent(AppDetailsViewStub).vm.$emit('app-loaded', loadedApp());

		expect(latestSourceEditId.value).toBe('tc-1');
	});

	it('shows the building indicator while an apps build call is in flight', () => {
		const wrapper = mountPreview({ versionId: 'v-1', building: true });

		expect(wrapper.find('[data-test-id="instance-ai-app-building-indicator"]').exists()).toBe(true);
	});
});
