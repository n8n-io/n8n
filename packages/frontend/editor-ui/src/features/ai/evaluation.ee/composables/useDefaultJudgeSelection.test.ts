import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

import { useDefaultJudgeSelection } from './useDefaultJudgeSelection';

// `injectWorkflowDocumentStore` returns a `{ value }` wrapper with `allNodes`
// off `value`. Mirroring that shape lets us drive each test case by mutating
// the ref instead of re-mocking per test.
const mockAllNodes = ref<
	Array<{
		name: string;
		type: string;
		parameters?: Record<string, unknown>;
		credentials?: Record<string, { id: string | null; name: string }>;
	}>
>([]);
vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({
		value: {
			get allNodes() {
				return mockAllNodes.value;
			},
		},
	}),
}));

// `allCredentials` is the only field the composable consults. Returning a
// minimal ref-backed list keeps the test honest about the contract without
// pulling in the full Pinia store setup.
const mockAllCredentials = ref<Array<{ id: string }>>([]);
vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		get allCredentials() {
			return mockAllCredentials.value;
		},
	}),
}));

describe('useDefaultJudgeSelection', () => {
	beforeEach(() => {
		mockAllNodes.value = [];
		mockAllCredentials.value = [];
	});

	it('returns null when the workflow has no language-model sub-node', () => {
		mockAllNodes.value = [
			{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' },
		];
		mockAllCredentials.value = [{ id: 'cred-1' }];

		const selection = useDefaultJudgeSelection();
		expect(selection.value).toBeNull();
	});

	it('extracts provider/model/credentialId from a resourceLocator-shaped model param', () => {
		mockAllNodes.value = [
			{
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' } },
				credentials: { openAiApi: { id: 'cred-1', name: 'OpenAI account' } },
			},
		];
		mockAllCredentials.value = [{ id: 'cred-1' }];

		const selection = useDefaultJudgeSelection();
		expect(selection.value).toEqual({
			provider: 'openai',
			model: 'gpt-4o-mini',
			credentialId: 'cred-1',
		});
	});

	it('extracts model from the legacy string form (older lmChat* node versions)', () => {
		mockAllNodes.value = [
			{
				name: 'Anthropic Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				parameters: { model: 'claude-3-5-sonnet-20241022' },
				credentials: { anthropicApi: { id: 'cred-2', name: 'Anthropic account' } },
			},
		];
		mockAllCredentials.value = [{ id: 'cred-2' }];

		const selection = useDefaultJudgeSelection();
		expect(selection.value).toEqual({
			provider: 'anthropic',
			model: 'claude-3-5-sonnet-20241022',
			credentialId: 'cred-2',
		});
	});

	// Mirrors what the user sees scanning the canvas top-to-bottom: the FIRST
	// lmChat sub-node wins. Important so the default stays predictable across
	// re-renders and across workflows that wire up multiple models.
	it('picks the first matching sub-node in canvas order', () => {
		mockAllNodes.value = [
			{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
			{
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' } },
				credentials: { openAiApi: { id: 'cred-openai', name: 'OpenAI account' } },
			},
			{
				name: 'Anthropic Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				parameters: { model: 'claude-3-5-sonnet-20241022' },
				credentials: { anthropicApi: { id: 'cred-anthropic', name: 'Anthropic account' } },
			},
		];
		mockAllCredentials.value = [{ id: 'cred-openai' }, { id: 'cred-anthropic' }];

		const selection = useDefaultJudgeSelection();
		expect(selection.value).toEqual({
			provider: 'openai',
			model: 'gpt-4o-mini',
			credentialId: 'cred-openai',
		});
	});

	// Skip rather than persist: the chat-hub picker validates credentialIds
	// against the user's accessible credentials, so adopting an unreachable id
	// would render as a broken/missing selection in the UI.
	it('returns null when the sub-node references a credential the user cannot see', () => {
		mockAllNodes.value = [
			{
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' } },
				credentials: { openAiApi: { id: 'cred-shared', name: 'Shared OpenAI' } },
			},
		];
		// User has no credentials in their account at all — the workflow's
		// credential id belongs to someone else.
		mockAllCredentials.value = [];

		const selection = useDefaultJudgeSelection();
		expect(selection.value).toBeNull();
	});

	it('skips sub-nodes missing a model value and falls through to the next match', () => {
		mockAllNodes.value = [
			{
				// First sub-node has no model picked yet — defaulted but never
				// touched. We should keep looking instead of returning a
				// half-configured selection.
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				parameters: { model: { __rl: true, mode: 'list', value: '' } },
				credentials: { openAiApi: { id: 'cred-openai', name: 'OpenAI account' } },
			},
			{
				name: 'Anthropic Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				parameters: { model: 'claude-3-5-sonnet-20241022' },
				credentials: { anthropicApi: { id: 'cred-anthropic', name: 'Anthropic account' } },
			},
		];
		mockAllCredentials.value = [{ id: 'cred-openai' }, { id: 'cred-anthropic' }];

		const selection = useDefaultJudgeSelection();
		expect(selection.value).toEqual({
			provider: 'anthropic',
			model: 'claude-3-5-sonnet-20241022',
			credentialId: 'cred-anthropic',
		});
	});

	it('skips sub-nodes with no credential slot bound', () => {
		mockAllNodes.value = [
			{
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' } },
				// `credentials` is undefined entirely — node just dropped onto the
				// canvas, never configured.
			},
		];
		mockAllCredentials.value = [{ id: 'cred-openai' }];

		const selection = useDefaultJudgeSelection();
		expect(selection.value).toBeNull();
	});
});
