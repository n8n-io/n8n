import { fireEvent } from '@testing-library/vue';
import { h, ref, type VNode } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { GenerativeUiNodesKey } from '../nodeLookup';
import { GenerativeUiFlowGraphKey } from '../flowGraph';
import type { WorkflowUiConnection } from '../workflowPayload';
import FlowCanvas from './FlowCanvas.vue';
import FlowConnection from './FlowConnection.vue';
import FlowNode from './FlowNode.vue';

const nodes = [
	{ id: 'a', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 1, parameters: {} },
	{ id: 'b', name: 'Filter', type: 'n8n-nodes-base.filter', typeVersion: 1, parameters: {} },
	{ id: 'c', name: 'Slack', type: 'n8n-nodes-base.slack', typeVersion: 1, parameters: {} },
];

function connection(
	sourceNodeId: string,
	targetNodeId: string,
	overrides: Partial<WorkflowUiConnection> = {},
): WorkflowUiConnection {
	return { sourceNodeId, targetNodeId, type: 'main', outputIndex: 0, inputIndex: 0, ...overrides };
}

function renderCanvas(options: {
	children: VNode[];
	connections?: WorkflowUiConnection[];
	props?: Record<string, unknown>;
}) {
	return createComponentRenderer(FlowCanvas, {
		props: options.props ?? {},
		slots: { default: () => options.children },
		global: {
			provide: {
				[GenerativeUiNodesKey as symbol]: ref(nodes),
				[GenerativeUiFlowGraphKey as symbol]: ref(options.connections ?? []),
			},
		},
	})();
}

describe('FlowCanvas', () => {
	it('renders each FlowNode child and preserves its content', () => {
		const { getAllByTestId, getByText } = renderCanvas({
			children: [
				h(FlowNode, { nodeId: 'a' }, { default: () => h('p', 'Trigger body') }),
				h(FlowNode, { nodeId: 'b' }, { default: () => h('p', 'Filter body') }),
			],
		});

		expect(getAllByTestId('flow-node')).toHaveLength(2);
		expect(getByText('Trigger body')).toBeInTheDocument();
		expect(getByText('Filter body')).toBeInTheDocument();
	});

	it('keeps interactive child behavior working inside a node', async () => {
		const onClick = vi.fn();
		const { getByRole } = renderCanvas({
			children: [h(FlowNode, { nodeId: 'a' }, { default: () => h('button', { onClick }, 'Open') })],
		});

		await fireEvent.click(getByRole('button', { name: 'Open' }));

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('lists derived connections between rendered nodes using node names', () => {
		const { getAllByTestId } = renderCanvas({
			children: [
				h(FlowNode, { nodeId: 'a' }, { default: () => h('p', 'A') }),
				h(FlowNode, { nodeId: 'b' }, { default: () => h('p', 'B') }),
				h(FlowNode, { nodeId: 'c' }, { default: () => h('p', 'C') }),
			],
			connections: [connection('a', 'b'), connection('b', 'c')],
		});

		const items = getAllByTestId('flow-connection').map((item) => item.textContent?.trim());
		expect(items).toEqual(['Webhook → Filter', 'Filter → Slack']);
	});

	it('applies explicit connection labels to a real derived edge', () => {
		const { getByTestId } = renderCanvas({
			children: [
				h(FlowNode, { nodeId: 'a' }, { default: () => h('p', 'A') }),
				h(FlowNode, { nodeId: 'b' }, { default: () => h('p', 'B') }),
				h(FlowConnection, { fromNodeId: 'a', toNodeId: 'b', label: 'On success' }),
			],
			connections: [connection('a', 'b')],
		});

		expect(getByTestId('flow-connection').textContent).toContain('On success');
	});

	it('keeps the accessible connection list visible when connectors cannot render', () => {
		const { queryByTestId, getByTestId } = renderCanvas({
			children: [
				h(FlowNode, { nodeId: 'a' }, { default: () => h('p', 'A') }),
				h(FlowNode, { nodeId: 'b' }, { default: () => h('p', 'B') }),
			],
			connections: [connection('a', 'b')],
		});

		expect(queryByTestId('flow-canvas-edges')).toBeNull();
		expect(getByTestId('flow-connection').textContent).toContain('Webhook → Filter');
	});

	it('shows an empty connection message when there are no edges', () => {
		const { getByTestId } = renderCanvas({
			children: [h(FlowNode, { nodeId: 'a' }, { default: () => h('p', 'A') })],
		});

		expect(getByTestId('flow-connection').textContent).toContain('No connections');
	});

	it('renders a title and description when provided', () => {
		const { getByText } = renderCanvas({
			children: [h(FlowNode, { nodeId: 'a' }, { default: () => h('p', 'A') })],
			props: { title: 'Lead flow', description: 'From capture to CRM' },
		});

		expect(getByText('Lead flow')).toBeInTheDocument();
		expect(getByText('From capture to CRM')).toBeInTheDocument();
	});
});
