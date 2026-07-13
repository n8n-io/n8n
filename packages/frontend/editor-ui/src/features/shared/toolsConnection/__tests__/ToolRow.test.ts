import { describe, it, expect } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
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
	it('shows a Connect button for an available mcp-server and emits connect on click', async () => {
		const { getByTestId, emitted } = render(baseMcp);

		const connect = getByTestId('tools-connection-row-connect');
		expect(connect.textContent).toContain('Connect');

		await fireEvent.click(connect);
		expect(emitted().connect?.[0]).toEqual([baseMcp]);
		expect(emitted()['open-detail']).toBeUndefined();
	});

	it('emits first-credential-connect when the standalone Connect button is used for an item with credentials', async () => {
		const item: McpServerConnectionItem = {
			...baseMcp,
			credentials: [{ authType: 'mcpOAuth2Api', required: true }],
		};
		const { getByTestId, emitted } = render(item);

		await fireEvent.click(getByTestId('tools-connection-row-connect'));

		expect(emitted()['first-credential-connect']?.[0]).toEqual([item]);
		expect(emitted().connect?.[0]).toEqual([item]);
	});

	it('shows a Connect button for an available node and emits connect on click', async () => {
		const { getByTestId, emitted } = render(baseNode);

		const connect = getByTestId('tools-connection-row-connect');
		expect(connect.textContent).toContain('Connect');

		await fireEvent.click(connect);
		expect(emitted().connect?.[0]).toEqual([baseNode]);
		expect(emitted()['open-detail']).toBeUndefined();
	});

	it('shows a Connect button for an available workflow', () => {
		const { getByTestId } = render(baseWorkflow);
		expect(getByTestId('tools-connection-row-connect')).toBeTruthy();
	});

	it('shows the credential picker for a connected item', () => {
		const connected: McpServerConnectionItem = {
			...baseMcp,
			isConnected: true,
			credentials: [{ authType: 'mcpOAuth2Api', credentialId: 'cred-1', required: true }],
		};
		const { getByTestId } = render(connected);

		expect(getByTestId('tool-credential-picker')).toBeTruthy();
	});

	it('emits open-detail when the main row action is clicked', async () => {
		const { getByTestId, emitted } = render(baseMcp);

		await fireEvent.click(getByTestId('tools-connection-row-main'));

		expect(emitted()['open-detail']?.[0]).toEqual([baseMcp]);
	});

	it('emits open-detail when the main row action is keyboard activated', async () => {
		const { getByTestId, emitted } = render(baseMcp);

		getByTestId('tools-connection-row-main').focus();
		await userEvent.keyboard('{Enter}');

		expect(emitted()['open-detail']?.[0]).toEqual([baseMcp]);
	});

	it('does not fire open-detail when clicking the Connect action', async () => {
		const { getByTestId, emitted } = render(baseMcp);

		await fireEvent.click(getByTestId('tools-connection-row-connect'));
		expect(emitted().connect).toHaveLength(1);
		expect(emitted()['open-detail']).toBeUndefined();
	});

	it('emits open-detail when a node row is clicked', async () => {
		const { getByTestId, emitted } = render(baseNode);

		await fireEvent.click(getByTestId('tools-connection-row-main'));
		expect(emitted()['open-detail']?.[0]).toEqual([baseNode]);
	});

	it('keeps row actions as sibling interactive controls', () => {
		const { getByTestId } = render(baseMcp);

		expect(getByTestId('tools-connection-row').getAttribute('role')).toBeNull();
		expect(getByTestId('tools-connection-row-main').tagName).toBe('BUTTON');
		expect(
			getByTestId('tools-connection-row-main').contains(
				getByTestId('tools-connection-row-connect'),
			),
		).toBe(false);
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
