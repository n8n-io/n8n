import type { AgentJsonConfig, AgentJsonNodeToolConfig } from '@n8n/api-types';
import type { INodeTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	applyNativeWebSearchDefaultOn,
	reconcileNativeWebSearch,
	rejectIfDynamicSelectorUsesFromAi,
	rejectIfEmptyInstructions,
	rejectIfUnsupportedNativeWebSearch,
	type AgentConfigValidationMessages,
} from '../config-normalization';

const base: AgentJsonConfig = {
	name: 'Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help the user.',
};

const messages: AgentConfigValidationMessages = {
	emptyInstructionsFollowUp: 'saving the config again.',
	dynamicSelectorFollowUp: 'Resolve the value and write it into nodeParameters.',
};

describe('reconcileNativeWebSearch', () => {
	it('derives the native provider tool when web search is enabled on a native model', () => {
		const result = reconcileNativeWebSearch({
			...base,
			config: { webSearch: { enabled: true } },
		});
		expect(result.providerTools).toEqual({ 'anthropic.web_search': { maxUses: 5 } });
		expect(result.config?.webSearch).toEqual({ enabled: true });
	});

	it('keeps an explicit disable and clears previously-persisted native tools', () => {
		// Regression: the old write normalizer stripped `enabled: false`, which then
		// got resurrected on read. Reconcile must persist the disable and clear tools.
		const result = reconcileNativeWebSearch({
			...base,
			config: { webSearch: { enabled: false } },
			providerTools: { 'anthropic.web_search': { maxUses: 5 } },
		});
		expect(result.config?.webSearch).toEqual({ enabled: false });
		expect(result.providerTools).toEqual({});
	});

	it('derives the OpenAI provider tool for OpenAI models', () => {
		const result = reconcileNativeWebSearch({
			...base,
			model: 'openai/gpt-5',
			config: { webSearch: { enabled: true } },
		});
		expect(Object.keys(result.providerTools ?? {})).toEqual(['openai.web_search']);
	});

	it('strips stale native tools when a fallback provider is selected', () => {
		const result = reconcileNativeWebSearch({
			...base,
			config: { webSearch: { enabled: true, provider: 'brave' } },
			providerTools: { 'anthropic.web_search': { maxUses: 5 } },
		});
		expect(result.providerTools).toEqual({});
		expect(result.config?.webSearch).toEqual({ enabled: true, provider: 'brave' });
	});

	it('swaps native tools when the provider changes', () => {
		const result = reconcileNativeWebSearch({
			...base,
			model: 'anthropic/claude-sonnet-4-5',
			config: { webSearch: { enabled: true } },
			providerTools: { 'openai.web_search': { externalWebAccess: true } },
		});
		expect(result.providerTools).toEqual({ 'anthropic.web_search': { maxUses: 5 } });
	});

	it('leaves configs that never touch web search untouched', () => {
		const config = { ...base };
		const result = reconcileNativeWebSearch(config);
		expect(result).not.toHaveProperty('providerTools');
	});
});

describe('applyNativeWebSearchDefaultOn', () => {
	it('turns web search on by default for a native model', () => {
		const result = applyNativeWebSearchDefaultOn(base);
		expect(result.config?.webSearch).toEqual({ enabled: true });
	});

	it('does not enable web search for a non-native model', () => {
		const result = applyNativeWebSearchDefaultOn({ ...base, model: 'xai/grok-4' });
		expect(result.config?.webSearch).toBeUndefined();
	});

	it('respects an explicit disable', () => {
		const config = { ...base, config: { webSearch: { enabled: false } } };
		expect(applyNativeWebSearchDefaultOn(config)).toEqual(config);
	});

	it('does not override a fallback provider choice', () => {
		const config = {
			...base,
			config: { webSearch: { enabled: true, provider: 'brave' as const } },
		};
		expect(applyNativeWebSearchDefaultOn(config)).toEqual(config);
	});
});

describe('rejectIfEmptyInstructions', () => {
	it('rejects blank instructions', () => {
		expect(rejectIfEmptyInstructions({ ...base, instructions: '   ' }, messages)).toEqual([
			expect.objectContaining({ path: '/instructions' }),
		]);
	});

	it('appends the surface-specific follow-up guidance', () => {
		const result = rejectIfEmptyInstructions({ ...base, instructions: '' }, messages);
		expect(result?.[0].message).toContain('saving the config again.');
	});

	it('accepts non-empty instructions', () => {
		expect(rejectIfEmptyInstructions(base, messages)).toBeNull();
	});
});

describe('rejectIfUnsupportedNativeWebSearch', () => {
	it('rejects native web search on an unsupported model', () => {
		const result = rejectIfUnsupportedNativeWebSearch({
			...base,
			model: 'xai/grok-4',
			config: { webSearch: { enabled: true, provider: 'auto' } },
		});
		expect(result).toEqual([expect.objectContaining({ path: '/config/webSearch/provider' })]);
	});

	it('allows native web search on a supported model', () => {
		expect(
			rejectIfUnsupportedNativeWebSearch({
				...base,
				config: { webSearch: { enabled: true } },
			}),
		).toBeNull();
	});
});

describe('rejectIfDynamicSelectorUsesFromAi', () => {
	const nodeTypes = mock<INodeTypes>();
	nodeTypes.getByNameAndVersion.mockReturnValue({
		description: {
			properties: [
				{
					displayName: 'Team Name or ID',
					name: 'teamId',
					type: 'options',
					default: '',
					typeOptions: { loadOptionsMethod: 'getTeams' },
				},
			],
		},
	} as unknown as ReturnType<INodeTypes['getByNameAndVersion']>);

	const linearNodeTool: AgentJsonNodeToolConfig = {
		type: 'node',
		name: 'Linear',
		node: {
			nodeType: 'n8n-nodes-base.linearTool',
			nodeTypeVersion: 1.1,
			nodeParameters: { teamId: "={{ $fromAI('teamId', 'The team', 'string') }}" },
		},
	};

	const configWithFromAiSelector: AgentJsonConfig = {
		...base,
		tools: [linearNodeTool],
	};

	it('skips the check when no node-types provider is available', () => {
		expect(
			rejectIfDynamicSelectorUsesFromAi(configWithFromAiSelector, null, undefined, messages),
		).toBeNull();
	});

	it('rejects $fromAI on a dynamic selector parameter', () => {
		const result = rejectIfDynamicSelectorUsesFromAi(
			configWithFromAiSelector,
			null,
			nodeTypes,
			messages,
		);
		expect(result).toEqual([expect.objectContaining({ path: expect.stringContaining('teamId') })]);
	});

	it('tolerates a $fromAI selector that already existed on the previous config', () => {
		const result = rejectIfDynamicSelectorUsesFromAi(
			configWithFromAiSelector,
			configWithFromAiSelector,
			nodeTypes,
			messages,
		);
		expect(result).toBeNull();
	});

	it('tolerates a pre-existing $fromAI selector when the node tool was only renamed', () => {
		const renamed: AgentJsonConfig = {
			...configWithFromAiSelector,
			tools: [{ ...linearNodeTool, name: 'Linear Renamed' }],
		};
		const result = rejectIfDynamicSelectorUsesFromAi(
			renamed,
			configWithFromAiSelector,
			nodeTypes,
			messages,
		);
		expect(result).toBeNull();
	});
});
