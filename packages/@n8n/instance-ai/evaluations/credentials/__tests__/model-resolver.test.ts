import type { AgentJsonConfig } from '@n8n/api-types';

import type { WorkflowTestCase } from '../../types';
import {
	describeModelResolution,
	resolveAgentConfigModels,
	resolveCaseAgentModels,
	resolveDirectRunAgentModels,
	resolveModel,
} from '../model-resolver';

const keys = (...types: string[]): ReadonlySet<string> => new Set(types);

describe('resolveModel', () => {
	it.each([
		['anthropic/claude-sonnet-4-5', 'anthropicApi'],
		['openai/gpt-5-mini', 'openAiApi'],
		['openrouter/x-ai/grok-4', 'openRouterApi'],
		['google/gemini-2.5-pro', 'googlePalmApi'],
	])('runs %s as-is when its provider has a real key', (model, credentialType) => {
		expect(resolveModel(model, keys(credentialType))).toEqual({
			kind: 'direct',
			originalModel: model,
			actualModel: model,
			credentialType,
		});
	});

	it.each([
		['xai/grok-4.7', 'openrouter/x-ai/grok-4.7'],
		['mistral/mistral-large-2512', 'openrouter/mistralai/mistral-large-2512'],
		['deepseek/deepseek-chat', 'openrouter/deepseek/deepseek-chat'],
		['deepseek/deepseek-reasoner', 'openrouter/deepseek/deepseek-r1-0528'],
		['groq/openai/gpt-oss-120b', 'openrouter/openai/gpt-oss-120b'],
		[
			'groq/meta-llama/Llama-4-Scout-17B-16E-Instruct',
			'openrouter/meta-llama/llama-4-scout-17b-16e-instruct',
		],
		['nvidia/meta/llama-3.1-70b-instruct', 'openrouter/meta-llama/llama-3.1-70b-instruct'],
		['nvidia/deepseek-ai/deepseek-v3.2', 'openrouter/deepseek/deepseek-v3.2'],
		['moonshotai/kimi-k2.6', 'openrouter/moonshotai/kimi-k2.6'],
		['moonshotai/kimi-k2-0711-preview', 'openrouter/moonshotai/kimi-k2'],
		['moonshotai/kimi-k2-0905-preview', 'openrouter/moonshotai/kimi-k2-0905'],
		['alibaba/qwen3-32b', 'openrouter/qwen/qwen3-32b'],
		['minimax/minimax-m2.7', 'openrouter/minimax/minimax-m2.7'],
		['cohere/command-a-03-2025', 'openrouter/cohere/command-a'],
		['cohere/command-r-08-2024', 'openrouter/cohere/command-r-08-2024'],
		['vercel/anthropic/claude-sonnet-4.6', 'openrouter/anthropic/claude-sonnet-4.6'],
		['google/gemini-2.5-pro', 'openrouter/google/gemini-2.5-pro'],
		['google/gemini-4-hydrogen', 'openrouter/google/gemini-4-hydrogen'],
		['google-vertex/gemini-2.5-flash', 'openrouter/google/gemini-2.5-flash'],
		['openai/gpt-5-mini', 'openrouter/openai/gpt-5-mini'],
		['anthropic/claude-sonnet-4-5', 'openrouter/anthropic/claude-sonnet-4.5'],
		['anthropic/claude-haiku-4-5-20251001', 'openrouter/anthropic/claude-haiku-4.5'],
		['anthropic/claude-3-5-sonnet-20241022', 'openrouter/anthropic/claude-3.5-sonnet'],
		['anthropic/claude-3-7-sonnet-20250219', 'openrouter/anthropic/claude-3.7-sonnet'],
		['anthropic/claude-3-opus-20240229', 'openrouter/anthropic/claude-3-opus'],
	])('routes %s to the same model on OpenRouter', (model, openRouterModel) => {
		expect(resolveModel(model, keys('openRouterApi'))).toEqual({
			kind: 'openrouter-same',
			originalModel: model,
			actualModel: openRouterModel,
			credentialType: 'openRouterApi',
		});
	});

	it.each([
		['google-vertex/claude-sonnet-4-5@20250929', 'anthropic/claude-sonnet-4-5'],
		[
			'aws-bedrock/us.anthropic.claude-opus-4-1-20250805-v1:0',
			'anthropic/claude-opus-4-1-20250805',
		],
		['aws-bedrock/anthropic.claude-haiku-4-5-20251001-v1:0', 'anthropic/claude-haiku-4-5-20251001'],
		['openrouter/anthropic/claude-sonnet-4.5', 'anthropic/claude-sonnet-4-5'],
		['vercel/anthropic/claude-sonnet-4.6', 'anthropic/claude-sonnet-4-6'],
	])(
		'runs Claude reached through another host (%s) on Anthropic as the same model',
		(model, same) => {
			expect(resolveModel(model, keys('anthropicApi', 'openRouterApi', 'googlePalmApi'))).toEqual({
				kind: 'direct',
				originalModel: model,
				actualModel: same,
				credentialType: 'anthropicApi',
			});
		},
	);

	it.each([
		['google-vertex/claude-sonnet-4-5@20250929', 'openrouter/anthropic/claude-sonnet-4.5'],
		[
			'aws-bedrock/us.anthropic.claude-opus-4-1-20250805-v1:0',
			'openrouter/anthropic/claude-opus-4.1',
		],
	])('routes Claude on %s to OpenRouter when Anthropic has no key', (model, openRouterModel) => {
		expect(resolveModel(model, keys('openRouterApi'))).toEqual({
			kind: 'openrouter-same',
			originalModel: model,
			actualModel: openRouterModel,
			credentialType: 'openRouterApi',
		});
	});

	describe('with the OpenRouter model list', () => {
		const listed = new Set(['openrouter/x-ai/grok-4.7', 'openrouter/anthropic/claude-sonnet-5.5']);

		it('routes a model OpenRouter lists', () => {
			expect(
				resolveModel('xai/grok-4.7', keys('openRouterApi'), { openRouterModels: listed }).kind,
			).toBe('openrouter-same');
		});

		it('maps a model OpenRouter does not list to a comparable one', () => {
			expect(
				resolveModel('anthropic/claude-3-5-sonnet-20241022', keys('openRouterApi'), {
					openRouterModels: listed,
				}),
			).toMatchObject({
				kind: 'comparable',
				actualModel: 'openrouter/anthropic/claude-sonnet-5.5',
			});
		});
	});

	it('prefers the provider key over OpenRouter', () => {
		expect(resolveModel('openai/gpt-5-mini', keys('openAiApi', 'openRouterApi')).kind).toBe(
			'direct',
		);
	});

	it.each([
		['azure-openai/prod-gpt-4o-mini', 'anthropic/claude-haiku-5-5'],
		['azure-openai/support-bot-deployment', 'anthropic/claude-sonnet-5-5'],
		['aws-bedrock/amazon.nova-pro-v1:0', 'anthropic/claude-opus-5-5'],
		['groq/llama-3.1-8b-instant', 'anthropic/claude-haiku-5-5'],
	])('maps %s, which has no OpenRouter twin, to a comparable model', (model, comparable) => {
		expect(resolveModel(model, keys('anthropicApi', 'openRouterApi'))).toEqual({
			kind: 'comparable',
			originalModel: model,
			actualModel: comparable,
			credentialType: 'anthropicApi',
		});
	});

	it('maps a model to a comparable one when OpenRouter has no key', () => {
		expect(resolveModel('google/gemini-2.5-flash', keys('anthropicApi'))).toEqual({
			kind: 'comparable',
			originalModel: 'google/gemini-2.5-flash',
			actualModel: 'anthropic/claude-haiku-5-5',
			credentialType: 'anthropicApi',
		});
	});

	it('uses the OpenRouter tier when only OpenRouter has a key', () => {
		expect(resolveModel('azure-openai/my-deployment', keys('openRouterApi'))).toMatchObject({
			kind: 'comparable',
			actualModel: 'openrouter/anthropic/claude-sonnet-5.5',
			credentialType: 'openRouterApi',
		});
	});

	it.each([['google/gemini-flash-lite-latest', 'anthropic/claude-haiku-5-5']])(
		'maps %s, which has no fixed OpenRouter id, to a comparable model',
		(model, comparable) => {
			expect(resolveModel(model, keys('anthropicApi', 'openRouterApi'))).toEqual({
				kind: 'comparable',
				originalModel: model,
				actualModel: comparable,
				credentialType: 'anthropicApi',
			});
		},
	);

	it('runs a free OpenRouter variant as its paid twin, which is not rate-limited', () => {
		expect(
			resolveModel('openrouter/nvidia/nemotron-nano-9b-v2:free', keys('openRouterApi')),
		).toEqual({
			kind: 'openrouter-same',
			originalModel: 'openrouter/nvidia/nemotron-nano-9b-v2:free',
			actualModel: 'openrouter/nvidia/nemotron-nano-9b-v2',
			credentialType: 'openRouterApi',
		});
	});

	it('maps a free OpenRouter variant to a comparable model without an OpenRouter key', () => {
		expect(
			resolveModel('openrouter/nvidia/nemotron-nano-9b-v2:free', keys('anthropicApi')),
		).toMatchObject({ kind: 'comparable', actualModel: 'anthropic/claude-haiku-5-5' });
	});

	it('skips when no available provider can serve the model', () => {
		expect(resolveModel('azure-openai/my-deployment', keys('googlePalmApi'))).toEqual({
			kind: 'skipped',
			originalModel: 'azure-openai/my-deployment',
			reason:
				'no model mapping for azure-openai/my-deployment: no real key for its provider, OpenRouter, or a comparable model',
		});
	});

	it('skips when no key is set at all', () => {
		expect(resolveModel('anthropic/claude-sonnet-4-5', keys()).kind).toBe('skipped');
	});
});

const baseConfig = (overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig => ({
	name: 'Support agent',
	model: 'anthropic/claude-sonnet-4-5',
	credential: '[redacted]',
	instructions: 'Help customers.',
	...overrides,
});

describe('resolveAgentConfigModels', () => {
	it('resolves every model slot in the config', () => {
		const { config, resolution } = resolveAgentConfigModels(
			baseConfig({
				model: 'xai/grok-4',
				subAgents: {
					modelsByDifficulty: { low: { model: 'openai/gpt-5-mini', credential: '[redacted]' } },
				},
				memory: {
					enabled: true,
					storage: 'n8n',
					observationalMemory: {
						observerModel: { model: 'anthropic/claude-haiku-4-5', credential: '[redacted]' },
						reflectorModel: { model: 'anthropic/claude-sonnet-4-5', credential: '[redacted]' },
					},
					episodicMemory: {
						enabled: true,
						credential: 'managed',
						reflectorModel: { model: 'deepseek/deepseek-chat', credential: '[redacted]' },
					},
				},
			}),
			keys('anthropicApi', 'openRouterApi'),
		);

		expect(config.model).toBe('openrouter/x-ai/grok-4');
		expect(config.subAgents?.modelsByDifficulty?.low?.model).toBe('openrouter/openai/gpt-5-mini');
		expect(config.memory?.observationalMemory?.observerModel?.model).toBe(
			'anthropic/claude-haiku-4-5',
		);
		expect(config.memory?.observationalMemory?.reflectorModel?.model).toBe(
			'anthropic/claude-sonnet-4-5',
		);
		const episodic = config.memory?.episodicMemory;
		expect(episodic?.enabled && episodic.reflectorModel?.model).toBe(
			'openrouter/deepseek/deepseek-chat',
		);
		expect(resolution.slots.map(({ slot, kind }) => [slot, kind])).toEqual([
			['model', 'openrouter-same'],
			['subAgents.modelsByDifficulty.low', 'openrouter-same'],
			['memory.observationalMemory.observerModel', 'direct'],
			['memory.observationalMemory.reflectorModel', 'direct'],
			['memory.episodicMemory.reflectorModel', 'openrouter-same'],
		]);
		expect(resolution.credentialTypes).toEqual(['openRouterApi', 'anthropicApi']);
	});

	it('records memory workers left unset as running on the resolved main model', () => {
		// The runtime gives an unset observer, reflector, and episodic consolidator the
		// Agent's own model and credential, so they follow the main model's route.
		const { config, resolution } = resolveAgentConfigModels(
			baseConfig({
				model: 'google/gemini-2.5-pro',
				memory: {
					enabled: true,
					storage: 'n8n',
					observationalMemory: { observerThresholdTokens: 2000 },
					episodicMemory: { enabled: true, credential: 'managed' },
				},
			}),
			keys('anthropicApi'),
		);

		expect(config.memory?.observationalMemory?.observerModel).toBeUndefined();
		expect(resolution.slots).toEqual([
			expect.objectContaining({ slot: 'model', actualModel: 'anthropic/claude-opus-5-5' }),
			...[
				'memory.observationalMemory.observerModel',
				'memory.observationalMemory.reflectorModel',
				'memory.episodicMemory.reflectorModel',
			].map((slot) =>
				expect.objectContaining({
					slot,
					kind: 'comparable',
					actualModel: 'anthropic/claude-opus-5-5',
					inheritsFrom: 'model',
				}),
			),
		]);
		expect(resolution.credentialTypes).toEqual(['anthropicApi']);
	});

	it('records no memory workers when observational memory is off', () => {
		const { resolution } = resolveAgentConfigModels(
			baseConfig({
				memory: { enabled: true, storage: 'n8n', observationalMemory: { enabled: false } },
			}),
			keys('anthropicApi'),
		);

		expect(resolution.slots.map((s) => s.slot)).toEqual(['model']);
	});

	it('records the main model and the least direct step as the run resolution', () => {
		const { resolution } = resolveAgentConfigModels(
			baseConfig({
				subAgents: {
					modelsByDifficulty: {
						high: { model: 'azure-openai/my-deployment', credential: '[redacted]' },
					},
				},
			}),
			keys('anthropicApi'),
		);

		expect(resolution).toMatchObject({
			modelResolution: 'comparable',
			originalModel: 'anthropic/claude-sonnet-4-5',
			actualModel: 'anthropic/claude-sonnet-4-5',
			tags: ['model-fallback'],
		});
	});

	it('tags nothing when every model runs as-is', () => {
		const { config, resolution } = resolveAgentConfigModels(baseConfig(), keys('anthropicApi'));

		expect(resolution).toMatchObject({ modelResolution: 'direct', tags: [], droppedOptions: [] });
		expect(config.model).toBe('anthropic/claude-sonnet-4-5');
	});

	it('gives a skip reason when any model has no mapping', () => {
		const { resolution } = resolveAgentConfigModels(baseConfig(), keys());

		expect(resolution.modelResolution).toBe('skipped');
		expect(resolution.skip).toEqual({
			kind: 'no-model-mapping',
			reason:
				'no model mapping for anthropic/claude-sonnet-4-5: no real key for its provider, OpenRouter, or a comparable model',
		});
	});

	it('drops Anthropic-only options when the main model leaves the Anthropic provider', () => {
		const { config, resolution } = resolveAgentConfigModels(
			baseConfig({
				providerTools: { 'anthropic.web_search': { maxUses: 5 } },
				config: { promptCaching: { enabled: true, anthropic: { ttl: '1h' } }, maxIterations: 5 },
			}),
			keys('openRouterApi'),
		);

		expect(config.providerTools).toBeUndefined();
		expect(config.config).toEqual({ promptCaching: { enabled: true }, maxIterations: 5 });
		expect(resolution.droppedOptions).toEqual([
			'config.promptCaching.anthropic',
			'providerTools.anthropic.web_search',
		]);
	});

	it('keeps provider options when the main model stays on its provider', () => {
		const providerTools = { 'anthropic.web_search': { maxUses: 5 } };
		const { config, resolution } = resolveAgentConfigModels(
			baseConfig({ providerTools }),
			keys('anthropicApi'),
		);

		expect(config.providerTools).toEqual(providerTools);
		expect(resolution.droppedOptions).toEqual([]);
	});

	it('needs an OpenAI credential for episodic memory embeddings', () => {
		const memory: AgentJsonConfig['memory'] = {
			enabled: true,
			storage: 'n8n',
			episodicMemory: { enabled: true, credential: 'managed' },
		};

		const withKey = resolveAgentConfigModels(
			baseConfig({ memory }),
			keys('anthropicApi', 'openAiApi'),
		);
		const withoutKey = resolveAgentConfigModels(baseConfig({ memory }), keys('anthropicApi'));

		expect(withKey.resolution.embeddings).toBe('openai');
		expect(withKey.resolution.credentialTypes).toEqual(['anthropicApi', 'openAiApi']);
		expect(withoutKey.resolution.embeddings).toBe('no-embedding-key');
		expect(withoutKey.resolution.credentialTypes).toEqual(['anthropicApi']);
	});

	it('reports no embeddings when episodic memory is off', () => {
		const { resolution } = resolveAgentConfigModels(baseConfig(), keys('anthropicApi'));

		expect(resolution.embeddings).toBe('none');
	});
});

const seededCase = (
	configs: AgentJsonConfig[],
	credentials?: WorkflowTestCase['credentials'],
): Pick<WorkflowTestCase, 'seed' | 'credentials' | 'tags'> => ({
	tags: ['agent-runtime'],
	...(credentials ? { credentials } : {}),
	seed: {
		mode: 'inline',
		messages: [],
		workflows: [],
		dataTables: [],
		folders: [],
		projects: [],
		agents: configs.map((config, index) => ({ id: `agent-${String(index)}`, config })),
	},
});

describe('resolveCaseAgentModels', () => {
	it('rewrites the seeded agents and declares each credential type they need once', () => {
		const { testCase: resolved, resolutions } = resolveCaseAgentModels(
			seededCase(
				[baseConfig({ model: 'xai/grok-4' }), baseConfig({ model: 'azure-openai/my-deployment' })],
				[{ type: 'slackApi' }, { type: 'anthropicApi', name: 'Mine' }],
			),
			keys('anthropicApi', 'openRouterApi'),
		);

		const agents = resolved.seed?.mode === 'inline' ? resolved.seed.agents : [];
		expect(agents.map((agent) => agent.config.model)).toEqual([
			'openrouter/x-ai/grok-4',
			'anthropic/claude-sonnet-5-5',
		]);
		// Only credentials the resolver binds models to get real model keys.
		expect(resolved.credentials).toEqual([
			{ type: 'slackApi' },
			{ type: 'anthropicApi', name: 'Mine', realModelKey: true },
			{ type: 'openRouterApi', realModelKey: true },
		]);
		expect(resolutions.map((r) => r.modelResolution)).toEqual(['openrouter-same', 'comparable']);
		expect(resolved.tags).toEqual(['agent-runtime', 'model-fallback']);
	});

	it('refuses a case that declares two credentials of a type a model or embeddings binds to', () => {
		const episodic = baseConfig({
			memory: {
				enabled: true,
				storage: 'n8n',
				episodicMemory: { enabled: true, credential: 'managed' },
			},
		});

		expect(() =>
			resolveCaseAgentModels(
				seededCase([episodic], [{ type: 'openAiApi' }, { type: 'openAiApi', name: 'Second' }]),
				keys('anthropicApi', 'openAiApi'),
			),
		).toThrow(
			'The case declares 2 openAiApi credentials. The restore binds a model or embedding credential only when exactly one of its type is declared, so remove the extra one.',
		);
	});

	it('accepts two credentials of a type no model binds to', () => {
		expect(() =>
			resolveCaseAgentModels(
				seededCase([baseConfig()], [{ type: 'slackApi' }, { type: 'slackApi', name: 'Second' }]),
				keys('anthropicApi'),
			),
		).not.toThrow();
	});

	it('leaves a case without seeded agents unchanged', () => {
		const testCase: Pick<WorkflowTestCase, 'seed' | 'credentials' | 'tags'> = { tags: ['x'] };

		expect(resolveCaseAgentModels(testCase, keys('anthropicApi'))).toEqual({
			testCase,
			resolutions: [],
		});
	});
});

describe('resolveDirectRunAgentModels', () => {
	const seededGrok = seededCase([baseConfig({ model: 'xai/grok-4' })]);

	it('resolves the seeded agents of a case that runs them directly', () => {
		const { testCase, resolutions } = resolveDirectRunAgentModels(
			{ ...seededGrok, agentRun: { mode: 'direct' } },
			keys('openRouterApi'),
		);

		expect(resolutions.map((r) => r.modelResolution)).toEqual(['openrouter-same']);
		expect(testCase.credentials).toEqual([{ type: 'openRouterApi', realModelKey: true }]);
	});

	it('leaves a case the assistant builds unchanged', () => {
		expect(resolveDirectRunAgentModels(seededGrok, keys('openRouterApi'))).toEqual({
			testCase: seededGrok,
			resolutions: [],
		});
	});
});

describe('describeModelResolution', () => {
	it('names the route, the models, and what was dropped', () => {
		const { resolution } = resolveAgentConfigModels(
			baseConfig({ config: { promptCaching: { enabled: true, anthropic: { ttl: '5m' } } } }),
			keys('openRouterApi'),
		);

		expect(describeModelResolution(resolution)).toBe(
			'openrouter-same anthropic/claude-sonnet-4-5 -> openrouter/anthropic/claude-sonnet-4.5 (dropped: config.promptCaching.anthropic)',
		);
	});

	it('gives the skip reason', () => {
		const { resolution } = resolveAgentConfigModels(baseConfig(), keys());

		expect(describeModelResolution(resolution)).toBe(
			'skipped: no model mapping for anthropic/claude-sonnet-4-5: no real key for its provider, OpenRouter, or a comparable model',
		);
	});
});

describe('resolveDirectRunAgentModels with episodic memory', () => {
	const episodicAgent = baseConfig({
		memory: {
			enabled: true,
			storage: 'n8n',
			episodicMemory: { enabled: true, credential: '[redacted]' },
		},
	});
	const directCase = (keepMemory: boolean) => ({
		...seededCase([episodicAgent]),
		agentRun: { mode: 'direct' as const, keepMemory },
	});

	it('skips a run that keeps episodic memory when no OpenAI key is set', () => {
		const { resolutions } = resolveDirectRunAgentModels(directCase(true), keys('anthropicApi'));

		expect(resolutions[0].skip).toEqual({
			kind: 'no-embedding-key',
			reason: 'no embedding key: episodic memory embeds with OpenAI, and no OpenAI key is set',
		});
		expect(resolutions[0].modelResolution).toBe('direct');
	});

	it('runs it when the OpenAI key is set', () => {
		const { resolutions } = resolveDirectRunAgentModels(
			directCase(true),
			keys('anthropicApi', 'openAiApi'),
		);

		expect(resolutions[0].skip).toBeUndefined();
	});

	it('runs it when the run strips memory', () => {
		const { resolutions } = resolveDirectRunAgentModels(directCase(false), keys('anthropicApi'));

		expect(resolutions[0].skip).toBeUndefined();
	});
});
