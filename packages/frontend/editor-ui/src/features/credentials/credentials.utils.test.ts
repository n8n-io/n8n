import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { INodeUi } from '@/Interface';
import { mockedStore } from '@/__tests__/utils';
import { useCredentialsStore } from './credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getAutoSelectedCredential } from './credentials.utils';

const openAiApiCredentialType = {
	name: 'openAiApi',
	displayName: 'OpenAi',
	documentationUrl: 'openAi',
	properties: [],
} satisfies Partial<ICredentialType> as ICredentialType;

const openAiNodeType = {
	displayName: 'OpenAI',
	name: '@n8n/n8n-nodes-langchain.openAi',
	group: ['transform'],
	version: 1,
	description: '',
	defaults: { name: 'OpenAI' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [{ name: 'openAiApi', required: true }],
	properties: [],
} as unknown as INodeTypeDescription;

function createCredential(
	overrides: Partial<{ id: string; name: string; type: string; updatedAt: string }> = {},
) {
	return {
		id: 'cred-1',
		name: 'OpenAi account',
		type: 'openAiApi',
		isManaged: false,
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides,
	};
}

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return {
		id: 'node-1',
		name: 'OpenAI',
		type: '@n8n/n8n-nodes-langchain.openAi',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: {},
		...overrides,
	};
}

describe('getAutoSelectedCredential', () => {
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		credentialsStore = mockedStore(useCredentialsStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);

		credentialsStore.state.credentialTypes = { openAiApi: openAiApiCredentialType };
		nodeTypesStore.setNodeTypes([openAiNodeType]);
	});

	it('picks the most recently updated usable credential of the node type', () => {
		credentialsStore.state.credentials = {
			older: createCredential({
				id: 'older',
				name: 'Older',
				updatedAt: '2024-01-01T00:00:00.000Z',
			}),
			newer: createCredential({
				id: 'newer',
				name: 'Newer',
				updatedAt: '2024-06-01T00:00:00.000Z',
			}),
		};

		expect(getAutoSelectedCredential(createNode())).toEqual({
			credentialType: 'openAiApi',
			credential: { id: 'newer', name: 'Newer' },
		});
	});

	it('returns undefined when the node already has a credential set', () => {
		credentialsStore.state.credentials = { older: createCredential({ id: 'older' }) };

		const node = createNode({
			credentials: { openAiApi: { id: 'older', name: 'Older' } },
		});

		expect(getAutoSelectedCredential(node)).toBeUndefined();
	});

	it('returns undefined when no usable credentials of the required type exist', () => {
		credentialsStore.state.credentials = {};

		expect(getAutoSelectedCredential(createNode())).toBeUndefined();
	});

	it('returns undefined for a node type without credentials', () => {
		nodeTypesStore.setNodeTypes([
			{ ...openAiNodeType, name: 'n8n-nodes-base.noOp', credentials: undefined },
		]);
		credentialsStore.state.credentials = { older: createCredential() };

		const node = createNode({ type: 'n8n-nodes-base.noOp' });

		expect(getAutoSelectedCredential(node)).toBeUndefined();
	});

	it('only considers the override credential type when one is given', () => {
		credentialsStore.state.credentialTypes = {
			openAiApi: openAiApiCredentialType,
			slackApi: { ...openAiApiCredentialType, name: 'slackApi', displayName: 'Slack' },
		};
		credentialsStore.state.credentials = {
			openai: createCredential({
				id: 'openai',
				name: 'OpenAI',
				updatedAt: '2024-06-01T00:00:00.000Z',
			}),
			slack: createCredential({
				id: 'slack',
				name: 'Slack',
				type: 'slackApi',
				updatedAt: '2024-01-01T00:00:00.000Z',
			}),
		};

		// The OpenAI credential is more recent, but the override narrows the pick
		expect(getAutoSelectedCredential(createNode(), 'slackApi')).toEqual({
			credentialType: 'slackApi',
			credential: { id: 'slack', name: 'Slack' },
		});
	});
});
