import type { Serialized } from '@langchain/core/load/serializable';
import { AIMessage } from '@langchain/core/messages';
import type { ChatGeneration, Generation } from '@langchain/core/outputs';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { N8nNonEstimatingTracing } from '../N8nNonEstimatingTracing';

describe('N8nNonEstimatingTracing', () => {
	const executionFunctions = mock<ISupplyDataFunctions>({
		addInputData: vi.fn().mockReturnValue({ index: 0 }),
		addOutputData: vi.fn(),
		getNode: vi.fn().mockReturnValue({ name: 'TestNode' }),
		getNextRunIndex: vi.fn().mockReturnValue(0),
	});

	beforeEach(() => {
		vi.clearAllMocks();
		executionFunctions.addInputData.mockReturnValue({ index: 0 });
	});

	describe('handleLLMStart', () => {
		const serializedModel: Serialized = {
			lc: 1,
			type: 'constructor',
			id: ['langchain', 'chat_models', 'openai'],
			kwargs: {
				model: 'gpt-4',
				configuration: {
					baseURL: 'https://api.openai.com/v1',
					defaultHeaders: {
						'User-Agent': 'n8n',
						authorization: 'Bearer My_secret_API_key123456789',
						'x-secret-header': 'My_secret_API_key123456789',
					},
				},
			},
		};

		const getPersistedHeaders = () => {
			const inputArg = executionFunctions.addInputData.mock.calls[0][1] as Array<
				Array<{ json: { options: { configuration: { defaultHeaders: Record<string, string> } } } }>
			>;
			return inputArg[0][0].json.options.configuration.defaultHeaders;
		};

		it('should mask declared header values in persisted input data', async () => {
			const tracer = new N8nNonEstimatingTracing(executionFunctions, {
				redactedHeaders: ['x-secret-header'],
			});

			await tracer.handleLLMStart(serializedModel, ['hello'], 'run-123');

			const persistedHeaders = getPersistedHeaders();
			expect(persistedHeaders['x-secret-header']).toBe('**********');
			// non-declared header is untouched
			expect(persistedHeaders['User-Agent']).toBe('n8n');

			// stored run details are masked the same way
			const storedOptions = tracer.runsMap['run-123'].options as {
				configuration: { defaultHeaders: Record<string, string> };
			};
			expect(storedOptions.configuration.defaultHeaders['x-secret-header']).toBe('**********');

			// the original serialized object is not mutated
			expect(
				(serializedModel.kwargs.configuration as { defaultHeaders: Record<string, string> })
					.defaultHeaders['x-secret-header'],
			).toBe('My_secret_API_key123456789');
		});

		it('should mask the always-redacted header names without being asked to', async () => {
			const tracer = new N8nNonEstimatingTracing(executionFunctions);

			await tracer.handleLLMStart(serializedModel, ['hello'], 'run-123');

			// the floor every model gets: ALWAYS_REDACTED_HEADERS in redact-headers.ts, which
			// covers the nodes that declare no header names of their own
			expect(getPersistedHeaders().authorization).toBe('**********');
		});

		it('should keep header values that are neither declared nor always-redacted', async () => {
			const tracer = new N8nNonEstimatingTracing(executionFunctions);

			await tracer.handleLLMStart(serializedModel, ['hello'], 'run-123');

			// masking is opt-in per header name, so a name the model never declared is kept
			expect(getPersistedHeaders()['x-secret-header']).toBe('My_secret_API_key123456789');
		});
	});

	describe('handleLLMEnd', () => {
		type PersistedGeneration = { text: string; generationInfo?: Record<string, unknown> };

		const persistGeneration = async (generation: Generation): Promise<PersistedGeneration> => {
			const tracer = new N8nNonEstimatingTracing(executionFunctions);
			tracer.runsMap['run-123'] = { index: 0, messages: ['hello'], options: {} };

			await tracer.handleLLMEnd({ generations: [[generation]], llmOutput: {} }, 'run-123');

			const [, , data] = executionFunctions.addOutputData.mock.calls[0] as unknown as [
				unknown,
				unknown,
				Array<Array<{ json: { response: { generations: PersistedGeneration[][] } } }>>,
			];
			return data[0][0].json.response.generations[0][0];
		};

		const createChatGeneration = (
			responseMetadata: Record<string, unknown>,
			generationInfo?: Record<string, unknown>,
		): ChatGeneration => ({
			text: 'Hello',
			message: new AIMessage({ content: 'Hello', response_metadata: responseMetadata }),
			...(generationInfo && { generationInfo }),
		});

		it('keeps the name LangChain wrote to generationInfo when streaming', async () => {
			const persisted = await persistGeneration({
				text: 'Hello',
				generationInfo: { finish_reason: 'stop', model_name: 'gpt-4.1-mini-2025-04-14' },
			});

			expect(persisted.generationInfo).toEqual({
				finish_reason: 'stop',
				model_name: 'gpt-4.1-mini-2025-04-14',
			});
		});

		it('creates generationInfo from the message name when the generation has none', async () => {
			const persisted = await persistGeneration(
				createChatGeneration({ model_name: 'gpt-4.1-mini-2025-04-14' }),
			);

			expect(persisted).toEqual({
				text: 'Hello',
				generationInfo: { model_name: 'gpt-4.1-mini-2025-04-14' },
			});
		});

		it('omits model_name when nothing reports a name', async () => {
			const persisted = await persistGeneration(
				createChatGeneration({}, { finish_reason: 'stop' }),
			);

			expect('model_name' in (persisted.generationInfo ?? {})).toBe(false);
		});

		it.each([
			['blank', ''],
			['whitespace-only', '   '],
			['non-string', 42],
			['null', null],
			['undefined', undefined],
		])(
			'omits an unresolvable %s model_name that is already in generationInfo',
			async (_, value) => {
				const persisted = await persistGeneration({
					text: 'Hello',
					generationInfo: { finish_reason: 'stop', model_name: value },
				});

				expect(persisted.generationInfo).toEqual({ finish_reason: 'stop' });
				expect('model_name' in (persisted.generationInfo ?? {})).toBe(false);
			},
		);

		it('never lets the raw model key reach the output', async () => {
			await persistGeneration(createChatGeneration({ model: 'gpt-4.1-minigpt-4.1-mini' }));

			expect(JSON.stringify(executionFunctions.addOutputData.mock.calls)).not.toContain(
				'gpt-4.1-minigpt-4.1-mini',
			);
		});
	});
});
