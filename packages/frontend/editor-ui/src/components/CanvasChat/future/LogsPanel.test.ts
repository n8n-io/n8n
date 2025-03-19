import { renderComponent } from '@/__tests__/render';
import { fireEvent, waitFor } from '@testing-library/vue';
import { mockedStore } from '@/__tests__/utils';
import LogsPanel from '@/components/CanvasChat/future/LogsPanel.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestNode } from '@/__tests__/mocks';
import { CHAT_TRIGGER_NODE_TYPE } from '@/constants';
import { h } from 'vue';

describe('LogsPanel', () => {
	let pinia: TestingPinia;
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	function render() {
		return renderComponent(LogsPanel, {
			global: {
				plugins: [
					createRouter({
						history: createWebHistory(),
						routes: [{ path: '/', component: () => h('div') }],
					}),
					pinia,
				],
			},
		});
	}

	beforeEach(() => {
		pinia = createTestingPinia({ stubActions: false, fakeApp: true });

		setActivePinia(pinia);

		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isNewLogsEnabled = true;

		workflowsStore = mockedStore(useWorkflowsStore);
	});

	it('renders collapsed panel by default', async () => {
		const rendered = render();

		expect(await rendered.findByText('Logs')).toBeInTheDocument();
		expect(
			rendered.queryByText('Nothing to display yet', { exact: false }),
		).not.toBeInTheDocument();
	});

	it('renders chat panel if the workflow has chat trigger', async () => {
		workflowsStore.workflowTriggerNodes = [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE })];

		const rendered = render();

		expect(await rendered.findByText('Chat')).toBeInTheDocument();
	});

	it('opens collapsed panel when clicked', async () => {
		const rendered = render();

		await rendered.findByText('Logs');

		await fireEvent.click(rendered.getByText('Logs'));

		expect(
			await rendered.findByText('Nothing to display yet', { exact: false }),
		).toBeInTheDocument();
	});

	it('toggles panel when chevron icon button is clicked', async () => {
		const rendered = render();

		await rendered.findByText('Logs');

		await fireEvent.click(rendered.getAllByRole('button').pop()!);
		expect(rendered.getByText('Nothing to display yet', { exact: false })).toBeInTheDocument();

		await fireEvent.click(rendered.getAllByRole('button').pop()!);
		await waitFor(() =>
			expect(
				rendered.queryByText('Nothing to display yet', { exact: false }),
			).not.toBeInTheDocument(),
		);
	});
});
