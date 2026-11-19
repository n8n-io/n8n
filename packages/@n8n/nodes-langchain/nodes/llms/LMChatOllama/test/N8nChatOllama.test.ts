import { makeN8nLlmFailedAttemptHandler } from '@n8n/ai-utilities';
import { wrapLangChainParserError } from '@utils/output_parsers/langchainParserError';
import {
	NodeApiError,
	NodeOperationError,
	type INode,
	type ISupplyDataFunctions,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { N8nChatOllama } from '../N8nChatOllama';

describe('N8nChatOllama', () => {
	const node = mock<INode>({ type: '@n8n/n8n-nodes-langchain.lmChatOllama' });
	const ctx = mock<ISupplyDataFunctions>({ getNode: () => node });

	it('should preserve successful responses', async () => {
		const onFailedAttempt = vi.fn();
		const model = new N8nChatOllama({
			model: 'test-model',
			fetch: async () =>
				Response.json({
					model: 'test-model',
					message: { role: 'assistant', content: 'OK' },
					done: true,
				}),
			onFailedAttempt,
		});

		const response = await model.invoke('Hello');

		expect(response.content).toBe('OK');
		expect(onFailedAttempt).not.toHaveBeenCalled();
	});

	it.each(['invoke', 'stream'] as const)(
		'should classify an Ollama billing response during %s as a warning',
		async (method) => {
			const message = 'Add usage credits or subscribe and save up to 66%: https://ollama.com/plans';
			const fetch = vi
				.fn()
				.mockImplementation(async () => Response.json({ error: message }, { status: 402 }));
			const model = new N8nChatOllama({
				model: 'test-model',
				fetch,
				onFailedAttempt: makeN8nLlmFailedAttemptHandler(ctx),
			});
			const run = async () => {
				if (method === 'invoke') {
					return await model.invoke('Hello');
				}

				for await (const chunk of await model.stream('Hello')) {
					void chunk;
				}

				return undefined;
			};

			const error = await run().catch((caught: unknown) => caught);

			expect(error).toBeInstanceOf(NodeApiError);
			expect(error).toMatchObject({
				httpCode: '402',
				level: 'warning',
				description: message,
				cause: { name: 'ResponseError', status_code: 402, message },
			});
			expect(fetch).toHaveBeenCalledTimes(1);

			const agentError = new NodeOperationError(
				node,
				wrapLangChainParserError(error, node, 0, { enrichNonParserErrors: true }),
			);

			expect(agentError.level).toBe('warning');
		},
	);

	it('should preserve server errors', async () => {
		const model = new N8nChatOllama({
			model: 'test-model',
			fetch: async () => Response.json({ error: 'Service unavailable' }, { status: 503 }),
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(ctx),
		});

		await expect(model.invoke('Hello')).rejects.toMatchObject({
			name: 'ResponseError',
			status_code: 503,
			message: 'Service unavailable',
		});
	});
});
