import { render } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import InstanceAiAppPreview from '../components/InstanceAiAppPreview.vue';

const { refresh, mounted } = vi.hoisted(() => ({ refresh: vi.fn(), mounted: vi.fn() }));

vi.mock('@n8n/frontend-module-apps', () => ({
	loadAppView: async () =>
		defineComponent({
			props: { projectId: String, appId: String },
			setup(props, { expose }) {
				mounted(props.appId);
				expose({ refresh });
				return () => h('div', props.appId);
			},
		}),
}));

describe('InstanceAiAppPreview', () => {
	beforeEach(() => vi.clearAllMocks());

	it('refreshes the app view in place when the refresh key changes', async () => {
		const { rerender, getByTestId } = render(InstanceAiAppPreview, {
			props: { projectId: 'project-1', appId: 'app-1', refreshKey: 0 },
		});
		await flushPromises();
		expect(getByTestId('instance-ai-app-preview')).toHaveTextContent('app-1');

		await rerender({ projectId: 'project-1', appId: 'app-1', refreshKey: 1 });
		await flushPromises();

		expect(refresh).toHaveBeenCalledTimes(1);
		expect(mounted).toHaveBeenCalledTimes(1);
	});

	it('mounts a new app view for another app', async () => {
		const { rerender } = render(InstanceAiAppPreview, {
			props: { projectId: 'project-1', appId: 'app-1', refreshKey: 0 },
		});
		await flushPromises();

		await rerender({ projectId: 'project-1', appId: 'app-2', refreshKey: 0 });
		await flushPromises();

		expect(mounted).toHaveBeenCalledTimes(2);
		expect(refresh).not.toHaveBeenCalled();
	});
});
