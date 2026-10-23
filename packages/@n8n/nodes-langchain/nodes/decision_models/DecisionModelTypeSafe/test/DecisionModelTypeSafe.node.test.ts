import type { DecisionModel } from '@n8n/ai-utilities';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { DecisionModelTypeSafe } from '../DecisionModelTypeSafe.node';

vi.mock('@n8n/utils/sleep', () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));

const API_KEY = 'ts-secret-key-do-not-leak';

const request = {
	state: 'The customer says they were charged twice and want their money back.',
	questions: {
		department: {
			type: 'choice' as const,
			instructions: 'Which team should handle this request?',
			options: [
				{ value: 'billing', description: 'Payments, invoices, and refunds' },
				{ value: 'technical' },
			],
		},
		urgency: {
			type: 'booleanProbability' as const,
			instructions: 'This request requires urgent attention',
		},
		severity: {
			type: 'score' as const,
			instructions: 'How severe is the customer impact?',
			levels: ['Low impact', 'Critical business impact'],
		},
	},
};

function systemOneBody() {
	return {
		model: 'jev-latest',
		answers: {
			department: {
				type: 'choice',
				choice: 'billing',
				probabilities: { billing: 0.96, technical: 0.04 },
				confidence: 0.92,
			},
			urgency: { type: 'noul', noul: 0.88 },
			severity: {
				type: 'score',
				score: 1.7,
				legend: { '0': 'Low impact', '1': 'Critical business impact' },
				probabilities: { '0': 0.3, '1': 0.7 },
				confidence: 0.79,
			},
		},
		usage: { input_tokens: 300, output_tokens: 50 },
	};
}

function ok(body: unknown) {
	return { statusCode: 200, body, headers: {} };
}

describe('DecisionModelTypeSafe', () => {
	let node: DecisionModelTypeSafe;
	let ctx: Mocked<ISupplyDataFunctions>;
	let httpRequest: ReturnType<typeof vi.fn>;

	async function supplyModel(parameters: Record<string, unknown> = {}) {
		ctx.getNodeParameter.mockImplementation((name, _itemIndex, fallback) =>
			name in parameters ? parameters[name] : fallback,
		);
		const { response } = await node.supplyData.call(ctx, 0);
		return response as DecisionModel;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		node = new DecisionModelTypeSafe();
		httpRequest = vi.fn();
		ctx = mock<ISupplyDataFunctions>();
		ctx.getNode.mockReturnValue(
			mock<INode>({ name: 'TypeSafe Jev Decision Model', type: 'decisionModelTypeSafe' }),
		);
		ctx.getCredentials.mockResolvedValue({ apiKey: API_KEY, url: 'https://api.typesafe.ai' });
		ctx.addInputData.mockReturnValue({ index: 0 });
		ctx.helpers = {
			httpRequestWithAuthentication: httpRequest,
		} as unknown as ISupplyDataFunctions['helpers'];
	});

	describe('description', () => {
		it('should output a decision model and require TypeSafe credentials', () => {
			expect(node.description.outputs).toEqual(['ai_decisionModel']);
			expect(node.description.inputs).toEqual([]);
			expect(node.description.credentials).toEqual([{ name: 'typeSafeApi', required: true }]);
		});

		it('should be listed under Decision Models', () => {
			expect(node.description.codex?.subcategories?.AI).toEqual(['Decision Models']);
		});
	});

	describe('request', () => {
		it('should post to the System One endpoint with authentication', async () => {
			httpRequest.mockResolvedValue(ok(systemOneBody()));
			const model = await supplyModel();

			await model.decide(request);

			// The helper attaches the credential, so the node never builds an auth header itself
			expect(httpRequest).toHaveBeenCalledTimes(1);
			const [credentialName, options] = httpRequest.mock.calls[0];
			expect(credentialName).toBe('typeSafeApi');
			expect(options).toMatchObject({
				method: 'POST',
				baseURL: 'https://api.typesafe.ai',
				url: '/v1/systemone',
				json: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			});
		});

		it('should default to the jev-latest model', async () => {
			httpRequest.mockResolvedValue(ok(systemOneBody()));
			const model = await supplyModel();

			await model.decide(request);

			expect(model.modelId).toBe('jev-latest');
			expect(httpRequest.mock.calls[0][1].body).toMatchObject({ model: 'jev-latest' });
		});

		it('should use an explicit model override', async () => {
			httpRequest.mockResolvedValue(ok(systemOneBody()));
			const model = await supplyModel({ model: 'jev-2026-01' });

			await model.decide(request);

			expect(model.modelId).toBe('jev-2026-01');
			expect(httpRequest.mock.calls[0][1].body).toMatchObject({ model: 'jev-2026-01' });
		});

		it('should send questions in the TypeSafe format', async () => {
			httpRequest.mockResolvedValue(ok(systemOneBody()));
			const model = await supplyModel();

			await model.decide(request);

			expect(httpRequest.mock.calls[0][1].body).toEqual({
				state: request.state,
				model: 'jev-latest',
				questions: {
					department: {
						type: 'choice',
						instructions: 'Which team should handle this request?',
						criteria: { billing: 'Payments, invoices, and refunds', technical: null },
					},
					urgency: {
						type: 'noul',
						instructions: 'This request requires urgent attention',
					},
					severity: {
						type: 'score',
						instructions: 'How severe is the customer impact?',
						criteria: ['Low impact', 'Critical business impact'],
					},
				},
			});
		});

		it('should apply the configured timeout', async () => {
			httpRequest.mockResolvedValue(ok(systemOneBody()));
			const model = await supplyModel({ options: { timeout: 5000 } });

			await model.decide(request);

			expect(httpRequest.mock.calls[0][1].timeout).toBe(5000);
		});
	});

	describe('response', () => {
		it('should normalize answers, probabilities, confidence, and usage', async () => {
			httpRequest.mockResolvedValue(ok(systemOneBody()));
			const model = await supplyModel();

			const response = await model.decide(request);

			expect(response).toEqual({
				decisions: {
					department: {
						type: 'choice',
						value: 'billing',
						confidence: 0.92,
						probabilities: { billing: 0.96, technical: 0.04 },
					},
					urgency: { type: 'booleanProbability', value: true, probability: 0.88 },
					severity: {
						type: 'score',
						value: 1.7,
						confidence: 0.79,
						probabilities: { '0': 0.3, '1': 0.7 },
						legend: { '0': 'Low impact', '1': 'Critical business impact' },
					},
				},
				model: 'jev-latest',
				usage: { inputTokens: 300, outputTokens: 50 },
				providerMetadata: { answers: systemOneBody().answers },
			});
		});

		it('should log the call on the sub-node', async () => {
			httpRequest.mockResolvedValue(ok(systemOneBody()));
			const model = await supplyModel();

			await model.decide(request);

			expect(ctx.addInputData).toHaveBeenCalledWith('ai_decisionModel', [
				[{ json: { model: 'jev-latest', ...request } }],
			]);
			expect(ctx.addOutputData).toHaveBeenCalledWith('ai_decisionModel', 0, [
				[{ json: expect.objectContaining({ model: 'jev-latest' }) }],
			]);
		});
	});

	describe('errors', () => {
		it.each([
			[401, 'Authorization failed - please check your credentials'],
			[422, 'TypeSafe could not process the request'],
			[429, 'The service is receiving too many requests from you'],
			[500, 'The service was not able to process your request'],
			[529, 'TypeSafe is temporarily overloaded'],
		])('should report a %s as %s', async (statusCode, message) => {
			httpRequest.mockResolvedValue({
				statusCode,
				body: { detail: 'upstream detail' },
				headers: {},
			});
			const model = await supplyModel({ options: { maxRetries: 0 } });

			await expect(model.decide(request)).rejects.toThrow(message);
		});

		it('should report a validation detail as the error description', async () => {
			httpRequest.mockResolvedValue({
				statusCode: 422,
				body: { message: 'questions.severity.criteria: at least two levels are required' },
				headers: {},
			});
			const model = await supplyModel({ options: { maxRetries: 0 } });

			await expect(model.decide(request)).rejects.toMatchObject({
				description: 'questions.severity.criteria: at least two levels are required',
			});
		});

		it('should report a timeout', async () => {
			httpRequest.mockRejectedValue(new Error('timeout of 60000ms exceeded'));
			const model = await supplyModel({ options: { maxRetries: 0 } });

			await expect(model.decide(request)).rejects.toThrow('The request to TypeSafe timed out');
		});

		it('should report a connection failure', async () => {
			httpRequest.mockRejectedValue(new Error('ECONNREFUSED'));
			const model = await supplyModel({ options: { maxRetries: 0 } });

			await expect(model.decide(request)).rejects.toThrow('Could not reach TypeSafe');
		});

		it('should never put the API key in an error', async () => {
			httpRequest.mockResolvedValue({
				statusCode: 401,
				body: { detail: 'invalid api key' },
				headers: { 'www-authenticate': 'Bearer' },
			});
			const model = await supplyModel({ options: { maxRetries: 0 } });

			let thrown: NodeOperationError | undefined;
			try {
				await model.decide(request);
			} catch (error) {
				thrown = error as NodeOperationError;
			}

			// The supplier attributes a provider failure to the sub-node
			expect(thrown).toBeInstanceOf(NodeOperationError);
			expect(thrown?.functionality).toBe('configuration-node');
			expect(thrown?.message).toContain('Authorization failed');

			const serialized = `${JSON.stringify(thrown)}${thrown?.stack ?? ''}`;
			expect(serialized).not.toContain(API_KEY);
			expect(serialized).not.toContain('Bearer');
		});
	});

	describe('retries', () => {
		it('should retry a rate limit and succeed', async () => {
			httpRequest
				.mockResolvedValueOnce({ statusCode: 429, body: {}, headers: { 'retry-after': '1' } })
				.mockResolvedValueOnce(ok(systemOneBody()));
			const model = await supplyModel({ options: { maxRetries: 2 } });

			const response = await model.decide(request);

			expect(httpRequest).toHaveBeenCalledTimes(2);
			expect(response.decisions.department).toMatchObject({ value: 'billing' });
		});

		it('should retry an overload and a connection failure', async () => {
			httpRequest
				.mockResolvedValueOnce({ statusCode: 529, body: {}, headers: {} })
				.mockRejectedValueOnce(new Error('socket hang up'))
				.mockResolvedValueOnce(ok(systemOneBody()));
			const model = await supplyModel({ options: { maxRetries: 2 } });

			await model.decide(request);

			expect(httpRequest).toHaveBeenCalledTimes(3);
		});

		it('should not retry a client error', async () => {
			httpRequest.mockResolvedValue({ statusCode: 422, body: {}, headers: {} });
			const model = await supplyModel({ options: { maxRetries: 2 } });

			await expect(model.decide(request)).rejects.toThrow();
			expect(httpRequest).toHaveBeenCalledTimes(1);
		});

		it('should stop after the configured number of retries', async () => {
			httpRequest.mockResolvedValue({ statusCode: 429, body: {}, headers: {} });
			const model = await supplyModel({ options: { maxRetries: 2 } });

			await expect(model.decide(request)).rejects.toThrow();
			expect(httpRequest).toHaveBeenCalledTimes(3);
		});
	});

	describe('model list', () => {
		it('should load models from the non-billable models endpoint', () => {
			const model = node.description.properties.find((property) => property.name === 'model');

			expect(model?.typeOptions?.loadOptions?.routing?.request).toEqual({
				method: 'GET',
				url: '/v1/models',
			});
			expect(node.description.requestDefaults?.baseURL).toBe('={{ $credentials.url }}');
		});
	});
});
