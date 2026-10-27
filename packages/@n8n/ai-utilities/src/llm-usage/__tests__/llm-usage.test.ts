import { createHash } from 'node:crypto';

import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { getContextVariable } from '@langchain/core/context';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';
import type { ChatResult, LLMResult } from '@langchain/core/outputs';

import {
	checkLlmCall,
	credentialFromNode,
	enrichLlmCallContext,
	getLlmCallContext,
	isLlmUsageCredential,
	normalizeProvider,
	providerFromCredential,
	reportLlmUsage,
	runWithLlmCallContext,
	setLlmUsageSink,
	type LlmCallContext,
	type LlmUsage,
	type LlmUsageRecord,
} from '..';
import { withLangChainUsageIterable } from '../langchain';
import { LangChainUsageTracker, LlmUsageCallbackHandler } from '../langchain-handler';

class TestChatModel extends BaseChatModel {
	constructor(private readonly provider = 'google_genai') {
		super({});
	}

	_llmType() {
		return 'test';
	}

	getLsParams(options: this['ParsedCallOptions']): ReturnType<BaseChatModel['getLsParams']> {
		return {
			...super.getLsParams(options),
			ls_provider: this.provider,
			ls_model_name: 'test-model',
		};
	}

	async _generate(): Promise<ChatResult> {
		const message = new AIMessage({
			content: 'hi',
			id: 'msg_1',
			usage_metadata: {
				input_tokens: 11,
				output_tokens: 7,
				total_tokens: 18,
				input_token_details: { cache_read: 3 },
			},
			response_metadata: { model_name: 'test-model-2025' },
		});
		return { generations: [{ text: 'hi', message }] };
	}
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const usage = (overrides: Partial<LlmUsage> = {}): LlmUsage => ({
	provider: 'openai',
	model: 'gpt-x',
	inputTokens: 1,
	outputTokens: 1,
	finishedAt: new Date(),
	...overrides,
});

const nodeContext: LlmCallContext = { callerType: 'node', workflowId: 'wf-1', nodeName: 'Agent' };

describe('llm-usage', () => {
	let records: LlmUsageRecord[];

	beforeEach(() => {
		records = [];
	});

	afterEach(() => {
		setLlmUsageSink(undefined);
	});

	const useCollectingSink = () => setLlmUsageSink({ write: (record) => records.push(record) });

	it('runs the function and reports nothing without a sink', async () => {
		const result = await runWithLlmCallContext(nodeContext, async () => {
			reportLlmUsage(usage());
			return getLlmCallContext();
		});

		expect(result).toBeUndefined();
		expect(records).toEqual([]);
	});

	it('attaches the scope context and derives a stable identity from the provider ID', async () => {
		useCollectingSink();

		await runWithLlmCallContext(nodeContext, async () => {
			reportLlmUsage(usage({ providerResponseId: 'chatcmpl-1' }));
			reportLlmUsage(usage({ providerResponseId: 'chatcmpl-1' }));
		});

		expect(records).toHaveLength(2);
		expect(records[0].context).toBe(nodeContext);
		expect(records[0].id).toBe(sha256('openai:chatcmpl-1:gpt-x:1:1'));
		expect(records[1].id).toBe(records[0].id);
	});

	it('drops IDs made up by client libraries and normalizes the provider', () => {
		useCollectingSink();

		reportLlmUsage(usage({ provider: 'google_genai', providerResponseId: 'run-abc' }));
		reportLlmUsage(usage({ providerResponseId: 'aitxt-abc' }));
		reportLlmUsage(usage({ provider: 'moonshotai' }));
		reportLlmUsage(usage({ provider: 'DashScope' }));

		expect(records[0].provider).toBe('google');
		expect(records[2].provider).toBe('moonshot');
		expect(records[3].provider).toBe('alibaba');
		expect(records[0].providerResponseId).toBeUndefined();
		// A time-ordered UUID (version 7) when the provider gives no ID.
		expect(records[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
		expect(records[1].providerResponseId).toBeUndefined();
		expect(records[0].context).toEqual({ callerType: 'unknown' });
	});

	it('resolves AI SDK transport names and credential types to one provider name', () => {
		expect(normalizeProvider('openai.responses')).toBe('openai');
		expect(normalizeProvider('google-vertex')).toBe('google');
		expect(normalizeProvider('azure-openai')).toBe('openai');
		expect(normalizeProvider('aws-bedrock')).toBe('bedrock');
		expect(normalizeProvider('google-vertex-anthropic')).toBe('anthropic');
		expect(providerFromCredential('perplexityApi')).toBe('perplexity');
		expect(providerFromCredential('moonshotApi')).toBe('moonshot');
		expect(providerFromCredential('googlePalmApi')).toBe('google');
		expect(providerFromCredential('httpHeaderAuth')).toBeUndefined();
		expect(providerFromCredential(undefined)).toBeUndefined();
	});

	it('counts a malformed token count as 0 and rounds a fraction', () => {
		useCollectingSink();

		reportLlmUsage(usage({ inputTokens: Number.NaN, outputTokens: 2.6, cacheReadTokens: -1 }));

		expect(records[0]).toMatchObject({ inputTokens: 0, outputTokens: 3, cacheReadTokens: 0 });
	});

	it('does not throw when the sink throws', () => {
		setLlmUsageSink({
			write: () => {
				throw new Error('sink failed');
			},
		});

		expect(() => reportLlmUsage(usage())).not.toThrow();
	});

	it('uses the inner context in nested scopes and keeps parallel scopes isolated', async () => {
		useCollectingSink();
		const inner: LlmCallContext = { callerType: 'node', workflowId: 'wf-child' };
		const other: LlmCallContext = { callerType: 'agent', agentId: 'agent-1' };

		await Promise.all([
			runWithLlmCallContext(nodeContext, async () => {
				await runWithLlmCallContext(inner, async () => reportLlmUsage(usage()));
				await new Promise((resolve) => setTimeout(resolve, 5));
				reportLlmUsage(usage());
			}),
			runWithLlmCallContext(other, async () => reportLlmUsage(usage())),
		]);

		expect(records.map((r) => r.context)).toEqual(
			expect.arrayContaining([inner, other, nodeContext]),
		);
		expect(records).toHaveLength(3);
	});

	it('captures a LangChain chat model call with its context', async () => {
		useCollectingSink();

		await new TestChatModel().invoke('hi', {
			callbacks: [new LlmUsageCallbackHandler(nodeContext)],
		});

		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({
			id: sha256('google:msg_1:test-model-2025:11:7'),
			provider: 'google',
			model: 'test-model-2025',
			providerResponseId: 'msg_1',
			inputTokens: 11,
			outputTokens: 7,
			cacheReadTokens: 3,
			subType: 'llm',
			context: nodeContext,
		});
		expect(records[0].startedAt).toBeInstanceOf(Date);
	});

	it('gives the provider of the caller, then of the response, priority over LangChain', async () => {
		useCollectingSink();
		const tracker = new LangChainUsageTracker();
		const output = (provider?: string): LLMResult => ({
			generations: [
				[
					{
						text: 'hi',
						message: new AIMessage({
							content: 'hi',
							usage_metadata: { input_tokens: 10, output_tokens: 2, total_tokens: 12 },
							response_metadata: provider ? { provider } : {},
						}),
					} as never,
				],
			],
		});

		tracker.start('run-1', { ls_provider: 'LangchainChatModelAdapter' });
		tracker.end(output('acme'), 'run-1');
		tracker.start('run-2', { ls_provider: 'openai' });
		tracker.end(output(), 'run-2', undefined, 'deepseek');

		expect(records.map((record) => record.provider)).toEqual(['acme', 'deepseek']);
	});

	it('counts reasoning tokens that the output leaves out but the total includes', () => {
		useCollectingSink();
		const tracker = new LangChainUsageTracker();

		tracker.end(
			{
				generations: [
					[
						{
							text: 'hi',
							message: new AIMessage({
								content: 'hi',
								usage_metadata: { input_tokens: 10, output_tokens: 5, total_tokens: 40 },
							}),
						} as never,
					],
				],
			},
			'run-1',
		);

		expect(records[0].outputTokens).toBe(30);
	});

	it('reports a text-completion model from the token usage of the run', () => {
		useCollectingSink();
		const tracker = new LangChainUsageTracker();

		tracker.start('run-1', { ls_provider: 'ollama', ls_model_name: 'llama3' });
		tracker.end(
			{
				generations: [[{ text: 'hi' }]],
				llmOutput: { tokenUsage: { promptTokens: 8, completionTokens: 3 } },
			},
			'run-1',
		);

		expect(records).toEqual([
			expect.objectContaining({
				provider: 'ollama',
				model: 'llama3',
				inputTokens: 8,
				outputTokens: 3,
			}),
		]);
	});

	it('reports the LangChain calls of an iterable, also when the caller passes its own callbacks', async () => {
		useCollectingSink();
		const userHandler = { handleLLMEnd: vi.fn() };

		async function* chat() {
			const input: BaseLanguageModelInput = 'hi';
			yield await new TestChatModel().invoke(input, { callbacks: [userHandler] });
		}
		for await (const _message of withLangChainUsageIterable(nodeContext, chat())) {
			// Consume outside any scope.
		}

		expect(records).toHaveLength(1);
		expect(records[0].context).toEqual(nodeContext);
		expect(userHandler.handleLLMEnd).toHaveBeenCalledTimes(1);
	});

	it('opens a LangChain scope for each step and leaves the caller context unchanged', async () => {
		useCollectingSink();
		const handlers: unknown[] = [];
		async function* source() {
			for (let step = 0; step < 3; step++) {
				handlers.push(getContextVariable('n8n_llm_usage_handler'));
				yield step;
			}
		}

		for await (const _step of withLangChainUsageIterable(nodeContext, source())) {
			// Consume outside any scope.
		}

		expect(handlers.every((handler) => handler instanceof LlmUsageCallbackHandler)).toBe(true);
		expect(getContextVariable('n8n_llm_usage_handler')).toBeUndefined();
	});

	it('keeps the context inside a lazily consumed async generator', async () => {
		useCollectingSink();
		const seen: Array<LlmCallContext | undefined> = [];

		async function* producer() {
			seen.push(getLlmCallContext());
			await new Promise((resolve) => setTimeout(resolve, 1));
			seen.push(getLlmCallContext());
			yield 1;
			seen.push(getLlmCallContext());
		}

		const values: number[] = [];
		for await (const value of withLangChainUsageIterable(nodeContext, producer())) {
			values.push(value);
		}

		expect(values).toEqual([1]);
		expect(seen).toEqual([nodeContext, nodeContext, nodeContext]);
	});

	it('adds fields to the current scope, so later reports carry them', async () => {
		useCollectingSink();

		await runWithLlmCallContext({ callerType: 'instance-ai', threadId: 't-1' }, async () => {
			enrichLlmCallContext({ projectId: 'project-1' });
			reportLlmUsage(usage());
		});
		enrichLlmCallContext({ projectId: 'outside' });

		expect(records[0].context).toEqual({
			callerType: 'instance-ai',
			threadId: 't-1',
			projectId: 'project-1',
		});
	});

	it('records the credential of the call, else the credential of the scope', async () => {
		useCollectingSink();

		await runWithLlmCallContext(
			{ callerType: 'instance-ai', credential: { managedBy: 'assistant' } },
			async () => {
				reportLlmUsage(usage());
				reportLlmUsage(usage({ credential: { id: 'cred-1' } }));
			},
		);
		reportLlmUsage(usage());

		expect(records.map((record) => record.credential)).toEqual([
			{ managedBy: 'assistant' },
			{ id: 'cred-1' },
			undefined,
		]);
	});

	describe('checkLlmCall', () => {
		it('lets the call go when no guard is set', async () => {
			await expect(checkLlmCall({ context: { callerType: 'node' } })).resolves.toBeUndefined();
		});
	});

	describe('credentialFromNode', () => {
		it('picks the slot of the given credential type', () => {
			const credentials = {
				openAiApi: { id: 'cred-openai', name: 'OpenAI' },
				httpHeaderAuth: { id: 'cred-header', name: 'Header' },
			};

			expect(credentialFromNode(credentials, 'httpHeaderAuth')).toEqual({ id: 'cred-header' });
		});

		it('picks the only LLM credential when no type is given', () => {
			const credentials = {
				openAiApi: { id: 'cred-openai', name: 'OpenAI' },
				httpHeaderAuth: { id: 'cred-header', name: 'Header' },
			};

			expect(credentialFromNode(credentials)).toEqual({ id: 'cred-openai' });
		});

		it('leaves the credential out when the choice is not clear', () => {
			const credentials = {
				openAiApi: { id: 'cred-openai', name: 'OpenAI' },
				anthropicApi: { id: 'cred-anthropic', name: 'Anthropic' },
			};

			expect(credentialFromNode(credentials)).toBeUndefined();
			expect(credentialFromNode(undefined)).toBeUndefined();
		});

		it('marks a slot that Gateway credits pay for, without an ID', () => {
			const credentials = { openAiApi: { id: null, name: 'Gateway', __aiGatewayManaged: true } };

			expect(credentialFromNode(credentials)).toEqual({ managedBy: 'aiGateway' });
		});
	});

	it('accepts only the known credential shapes', () => {
		expect(isLlmUsageCredential({ id: 'cred-1' })).toBe(true);
		expect(isLlmUsageCredential({ managedBy: 'aiGateway' })).toBe(true);
		expect(isLlmUsageCredential({ managedBy: 'other' })).toBe(false);
		expect(isLlmUsageCredential('cred-1')).toBe(false);
		expect(isLlmUsageCredential(undefined)).toBe(false);
	});
});
