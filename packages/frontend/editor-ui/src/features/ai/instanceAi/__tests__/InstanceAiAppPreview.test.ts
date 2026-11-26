import { createTestingPinia } from '@pinia/testing';
import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import InstanceAiAppPreview from '../components/InstanceAiAppPreview.vue';
import { useInstanceAiStore } from '../instanceAi.store';

const { refresh, mounted } = vi.hoisted(() => ({ refresh: vi.fn(), mounted: vi.fn() }));

vi.mock('@n8n/frontend-module-apps', () => ({
	loadAppView: async () =>
		defineComponent({
			props: { projectId: String, appId: String, inspectable: Boolean, elementSelected: Boolean },
			emits: ['element-selected'],
			setup(props, { expose, emit }) {
				mounted(props.appId);
				expose({ refresh });
				return () =>
					h('div', [
						props.appId,
						h('span', { 'data-test-id': 'inspectable' }, String(props.inspectable)),
						h('span', { 'data-test-id': 'element-selected' }, String(props.elementSelected)),
						h('button', {
							'data-test-id': 'pick',
							onClick: () => emit('element-selected', { tagName: 'button', text: 'Save' }),
						}),
					]);
			},
		}),
}));

const renderPreview = (props = { projectId: 'project-1', appId: 'app-1', refreshKey: 0 }) =>
	render(InstanceAiAppPreview, {
		props,
		global: { plugins: [createTestingPinia({ stubActions: false })] },
	});

describe('InstanceAiAppPreview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	it('refreshes the app view in place when the refresh key changes', async () => {
		const { rerender, getByTestId } = renderPreview();
		await flushPromises();
		expect(getByTestId('instance-ai-app-preview')).toHaveTextContent('app-1');

		await rerender({ projectId: 'project-1', appId: 'app-1', refreshKey: 1 });
		await flushPromises();

		expect(refresh).toHaveBeenCalledTimes(1);
		expect(mounted).toHaveBeenCalledTimes(1);
	});

	it('mounts a new app view for another app', async () => {
		const { rerender } = renderPreview();
		await flushPromises();

		await rerender({ projectId: 'project-1', appId: 'app-2', refreshKey: 0 });
		await flushPromises();

		expect(mounted).toHaveBeenCalledTimes(2);
		expect(refresh).not.toHaveBeenCalled();
	});

	it('makes the preview inspectable and stages a picked element for the chat', async () => {
		const { getByTestId } = renderPreview();
		await flushPromises();
		const store = useInstanceAiStore();
		const focusRequests = store.composerFocusRequest;
		expect(getByTestId('inspectable')).toHaveTextContent('true');

		await userEvent.click(getByTestId('pick'));

		expect(store.pendingComposerAttachments).toEqual([
			{ type: 'element', appId: 'app-1', tagName: 'button', text: 'Save' },
		]);
		expect(store.composerFocusRequest).toBe(focusRequests + 1);
	});

	it('reports whether the composer holds an element of this app', async () => {
		const { getByTestId } = renderPreview();
		await flushPromises();
		const store = useInstanceAiStore();
		expect(getByTestId('element-selected')).toHaveTextContent('false');

		store.setComposerElementAppId('app-2');
		await flushPromises();
		expect(getByTestId('element-selected')).toHaveTextContent('false');

		store.setComposerElementAppId('app-1');
		await flushPromises();
		expect(getByTestId('element-selected')).toHaveTextContent('true');
	});
});
