import { AI_GATEWAY_MANAGED_TAG, MANAGED_CREDENTIAL_TOKEN } from '@n8n/api-types';

import { extractAgentCredentialIds } from '../extract-agent-credential-ids';

describe('extractAgentCredentialIds', () => {
	it('extracts local credential references and leaves tool inputs opaque', () => {
		const result = extractAgentCredentialIds({
			credential: 'main-model-credential',
			memory: {
				observationalMemory: {
					observerModel: { credential: 'observer-credential' },
					reflectorModel: { credential: 'reflector-credential' },
				},
				episodicMemory: {
					credential: 'memory-embedding-credential',
					reflectorModel: { credential: 'episodic-reflector-credential' },
				},
			},
			subAgents: {
				modelsByDifficulty: {
					low: { credential: 'low-credential' },
					medium: { credential: 'medium-credential' },
					high: { credential: 'high-credential' },
				},
			},
			config: { webSearch: { credential: 'search-credential' } },
			integrations: [{ credentialId: 'integration-credential' }],
			mcpServers: [{ credential: 'mcp-credential' }],
			vectorStores: [
				{
					credential: 'vector-store-credential',
					embedding: { credential: 'vector-embedding-credential' },
				},
			],
			tools: [
				{
					enabled: false,
					node: {
						credentials: {
							openAiApi: { id: 'node-tool-credential', name: 'OpenAI account' },
						},
						nodeParameters: {
							credentialId: 'remote-credential',
							credential: 'authored-value',
							credentials: { remote: { id: 'remote-value' } },
						},
					},
				},
				{ type: 'workflow', inputs: { data: { value: { credentialId: 'input-value' } } } },
			],
			providerTools: { custom: { credential: 'provider-argument' } },
			unrelated: { id: 'not-a-credential-reference' },
		});

		expect(result).toEqual(
			new Set([
				'main-model-credential',
				'observer-credential',
				'reflector-credential',
				'memory-embedding-credential',
				'episodic-reflector-credential',
				'low-credential',
				'medium-credential',
				'high-credential',
				'search-credential',
				'integration-credential',
				'mcp-credential',
				'vector-store-credential',
				'vector-embedding-credential',
				'node-tool-credential',
			]),
		);
	});

	it('deduplicates the same credential found through multiple reference forms', () => {
		const result = extractAgentCredentialIds({
			credential: 'shared-credential',
			integrations: [{ credentialId: 'shared-credential' }],
			tools: [
				{
					node: {
						credentials: {
							openAiApi: { id: 'shared-credential', name: 'OpenAI account' },
						},
					},
				},
			],
		});

		expect(result).toEqual(new Set(['shared-credential']));
	});

	it('ignores empty and managed credential references', () => {
		const result = extractAgentCredentialIds({
			credential: '',
			memory: {
				episodicMemory: { credential: MANAGED_CREDENTIAL_TOKEN },
				observationalMemory: { observerModel: { credential: AI_GATEWAY_MANAGED_TAG } },
			},
			integrations: [
				{ credentialId: '' },
				{ credentialId: MANAGED_CREDENTIAL_TOKEN },
				{ credentialId: 'real-credential' },
			],
			tools: [
				{
					node: {
						credentials: {
							empty: { id: '', name: 'Empty' },
							managed: { id: MANAGED_CREDENTIAL_TOKEN, name: 'Managed' },
							gateway: { id: AI_GATEWAY_MANAGED_TAG, name: 'n8n Connect' },
						},
					},
				},
			],
		});

		expect(result).toEqual(new Set(['real-credential']));
	});

	it('skips null and array values where a credential record is expected', () => {
		const result = extractAgentCredentialIds({
			credential: 'main-model-credential',
			tools: [
				{ node: { credentials: null } },
				{ node: { credentials: [{ id: 'array-credential' }] } },
				{ node: { credentials: { openAiApi: null } } },
			],
		});

		expect(result).toEqual(new Set(['main-model-credential']));
	});

	it('lets callers extract draft and published snapshots separately and union them', () => {
		const draftIds = extractAgentCredentialIds({
			credential: 'draft-credential',
			integrations: [{ credentialId: 'shared-credential' }],
		});
		const publishedIds = extractAgentCredentialIds({
			credential: 'published-credential',
			tools: [
				{
					node: {
						credentials: {
							openAiApi: { id: 'shared-credential', name: 'OpenAI account' },
						},
					},
				},
			],
		});

		expect(draftIds).toEqual(new Set(['draft-credential', 'shared-credential']));
		expect(publishedIds).toEqual(new Set(['published-credential', 'shared-credential']));
		expect(new Set([...draftIds, ...publishedIds])).toEqual(
			new Set(['draft-credential', 'shared-credential', 'published-credential']),
		);
	});
});
