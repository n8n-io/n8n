import { fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { NodeConnectionTypes } from 'n8n-workflow';
import CanvasEdgeToolbar from './CanvasEdgeToolbar.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasGraphNode } from '@/features/workflows/canvas/__tests__/utils';
import { AGENT_NODE_TYPE, AGENT_TOOL_NODE_TYPE } from '@/app/constants';

const renderComponent = createComponentRenderer(CanvasEdgeToolbar);

describe('CanvasEdgeToolbar', () => {
	it('should emit delete event when delete button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				type: NodeConnectionTypes.Main,
				targetNode: createCanvasGraphNode(),
				sourceNode: createCanvasGraphNode(),
			},
		});
		const deleteButton = getByTestId('delete-connection-button');

		await fireEvent.click(deleteButton);

		expect(emitted()).toHaveProperty('delete');
	});

	describe('tooltip text on hover', () => {
		it('should show "Add" tooltip when hovering over add button for Main connection', async () => {
			const { getByTestId } = renderComponent({
				props: {
					type: NodeConnectionTypes.Main,
					targetNode: createCanvasGraphNode(),
					sourceNode: createCanvasGraphNode(),
				},
			});

			const addButton = getByTestId('add-connection-button');
			await userEvent.hover(addButton);

			const tooltip = getByTestId('tooltip-content');
			expect(tooltip).toBeVisible();
			expect(tooltip).toHaveTextContent('Add');
		});

		it('should show "Add human review step" tooltip when hovering over add button for AiTool connection', async () => {
			const { getByTestId } = renderComponent({
				props: {
					type: NodeConnectionTypes.AiTool,
					targetNode: createCanvasGraphNode({
						data: {
							type: AGENT_NODE_TYPE,
						},
					}),
					sourceNode: createCanvasGraphNode({
						data: {
							type: 'n8n-nodes-base.set',
						},
					}),
				},
			});

			const addButton = getByTestId('add-connection-button');
			await userEvent.hover(addButton);

			const tooltip = getByTestId('tooltip-content');
			expect(tooltip).toBeVisible();
			expect(tooltip).toHaveTextContent('Add human review step');
		});

		it('should show "Delete" tooltip when hovering over delete button', async () => {
			const { getByTestId } = renderComponent({
				props: {
					type: NodeConnectionTypes.Main,
					targetNode: createCanvasGraphNode(),
					sourceNode: createCanvasGraphNode(),
				},
			});

			const deleteButton = getByTestId('delete-connection-button');
			await userEvent.hover(deleteButton);

			const tooltip = getByTestId('tooltip-content');
			expect(tooltip).toBeVisible();
			expect(tooltip).toHaveTextContent('Delete');
		});
	});

	describe('add button visibility', () => {
		it('should show add button for Main connection type', () => {
			const { getByTestId } = renderComponent({
				props: {
					type: NodeConnectionTypes.Main,
					targetNode: createCanvasGraphNode(),
					sourceNode: createCanvasGraphNode(),
				},
			});

			expect(getByTestId('add-connection-button')).toBeVisible();
		});

		it('should show add button for AiTool connection when target is Agent node', () => {
			const { getByTestId } = renderComponent({
				props: {
					type: NodeConnectionTypes.AiTool,
					targetNode: createCanvasGraphNode({
						data: {
							type: AGENT_NODE_TYPE,
						},
					}),
					sourceNode: createCanvasGraphNode({
						data: {
							type: 'n8n-nodes-base.set',
						},
					}),
				},
			});

			expect(getByTestId('add-connection-button')).toBeVisible();
		});

		it('should show add button for AiTool connection when target is AgentTool node', () => {
			const { getByTestId } = renderComponent({
				props: {
					type: NodeConnectionTypes.AiTool,
					targetNode: createCanvasGraphNode({
						data: {
							type: AGENT_TOOL_NODE_TYPE,
						},
					}),
					sourceNode: createCanvasGraphNode({
						data: {
							type: 'n8n-nodes-base.set',
						},
					}),
				},
			});

			expect(getByTestId('add-connection-button')).toBeVisible();
		});

		it('should not show add button for AiTool connection when target is not Agent or AgentTool', () => {
			const { queryByTestId } = renderComponent({
				props: {
					type: NodeConnectionTypes.AiTool,
					targetNode: createCanvasGraphNode({
						data: {
							type: 'n8n-nodes-base.set',
						},
					}),
					sourceNode: createCanvasGraphNode({
						data: {
							type: 'n8n-nodes-base.set',
						},
					}),
				},
			});

			expect(queryByTestId('add-connection-button')).not.toBeInTheDocument();
		});

		it('should not show add button for AiTool connection when source is HITL tool', () => {
			const { queryByTestId } = renderComponent({
				props: {
					type: NodeConnectionTypes.AiTool,
					targetNode: createCanvasGraphNode({
						data: {
							type: AGENT_NODE_TYPE,
						},
					}),
					sourceNode: createCanvasGraphNode({
						data: {
							type: 'n8n-nodes-base.slackHitlTool',
						},
					}),
				},
			});

			expect(queryByTestId('add-connection-button')).not.toBeInTheDocument();
		});
	});
});
