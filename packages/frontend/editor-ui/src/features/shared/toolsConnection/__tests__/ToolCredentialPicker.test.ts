import { describe, it, expect, vi } from 'vitest';
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
		openExistingCredential: () => {},
	};
}

const baseMcpItem: McpServerConnectionItem = {
	id: 'mcp-1',
	kind: 'mcp-server',
	title: 'Notion',
	description: 'Notion MCP',
	availableTools: [],
	status: 'none',
};

const baseNodeItem: NodeConnectionItem = {
	id: 'node:slack',
	kind: 'node',
	title: 'Slack',
	status: 'none',
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

	it('shows the Connected pill for a connected item', () => {
		const item = { ...baseMcpItem, status: 'connected' as const };
		const { getByTestId, queryByTestId } = render(item, [
			{ authType: 'mcpOAuth2Api', credentialId: 'cred-1' },
		]);
		expect(getByTestId('tool-credential-picker-trigger-connected')).toBeTruthy();
		expect(queryByTestId('tool-credential-picker-trigger-connect')).toBeNull();
	});

	it('distinguishes a disconnected connection from a tool that was never added', () => {
		const disconnectedItem = { ...baseMcpItem, status: 'disconnected' as const };
		const disconnected = render(disconnectedItem, [{ authType: 'mcpOAuth2Api' }]);

		expect(
			disconnected.getByTestId('tool-credential-picker-trigger-disconnected'),
		).toHaveTextContent('Reconnect');
		expect(disconnected.queryByTestId('tool-credential-picker-trigger-connect')).toBeNull();
		disconnected.unmount();

		const neverAdded = render(baseMcpItem, [{ authType: 'mcpOAuth2Api' }]);
		expect(neverAdded.getByTestId('tool-credential-picker-trigger-connect')).toHaveTextContent(
			'Connect',
		);
		expect(neverAdded.queryByTestId('tool-credential-picker-trigger-disconnected')).toBeNull();
	});

	it('shows only a non-interactive status while connecting', () => {
		const item = { ...baseMcpItem, status: 'connecting' as const };
		const { getByTestId, queryByTestId } = render(item, [{ authType: 'mcpOAuth2Api' }]);

		expect(getByTestId('tool-credential-picker-trigger-connecting')).toHaveTextContent(
			'Connecting',
		);
		expect(queryByTestId('tool-credential-picker')).toBeNull();
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

	it('emits credential-dropdown-open when the credential dropdown opens', async () => {
		const { getByTestId, emitted } = render(
			baseNodeItem,
			[{ authType: 'slackApi' }],
			[{ id: 'c-1', name: 'My Slack', type: 'slackApi' }],
		);

		await fireEvent.click(getByTestId('tool-credential-picker-trigger-connect'));

		expect(emitted()['credential-dropdown-open']?.[0]).toEqual([baseNodeItem]);
	});

	it('emits new-credential-connect when creating from the dropdown', async () => {
		const { getByTestId, findByTestId, emitted } = render(
			baseNodeItem,
			[{ authType: 'slackApi' }],
			[{ id: 'c-1', name: 'My Slack', type: 'slackApi' }],
		);
		await fireEvent.click(getByTestId('tool-credential-picker-trigger-connect'));

		await fireEvent.click(await findByTestId('tool-credential-picker-create'));

		expect(emitted()['new-credential-connect']?.[0]).toEqual([baseNodeItem]);
	});

	it('emits first-credential-connect when connecting without existing credentials', async () => {
		const { getByTestId, emitted } = render(baseMcpItem, [{ authType: 'mcpOAuth2Api' }]);

		await fireEvent.click(getByTestId('tool-credential-picker-trigger-connect'));

		expect(emitted()['first-credential-connect']?.[0]).toEqual([baseMcpItem]);
	});

	it('renders a single trigger even when the item accepts multiple auth types', () => {
		const { getAllByTestId } = render(baseNodeItem, [
			{ authType: 'googleApi' },
			{ authType: 'gmailOAuth2' },
		]);
		expect(getAllByTestId('tool-credential-picker-trigger-connect')).toHaveLength(1);
	});

	it('opens one create action with all supported credential types', async () => {
		const openNewCredential = vi.fn();
		const credentials = [
			{ authType: 'githubOAuth2Api', displayName: 'OAuth2' },
			{ authType: 'githubApi', displayName: 'Access Token' },
		];
		const { getByTestId, findAllByTestId } = renderPicker({
			props: { item: baseMcpItem, credentials },
			pinia: createTestingPinia(),
			global: {
				provide: {
					[TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY as symbol]: {
						...makeAdapter([]),
						openNewCredential,
					},
				},
			},
		});

		await fireEvent.click(getByTestId('tool-credential-picker-trigger-connect'));
		const createActions = await findAllByTestId('tool-credential-picker-create');
		expect(createActions).toHaveLength(1);
		expect(createActions[0]).toHaveTextContent('Create credential');

		await fireEvent.click(createActions[0]);
		expect(openNewCredential).toHaveBeenCalledWith('githubOAuth2Api', baseMcpItem, [
			'githubOAuth2Api',
			'githubApi',
		]);
	});
});
