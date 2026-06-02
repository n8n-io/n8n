import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useDefaultJudgeSelection } from './useDefaultJudgeSelection';

type MockNode = {
	name: string;
	type: string;
	parameters?: Record<string, unknown>;
	credentials?: Record<string, { id: string | null; name: string }>;
};

// Plain holders rather than module-scope `ref()`s — module-scope reactive refs
// inside `vi.mock` factories can survive vitest worker teardown and surface
// as post-teardown unhandled rejections on Node 24.
const state = vi.hoisted(() => ({
	allNodes: [] as MockNode[],
	allCredentials: [] as Array<{ id: string }>,
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({
		value: {
			get allNodes() {
				return state.allNodes;
			},
		},
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		get allCredentials() {
			return state.allCredentials;
		},
	}),
}));

describe('useDefaultJudgeSelection', () => {
	beforeEach(() => {
		state.allNodes = [];
		state.allCredentials = [];
	});

	it('returns null when the workflow has no language-model sub-node', () => {
		state.allNodes = [
			{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' },
		];
		state.allCredentials = [{ id: 'cred-1' }];

		const selection = useDefaultJudgeSelection();
		expect(selection.value).toBeNull();
	});

	it('extracts provider/model/credentialId from a resourceLocator-shaped model param', () => {
		state.allNodes = [
			{
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' } },
				credentials: { openAiApi: { id: 'cred-1', name: 'OpenAI account' } },
			},
		];
		state.allCredentials = [{ id: 'cred-1' }];

		const selection = useDefaultJudgeSelection();
		expect(selection.value).toEqual({
			provider: 'openai',
			model: 'gpt-4o-mini',
			credentialId: 'cred-1',
		});
	});

	it('extracts model from the legacy string form (older lmChat* node versions)', () => {
		state.allNodes = [
			{
				name: 'Anthropic Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				parameters: { model: 'claude-3-5-sonnet-20241022' },
				credentials: { anthropicApi: { id: 'cred-2', name: 'Anthropic account' } },
			},
		];
		state.allCredentials = [{ id: 'cred-2' }];

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
		state.allNodes = [
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
		state.allCredentials = [{ id: 'cred-openai' }, { id: 'cred-anthropic' }];

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
		state.allNodes = [
			{
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' } },
				credentials: { openAiApi: { id: 'cred-shared', name: 'Shared OpenAI' } },
			},
		];
		// User has no credentials in their account at all — the workflow's
		// credential id belongs to someone else.
		state.allCredentials = [];

		const selection = useDefaultJudgeSelection();
		expect(selection.value).toBeNull();
	});

	it('skips sub-nodes missing a model value and falls through to the next match', () => {
		state.allNodes = [
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
		state.allCredentials = [{ id: 'cred-openai' }, { id: 'cred-anthropic' }];

		const selection = useDefaultJudgeSelection();
		expect(selection.value).toEqual({
			provider: 'anthropic',
			model: 'claude-3-5-sonnet-20241022',
			credentialId: 'cred-anthropic',
		});
	});

	it('skips sub-nodes with no credential slot bound', () => {
		state.allNodes = [
			{
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' } },
				// `credentials` is undefined entirely — node just dropped onto the
				// canvas, never configured.
			},
		];
		state.allCredentials = [{ id: 'cred-openai' }];

		const selection = useDefaultJudgeSelection();
		expect(selection.value).toBeNull();
	});
});
