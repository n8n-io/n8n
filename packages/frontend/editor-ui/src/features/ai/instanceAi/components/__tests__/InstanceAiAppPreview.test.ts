import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
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

vi.mock('../../instanceAi.store', () => ({
	useThread: () => threadState,
	useInstanceAiStore: () => ({
		getThreadMetadata: () => metadataState.value,
		updateThreadMetadata: updateThreadMetadataMock,
	}),
}));

const AppDetailsViewStub = {
	name: 'AppDetailsView',
	props: {
		artifactMode: Boolean,
		projectId: String,
		appId: String,
		artifactVersionId: String,
	},
	template:
		'<div data-test-id="app-details-view-stub" :data-artifact-mode="String(artifactMode)" :data-app-id="appId" :data-project-id="projectId" :data-version-id="artifactVersionId" />',
};

function mountPreview(props: Partial<InstanceType<typeof InstanceAiAppPreview>['$props']> = {}) {
	return mount(InstanceAiAppPreview, {
		props: { appId: 'app-1', projectId: 'proj-1', ...props },
		global: { stubs: { AppDetailsView: AppDetailsViewStub } },
	});
}

describe('InstanceAiAppPreview', () => {
	beforeEach(() => {
		metadataState.value = undefined;
		updateThreadMetadataMock.mockClear();
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

	it('shows the building indicator while an apps build call is in flight', () => {
		const wrapper = mountPreview({ versionId: 'v-1', building: true });

		expect(wrapper.find('[data-test-id="instance-ai-app-building-indicator"]').exists()).toBe(true);
	});
});
