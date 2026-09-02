import type { Serialized } from '@langchain/core/load/serializable';
import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { N8nNonEstimatingTracing } from '../N8nNonEstimatingTracing';

describe('N8nNonEstimatingTracing', () => {
	const executionFunctions = mock<ISupplyDataFunctions>({
		addInputData: jest.fn().mockReturnValue({ index: 0 }),
		addOutputData: jest.fn(),
		getNode: jest.fn().mockReturnValue({ name: 'TestNode' }),
		getNextRunIndex: jest.fn().mockReturnValue(0),
	});

	beforeEach(() => {
		jest.clearAllMocks();
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
});
