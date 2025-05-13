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
	createTestWorkflowObject,
} from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { useSettingsStore } from '@/stores/settings.store';
import { type FrontendSettings } from '@n8n/api-types';
import type { LogEntry } from '@/components/RunDataAi/utils';

describe('LogDetailsPanel', () => {
	let pinia: TestingPinia;
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;

	const aiNode = createTestNode({ name: 'AI Agent' });
	const workflowData = createTestWorkflow({
		nodes: [createTestNode({ name: 'Chat Trigger' }), aiNode],
		connections: { 'Chat Trigger': { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] } },
	});
	const chatNodeRunData = createTestTaskData({
		executionStatus: 'success',
		executionTime: 0,
		data: { main: [[{ json: { response: 'hey' } }]] },
	});
	const aiNodeRunData = createTestTaskData({
		executionStatus: 'success',
		executionTime: 10,
		data: { main: [[{ json: { response: 'Hello!' } }]] },
		source: [{ previousNode: 'Chat Trigger' }],
	});

	function createLogEntry(data: Partial<LogEntry> = {}) {
		return createTestLogEntry({
			workflow: createTestWorkflowObject(workflowData),
			execution: {
				resultData: {
					runData: {
						'Chat Trigger': [chatNodeRunData],
						'AI Agent': [aiNodeRunData],
					},
				},
			},
			...data,
		});
	}

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

		localStorage.clear();
	});

	it('should show name, run status, input, and output of the node', async () => {
		localStorage.setItem('N8N_LOGS_DETAIL_PANEL_CONTENT', 'both');

		const rendered = render({
			isOpen: true,
			logEntry: createLogEntry({ node: aiNode, runIndex: 0, runData: aiNodeRunData }),
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
			logEntry: createLogEntry({ node: aiNode, runIndex: 0, runData: aiNodeRunData }),
		});

		const header = within(rendered.getByTestId('log-details-header'));

		expect(rendered.queryByTestId('log-details-input')).not.toBeInTheDocument();
		expect(rendered.queryByTestId('log-details-output')).toBeInTheDocument();

		await fireEvent.click(header.getByText('Input'));

		expect(rendered.queryByTestId('log-details-input')).toBeInTheDocument();
		expect(rendered.queryByTestId('log-details-output')).toBeInTheDocument();

		await fireEvent.click(header.getByText('Output'));

		expect(rendered.queryByTestId('log-details-input')).toBeInTheDocument();
		expect(rendered.queryByTestId('log-details-output')).not.toBeInTheDocument();
	});

	it('should close input panel by dragging the divider to the left end', async () => {
		localStorage.setItem('N8N_LOGS_DETAIL_PANEL_CONTENT', 'both');

		const rendered = render({
			isOpen: true,
			logEntry: createLogEntry({ node: aiNode, runIndex: 0, runData: aiNodeRunData }),
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
		localStorage.setItem('N8N_LOGS_DETAIL_PANEL_CONTENT', 'both');

		const rendered = render({
			isOpen: true,
			logEntry: createLogEntry({ node: aiNode, runIndex: 0, runData: aiNodeRunData }),
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
