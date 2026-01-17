import { createComponentRenderer } from '@/__tests__/render';
import { queryTooltip, getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import { waitFor } from '@testing-library/vue';
import CanvasRunWorkflowButton from './CanvasRunWorkflowButton.vue';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { createTestNode } from '@/__tests__/mocks';
import {
	CHAT_TRIGGER_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
} from '@/app/constants';
import { createPinia, setActivePinia } from 'pinia';

describe('CanvasRunWorkflowButton', () => {
	const renderComponent = createComponentRenderer(CanvasRunWorkflowButton, {
		props: {
			triggerNodes: [createTestNode({ type: MANUAL_CHAT_TRIGGER_NODE_TYPE })],
			getNodeType: () => null,
		},
	});

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('should render correctly', () => {
		const wrapper = renderComponent({
			global: {
				stubs: {
					N8nButton: { template: '<n8n-button-stub><slot /></n8n-button-stub>' },
				},
			},
		});

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render different label when executing', () => {
		const wrapper = renderComponent({
			props: {
				executing: true,
			},
		});

		expect(wrapper.getByText('Executing workflow')).toBeInTheDocument();
	});

	it('should render different label when executing and waiting for webhook', () => {
		const wrapper = renderComponent({
			props: {
				executing: true,
				waitingForWebhook: true,
			},
		});

		expect(wrapper.getByText('Waiting for trigger event')).toBeInTheDocument();
	});

	it('should show tooltip when not executing', async () => {
		const wrapper = renderComponent({ props: { executing: false } });
		const button = wrapper.getByRole('button');

		// Verify tooltip shows execution label and shortcut on hover
		await hoverTooltipTrigger(button);
		// Tooltip has showAfter of 500ms, wait for it
		await new Promise((r) => setTimeout(r, 600));
		await waitFor(() => expect(getTooltip()).toHaveTextContent('Execute workflow'));
	});

	it('should not show tooltip when executing', async () => {
		const wrapper = renderComponent({ props: { executing: true } });
		await userEvent.hover(wrapper.getByRole('button'));

		// Wait longer than showAfter (500ms) then verify tooltip didn't appear
		await new Promise((r) => setTimeout(r, 600));
		expect(queryTooltip()).not.toBeInTheDocument();
	});

	it('should render split button if multiple triggers are available', () => {
		const wrapper = renderComponent({
			props: {
				selectedTriggerNodeName: 'A',
				triggerNodes: [
					createTestNode({ name: 'A', type: MANUAL_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'B', type: SCHEDULE_TRIGGER_NODE_TYPE }),
				],
			},
		});

		expect(wrapper.container.textContent).toBe('Execute workflow from A');
		expect(wrapper.queryByLabelText('Select trigger node')).toBeInTheDocument();
	});

	it('should not render split button if there is only one trigger that is not disabled nor a chat trigger', () => {
		const wrapper = renderComponent({
			props: {
				selectedTriggerNodeName: 'A',
				triggerNodes: [
					createTestNode({ name: 'A', type: MANUAL_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'B', type: MANUAL_TRIGGER_NODE_TYPE, disabled: true }),
					createTestNode({ name: 'C', type: CHAT_TRIGGER_NODE_TYPE }),
				],
			},
		});

		expect(wrapper.container.textContent).toBe('Execute workflow ');
		expect(wrapper.queryByLabelText('Select trigger node')).not.toBeInTheDocument();
	});

	it('should show available triggers in the ordering of coordinate on the canvas when chevron icon is clicked', async () => {
		const wrapper = renderComponent({
			props: {
				selectedTriggerNodeName: 'A',
				triggerNodes: [
					createTestNode({ name: 'A', type: MANUAL_TRIGGER_NODE_TYPE, position: [1, 1] }),
					createTestNode({ name: 'B', type: MANUAL_TRIGGER_NODE_TYPE, position: [1, 0] }),
					createTestNode({ name: 'C', type: MANUAL_TRIGGER_NODE_TYPE, position: [0, 0] }),
					createTestNode({ name: 'D', type: MANUAL_TRIGGER_NODE_TYPE, position: [0, 1] }),
				],
			},
		});

		const chevron = (await wrapper.findAllByRole('button'))[1];

		await fireEvent.click(chevron);

		const menuItems = await wrapper.findAllByRole('menuitem');

		expect(menuItems).toHaveLength(4);
		expect(menuItems[0]).toHaveTextContent('from C');
		expect(menuItems[1]).toHaveTextContent('from B');
		expect(menuItems[2]).toHaveTextContent('from D');
		expect(menuItems[3]).toHaveTextContent('from A');
	});

	it('should allow to select and execute a different trigger', async () => {
		const wrapper = renderComponent({
			props: {
				selectedTriggerNodeName: 'A',
				triggerNodes: [
					createTestNode({ name: 'A', type: MANUAL_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'B', type: MANUAL_TRIGGER_NODE_TYPE }),
				],
			},
		});

		const [executeButton, chevron] = await wrapper.findAllByRole('button');
		await fireEvent.click(chevron);
		const menuItems = await wrapper.findAllByRole('menuitem');
		await fireEvent.click(menuItems[1]);
		await fireEvent.click(executeButton);
		expect(wrapper.emitted('selectTriggerNode')).toEqual([['B']]);
	});
});
