import { describe, it, expect } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';

import ToolRow from '../ToolRow.vue';
import type { McpServerConnectionItem, NodeConnectionItem, WorkflowConnectionItem } from '../types';

const renderRow = createComponentRenderer(ToolRow);

function render(item: McpServerConnectionItem | NodeConnectionItem | WorkflowConnectionItem) {
	return renderRow({ props: { item }, pinia: createTestingPinia() });
}

const baseMcp: McpServerConnectionItem = {
	id: 'mcp-1',
	kind: 'mcp-server',
	title: 'Notion',
	description: 'Connect to Notion',
	isConnected: false,
	availableTools: [],
};

const baseNode: NodeConnectionItem = {
	id: 'node-1',
	kind: 'node',
	title: 'OpenAI',
	description: 'Talk to GPT',
	isConnected: false,
	nodeTypeName: '@n8n/n8n-nodes-langchain.openAi',
};

const baseWorkflow: WorkflowConnectionItem = {
	id: 'wf-1',
	kind: 'workflow',
	title: 'Summariser',
	isConnected: false,
	workflowId: 'wf-1234',
};

describe('ToolRow', () => {
	it('shows a Connect button for an available mcp-server and emits open-detail on click', async () => {
		const { getByTestId, emitted } = render(baseMcp);

		const connect = getByTestId('tools-connection-row-connect');
		expect(connect.textContent).toContain('Connect');

		await fireEvent.click(connect);
		expect(emitted()['open-detail']?.[0]).toEqual([baseMcp]);
	});

	it('shows a Connect button for an available node and emits open-detail on click', async () => {
		const { getByTestId, emitted } = render(baseNode);

		const connect = getByTestId('tools-connection-row-connect');
		expect(connect.textContent).toContain('Connect');

		await fireEvent.click(connect);
		expect(emitted()['open-detail']?.[0]).toEqual([baseNode]);
	});

	it('shows a Connect button for an available workflow', () => {
		const { getByTestId } = render(baseWorkflow);
		expect(getByTestId('tools-connection-row-connect')).toBeTruthy();
	});

	it('shows the connected badge and emits open-detail when the gear is clicked', async () => {
		const connected: McpServerConnectionItem = {
			...baseMcp,
			isConnected: true,
			credentials: [{ authType: 'mcpOAuth2Api', credentialId: 'cred-1', required: true }],
		};
		const { getByTestId, emitted } = render(connected);

		expect(getByTestId('tools-connection-row-connected')).toBeTruthy();
		await fireEvent.click(getByTestId('tools-connection-row-configure'));
		expect(emitted()['open-detail']?.[0]).toEqual([connected]);
	});

	it('emits open-detail when an mcp-server row is clicked', async () => {
		const { getByTestId, emitted } = render(baseMcp);

		const row = getByTestId('tools-connection-row');
		await fireEvent.click(row);

		expect(emitted()['open-detail']?.[0]).toEqual([baseMcp]);
	});

	it('fires open-detail exactly once when clicking the Connect action', async () => {
		const { getByTestId, emitted } = render(baseMcp);

		await fireEvent.click(getByTestId('tools-connection-row-connect'));
		expect(emitted()['open-detail']).toHaveLength(1);
	});

	it('emits open-detail when a node row is clicked', async () => {
		const { getByTestId, emitted } = render(baseNode);

		await fireEvent.click(getByTestId('tools-connection-row'));
		expect(emitted()['open-detail']?.[0]).toEqual([baseNode]);
	});

	it('renders a file-type iconSource as an N8nNodeIcon img', () => {
		const item: NodeConnectionItem = {
			...baseNode,
			iconSource: { type: 'file', src: 'https://cdn/openai.svg' },
		};
		const { container } = render(item);
		const img = container.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.getAttribute('src')).toBe('https://cdn/openai.svg');
	});

	it('renders an icon-type iconSource as a glyph rather than an img', () => {
		const item: NodeConnectionItem = {
			...baseNode,
			iconSource: { type: 'icon', name: 'bolt' },
		};
		const { container } = render(item);
		const img = container.querySelector('img');
		expect(img).toBeNull();
	});

	it('renders the placeholder icon when iconSource is absent', () => {
		const { container } = render(baseNode);
		const img = container.querySelector('img');
		expect(img).toBeNull();
	});
});
