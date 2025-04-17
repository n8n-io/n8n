import { fireEvent, waitFor, within } from '@testing-library/vue';
import { renderComponent } from '@/__tests__/render';
import LogDetailsPanel from './LogDetailsPanel.vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { h } from 'vue';
import {
	createTestLogEntry,
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
} from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import { type FrontendSettings } from '@n8n/api-types';

describe('LogDetailsPanel', () => {
	let pinia: TestingPinia;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;

	function render(props: InstanceType<typeof LogDetailsPanel>['$props']) {
		const rendered = renderComponent(LogDetailsPanel, {
			props,
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
		const container = rendered.getByTestId('log-details');

		Object.defineProperty(container, 'offsetWidth', {
			configurable: true,
			get() {
				return 1000;
			},
		});
		vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
			x: 0,
			width: 1000,
		} as DOMRect);

		return rendered;
	}

	beforeEach(() => {
		pinia = createTestingPinia({ stubActions: false, fakeApp: true });

		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isEnterpriseFeatureEnabled = {} as FrontendSettings['enterprise'];

		const workflowData = createTestWorkflow({
			nodes: [createTestNode({ name: 'Chat Trigger' }), createTestNode({ name: 'AI Agent' })],
			connections: { 'Chat Trigger': { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] } },
		});

		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.setNodes(workflowData.nodes);
		workflowsStore.setConnections(workflowData.connections);
		workflowsStore.setWorkflowExecutionData({
			id: 'test-exec-id',
			finished: true,
			mode: 'manual',
			status: 'error',
			workflowData,
			data: {
				resultData: {
					runData: {
						'Chat Trigger': [
							createTestTaskData({
								executionStatus: 'success',
								executionTime: 0,
								data: { main: [[{ json: { chatInput: 'hey' } }]] },
							}),
						],
						'AI Agent': [
							createTestTaskData({
								executionStatus: 'success',
								executionTime: 10,
								data: { main: [[{ json: { response: 'Hello!' } }]] },
							}),
						],
					},
				},
			},
			createdAt: '2025-04-16T00:00:00.000Z',
			startedAt: '2025-04-16T00:00:01.000Z',
		});
	});

	it('should show name, run status, input, and output of the node', async () => {
		const rendered = render({
			isOpen: true,
			logEntry: createTestLogEntry({ node: 'AI Agent', runIndex: 0 }),
		});

		const header = within(rendered.getByTestId('log-details-header'));
		const inputPanel = within(rendered.getByTestId('log-details-input'));
		const outputPanel = within(rendered.getByTestId('log-details-output'));

		expect(header.getByText('AI Agent')).toBeInTheDocument();
		expect(header.getByText('Success in 10ms')).toBeInTheDocument();
		expect(await inputPanel.findByText('hey')).toBeInTheDocument();
		expect(await outputPanel.findByText('Hello!')).toBeInTheDocument();
	});

	it('should toggle input and output panel when the button is clicked', async () => {
		const rendered = render({
			isOpen: true,
			logEntry: createTestLogEntry({ node: 'AI Agent', runIndex: 0 }),
		});

		const header = within(rendered.getByTestId('log-details-header'));

		expect(rendered.queryByTestId('log-details-input')).toBeInTheDocument();
		expect(rendered.queryByTestId('log-details-output')).toBeInTheDocument();

		await fireEvent.click(header.getByText('Input'));

		expect(rendered.queryByTestId('log-details-input')).not.toBeInTheDocument();
		expect(rendered.queryByTestId('log-details-output')).toBeInTheDocument();

		await fireEvent.click(header.getByText('Output'));

		expect(rendered.queryByTestId('log-details-input')).toBeInTheDocument();
		expect(rendered.queryByTestId('log-details-output')).not.toBeInTheDocument();
	});

	it('should close input panel by dragging the divider to the left end', async () => {
		const rendered = render({
			isOpen: true,
			logEntry: createTestLogEntry({ node: 'AI Agent', runIndex: 0 }),
		});

		await fireEvent.mouseDown(rendered.getByTestId('resize-handle'));

		window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }));
		window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 0, clientY: 0 }));

		await waitFor(() => {
			expect(rendered.queryByTestId('log-details-input')).not.toBeInTheDocument();
			expect(rendered.queryByTestId('log-details-output')).toBeInTheDocument();
		});
	});

	it('should close output panel by dragging the divider to the right end', async () => {
		const rendered = render({
			isOpen: true,
			logEntry: createTestLogEntry({ node: 'AI Agent', runIndex: 0 }),
		});

		await fireEvent.mouseDown(rendered.getByTestId('resize-handle'));

		window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 1000, clientY: 0 }));
		window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 1000, clientY: 0 }));

		await waitFor(() => {
			expect(rendered.queryByTestId('log-details-input')).toBeInTheDocument();
			expect(rendered.queryByTestId('log-details-output')).not.toBeInTheDocument();
		});
	});
});
