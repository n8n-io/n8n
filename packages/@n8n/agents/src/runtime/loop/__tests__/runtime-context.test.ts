import type { BuiltMemory, BuiltTool } from '../../../types';
import type { ModelConfig } from '../../../types/sdk/agent';
import { READ_HISTORY_TOOL_NAME } from '../../memory/history-recall-tool';
import { getCatalogModelId, getModelIdString } from '../../../utils/model';
import { RuntimeContextBuilder } from '../runtime-context';

describe('getModelIdString', () => {
	it('returns a plain string model id unchanged', () => {
		expect(getModelIdString('anthropic/claude-opus-4-8')).toBe('anthropic/claude-opus-4-8');
	});

	it('returns the id field for an OpenAI-compatible config object', () => {
		const config = {
			id: 'anthropic/claude-opus-4-8',
			url: 'https://proxy.example/v1',
		} as ModelConfig;
		expect(getModelIdString(config)).toBe('anthropic/claude-opus-4-8');
	});

	it('normalizes a pre-built LanguageModel provider sub-namespace to the canonical provider id', () => {
		// @ai-sdk/anthropic stamps `.provider` as 'anthropic.messages'; the billing
		// rate table is keyed on the canonical 'anthropic/<model>' id.
		const model = {
			provider: 'anthropic.messages',
			modelId: 'claude-opus-4-8',
		} as unknown as ModelConfig;
		expect(getModelIdString(model)).toBe('anthropic/claude-opus-4-8');
	});

	it('leaves a provider without a sub-namespace unchanged', () => {
		const model = { provider: 'anthropic', modelId: 'claude-opus-4-8' } as unknown as ModelConfig;
		expect(getModelIdString(model)).toBe('anthropic/claude-opus-4-8');
	});

	it('falls back to "unknown" when neither id nor modelId is present', () => {
		const model = {} as unknown as ModelConfig;
		expect(getModelIdString(model)).toBe('unknown');
	});
});

describe('getCatalogModelId', () => {
	it('returns the served model of a Foundry deployment', () => {
		expect(
			getCatalogModelId({ id: 'azure-openai/my-chat', catalogModelId: 'azure-openai/gpt-4.1' }),
		).toBe('azure-openai/gpt-4.1');
	});

	it('falls back to the model id', () => {
		expect(getCatalogModelId({ id: 'azure-openai/my-chat' })).toBe('azure-openai/my-chat');
		expect(getCatalogModelId('anthropic/claude-opus-4-8')).toBe('anthropic/claude-opus-4-8');
	});
});

describe('read_history wiring', () => {
	const persistence = { threadId: 't-1', resourceId: 'r-1' };
	const memory = { getMessages: vi.fn(async () => []) } as unknown as BuiltMemory;

	function build(historyRecall: boolean, tools: BuiltTool[] = []) {
		return new RuntimeContextBuilder(
			{
				name: 'test',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Base instructions',
				memory,
				observationalMemory: { historyRecall },
				tools,
			},
			undefined,
		);
	}

	it('adds read_history when history recall is enabled', () => {
		const names = build(true)
			.getCurrentTools(persistence)
			.map((tool) => tool.name);
		expect(names).toContain(READ_HISTORY_TOOL_NAME);
	});

	it('leaves read_history out when history recall is off', () => {
		const names = build(false)
			.getCurrentTools(persistence)
			.map((tool) => tool.name);
		expect(names).not.toContain(READ_HISTORY_TOOL_NAME);
	});

	it('leaves read_history out without persistence', () => {
		const names = build(true)
			.getCurrentTools()
			.map((tool) => tool.name);
		expect(names).not.toContain(READ_HISTORY_TOOL_NAME);
	});

	it('rejects a user tool with the reserved name', () => {
		const userTool = { name: READ_HISTORY_TOOL_NAME } as BuiltTool;
		expect(() => build(true, [userTool]).getCurrentTools(persistence)).toThrow(
			'is reserved while history recall is enabled',
		);
	});
});

describe('Vertex thinking options', () => {
	it.each([
		{
			modelId: 'google-vertex/claude-sonnet-4-5',
			thinking: { budgetTokens: 4096 },
			expected: { anthropic: { thinking: { type: 'enabled', budgetTokens: 4096 } } },
		},
		{
			modelId: 'google-vertex/claude-opus-5@default',
			thinking: { budgetTokens: 4096 },
			expected: {
				anthropic: {
					thinking: { type: 'adaptive', display: 'summarized' },
					effort: 'medium',
				},
			},
		},
		{
			modelId: 'google-vertex/gemini-2.5-flash',
			thinking: { thinkingBudget: 2048 },
			expected: { google: { thinkingConfig: { thinkingBudget: 2048 } } },
		},
		{
			modelId: 'google-vertex/gemini-3-flash-preview',
			thinking: { thinkingLevel: 'high' as const },
			expected: { google: { thinkingConfig: { thinkingLevel: 'high' } } },
		},
		{
			modelId: 'google-vertex/endpoints/123456789',
			sdk: '@ai-sdk/google-vertex',
			thinking: { thinkingBudget: 2048 },
			expected: { google: { thinkingConfig: { thinkingBudget: 2048 } } },
		},
		{
			modelId: 'google-vertex/mistral-medium-3',
			thinking: { thinkingBudget: 2048 },
			expected: undefined,
		},
	])('maps thinking options for $modelId', ({ modelId, sdk, thinking, expected }) => {
		const builder = new RuntimeContextBuilder(
			{
				name: 'test',
				model: {
					id: modelId,
					sdk,
					project: 'test-project',
					location: 'global',
					clientEmail: 'test@example.com',
					privateKey: 'test-key',
				},
				instructions: '',
				thinking,
			},
			undefined,
		);

		expect(builder.buildStaticLoopContext().providerOptions).toEqual(expected);
		expect(builder.modelId).toBe(modelId);
	});
});

describe('Foundry reasoning', () => {
	it.each([
		{ modelId: 'azure-openai/anthropic/my-claude', catalogModelId: undefined, expected: undefined },
		{
			modelId: 'azure-openai/anthropic/my-claude',
			catalogModelId: 'azure-openai/claude-opus-4-5',
			expected: 'high',
		},
		{ modelId: 'azure-openai/my-chat', catalogModelId: undefined, expected: 'high' },
	])(
		'passes reasoning $expected for $modelId served as $catalogModelId',
		({ modelId, catalogModelId, expected }) => {
			const builder = new RuntimeContextBuilder(
				{
					name: 'test',
					model: {
						id: modelId,
						...(catalogModelId ? { catalogModelId } : {}),
						apiKey: 'az-key',
						endpointType: 'foundry',
						baseURL: 'https://my-resource.services.ai.azure.com/openai/v1',
					},
					instructions: '',
					reasoning: 'high',
				},
				undefined,
			);

			expect(builder.buildStaticLoopContext().reasoning).toBe(expected);
		},
	);
});
