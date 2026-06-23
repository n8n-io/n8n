import { describe, it, expect } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';

import ToolCredentialPicker from '../ToolCredentialPicker.vue';
import {
	TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY,
	type McpServerConnectionItem,
	type NodeConnectionItem,
	type PickableCredential,
	type ToolConnectionCredentialAdapter,
	type ToolCredentialRef,
} from '../types';

const renderPicker = createComponentRenderer(ToolCredentialPicker);

function makeAdapter(credentials: PickableCredential[]): ToolConnectionCredentialAdapter {
	return {
		getCredentialsByType: (authType) => credentials.filter((c) => c.type === authType),
		openNewCredential: () => {},
	};
}

const baseMcpItem: McpServerConnectionItem = {
	id: 'mcp-1',
	kind: 'mcp-server',
	title: 'Notion',
	description: 'Notion MCP',
	availableTools: [],
	isConnected: false,
};

const baseNodeItem: NodeConnectionItem = {
	id: 'node:slack',
	kind: 'node',
	title: 'Slack',
	isConnected: false,
	nodeTypeName: 'n8n-nodes-base.slack',
};

function render(
	item: McpServerConnectionItem | NodeConnectionItem,
	credentials: ToolCredentialRef[],
	storeCredentials: PickableCredential[] = [],
) {
	return renderPicker({
		props: { item, credentials },
		pinia: createTestingPinia(),
		global: {
			provide: {
				[TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY as symbol]: makeAdapter(storeCredentials),
			},
		},
	});
}

describe('ToolCredentialPicker', () => {
	it('shows the Connect button when no credential is selected', () => {
		const { getByTestId, queryByTestId } = render(baseMcpItem, [{ authType: 'mcpOAuth2Api' }]);
		expect(getByTestId('tool-credential-picker-trigger-connect')).toBeTruthy();
		expect(queryByTestId('tool-credential-picker-trigger-connected')).toBeNull();
	});

	it('shows the Connected pill when at least one credential is selected', () => {
		const { getByTestId, queryByTestId } = render(baseMcpItem, [
			{ authType: 'mcpOAuth2Api', credentialId: 'cred-1' },
		]);
		expect(getByTestId('tool-credential-picker-trigger-connected')).toBeTruthy();
		expect(queryByTestId('tool-credential-picker-trigger-connect')).toBeNull();
	});

	it('shows the generic Connect label on the trigger', () => {
		const { getByTestId } = render(baseNodeItem, [{ authType: 'slackApi' }]);
		const trigger = getByTestId('tool-credential-picker-trigger-connect');
		expect(trigger.textContent?.toLowerCase()).toContain('connect');
	});

	it('emits select-credential with (item, authType, credentialId) on row click', async () => {
		const { getByTestId, findByTestId, emitted } = render(
			baseNodeItem,
			[{ authType: 'slackApi' }],
			[{ id: 'c-1', name: 'My Slack', type: 'slackApi' }],
		);
		await fireEvent.click(getByTestId('tool-credential-picker-trigger-connect'));
		const row = await findByTestId('tool-credential-picker-row');
		await fireEvent.click(row);
		const events = emitted()['select-credential'];
		expect(events?.[0]).toEqual([baseNodeItem, 'slackApi', 'c-1']);
	});

	it('renders a single trigger even when the item accepts multiple auth types', () => {
		const { getAllByTestId } = render(baseNodeItem, [
			{ authType: 'googleApi' },
			{ authType: 'gmailOAuth2' },
		]);
		expect(getAllByTestId('tool-credential-picker-trigger-connect')).toHaveLength(1);
	});
});
