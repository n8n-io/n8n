import { describe, it, expect } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';

import ToolRow from '../ToolRow.vue';
import {
	TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY,
	type McpServerConnectionItem,
	type NodeConnectionItem,
	type WorkflowConnectionItem,
} from '../types';

const renderRow = createComponentRenderer(ToolRow);

function render(item: McpServerConnectionItem | NodeConnectionItem | WorkflowConnectionItem) {
	return renderRow({ props: { item }, pinia: createTestingPinia() });
}

/** Mirrors a consumer that manages credentials inline, such as Instance AI. */
function renderWithAdapter(
	item: McpServerConnectionItem | NodeConnectionItem | WorkflowConnectionItem,
) {
	return renderRow({
		props: { item },
		pinia: createTestingPinia(),
		global: {
			provide: {
				[TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY as symbol]: {
					getCredentialsByType: () => [{ id: 'cred-1', name: 'Prod', type: 'mcpOAuth2Api' }],
					openNewCredential: vi.fn(),
					openExistingCredential: vi.fn(),
				},
			},
		},
	});
}

const baseMcp: McpServerConnectionItem = {
	id: 'mcp-1',
	kind: 'mcp-server',
	title: 'Notion',
	description: 'Connect to Notion',
	status: 'none',
	availableTools: [],
};

const baseNode: NodeConnectionItem = {
	id: 'node-1',
	kind: 'node',
	title: 'OpenAI',
	description: 'Talk to GPT',
	status: 'none',
	nodeTypeName: '@n8n/n8n-nodes-langchain.openAi',
};

const connectedMcp: McpServerConnectionItem = {
	...baseMcp,
	status: 'connected',
	credentials: [{ authType: 'mcpOAuth2Api', credentialId: 'cred-1', required: true }],
};

const baseWorkflow: WorkflowConnectionItem = {
	id: 'wf-1',
	kind: 'workflow',
	title: 'Summariser',
	status: 'none',
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

	it.each([
		['node', baseNode],
		['workflow', baseWorkflow],
	])('leaves a %s row to the row click, with no button repeating it', (_kind, item) => {
		const { queryByTestId } = render(item);

		expect(queryByTestId('tools-connection-row-connect')).toBeNull();
		expect(queryByTestId('tools-connection-row-install')).toBeNull();
	});

	it('shows the credential picker for a connected item when an adapter is provided', () => {
		const { getByTestId } = renderWithAdapter(connectedMcp);

		expect(getByTestId('tool-credential-picker')).toBeTruthy();
	});

	it('shows a static connected marker when the item does not use credentials', () => {
		const item = { ...connectedMcp, credentials: undefined };
		const { getByTestId, queryByTestId } = renderWithAdapter(item);

		expect(getByTestId('tools-connection-row-connected')).toBeTruthy();
		expect(queryByTestId('tool-credential-picker')).toBeNull();
	});

	it('shows a static connected marker when no credential adapter is provided', () => {
		// The picker cannot list or create anything without an adapter, so
		// consumers that manage credentials elsewhere get status only.
		const { getByTestId, queryByTestId } = render(connectedMcp);

		expect(getByTestId('tools-connection-row-connected')).toBeTruthy();
		expect(queryByTestId('tool-credential-picker')).toBeNull();
		// Crucially not a Connect button — the tool is already connected.
		expect(queryByTestId('tools-connection-row-connect')).toBeNull();
	});

	it('suppresses row and connect actions while connecting', async () => {
		const item = { ...baseMcp, status: 'connecting' as const };
		const { getByTestId, queryByTestId, emitted } = render(item);

		expect(getByTestId('tools-connection-row-connecting')).toHaveTextContent('Connecting');
		expect(getByTestId('tools-connection-row-main')).toBeDisabled();
		expect(queryByTestId('tools-connection-row-connect')).toBeNull();

		await fireEvent.click(getByTestId('tools-connection-row-main'));
		expect(emitted()['open-detail']).toBeUndefined();
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

	it('offers Install for an uninstalled community node', async () => {
		const item: NodeConnectionItem = { ...baseNode, verified: true, communityPreview: true };
		const { getByTestId, queryByTestId, emitted } = render(item);

		expect(getByTestId('tools-connection-row-verified-badge')).toBeTruthy();
		expect(queryByTestId('tools-connection-row-connect')).toBeNull();

		const install = getByTestId('tools-connection-row-install');
		expect(install.textContent).toContain('Install');

		await fireEvent.click(install);
		expect(emitted().connect?.[0]).toEqual([item]);
	});

	it('renders a Free credits pill for a gateway-backed item and no Connect button', () => {
		const item: NodeConnectionItem = { ...baseNode, freeCredits: true };
		const { getByTestId, queryByTestId } = render(item);

		const pill = getByTestId('tools-connection-row-free-credits');
		expect(pill.textContent).toContain('Free credits');
		// Gateway tools are ready to use: added, never connected.
		expect(queryByTestId('tools-connection-row-connect')).toBeNull();
	});

	it('omits the Free credits pill for a regular item', () => {
		const { queryByTestId } = render(baseNode);
		expect(queryByTestId('tools-connection-row-free-credits')).toBeNull();
	});

	it('shows the warning of a workflow row', () => {
		const { getByTestId } = render({ ...baseWorkflow, warning: 'Not published' });
		expect(getByTestId('tools-connection-row-warning').textContent).toContain('Not published');
	});

	it('keeps the verified badge on an installed community node', () => {
		const item: NodeConnectionItem = { ...baseNode, verified: true };
		const { getByTestId, queryByTestId } = render(item);

		// The badge tracks "reviewed by n8n", not install state.
		expect(getByTestId('tools-connection-row-verified-badge')).toBeTruthy();
		expect(queryByTestId('tools-connection-row-install')).toBeNull();
	});

	it('blocks the install action when the user cannot install community nodes', async () => {
		const item: NodeConnectionItem = {
			...baseNode,
			verified: true,
			communityPreview: true,
			installDisabled: true,
		};
		const { getByTestId, emitted } = render(item);

		const install = getByTestId('tools-connection-row-install');
		expect(install).toBeDisabled();

		await fireEvent.click(install);
		expect(emitted().connect).toBeUndefined();
	});

	describe('disabled rows', () => {
		const disabledWorkflow: WorkflowConnectionItem = {
			...baseWorkflow,
			disabled: true,
			disabledReason: "Contains nodes that aren't supported as agent tools (Wait, Form)",
		};

		it('renders a disabled marker instead of a connect/install action', () => {
			const { getByTestId, queryByTestId } = render(disabledWorkflow);

			expect(getByTestId('tools-connection-row-disabled')).toBeTruthy();
			// A disabled row never offers a connect or install action.
			expect(queryByTestId('tools-connection-row-connect')).toBeNull();
			expect(queryByTestId('tools-connection-row-install')).toBeNull();
		});

		it('does not emit open-detail when the main row action is clicked', async () => {
			const { getByTestId, emitted } = render(disabledWorkflow);

			await fireEvent.click(getByTestId('tools-connection-row-main'));

			expect(emitted()['open-detail']).toBeUndefined();
		});

		it('renders the main action button as disabled', () => {
			const { getByTestId } = render(disabledWorkflow);

			expect(getByTestId('tools-connection-row-main')).toBeDisabled();
		});
	});
});
