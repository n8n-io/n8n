import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';

jest.mock('@n8n/instance-ai', () => ({
	createEvalAgent: jest.fn(() => ({
		structuredOutput: jest.fn().mockReturnThis(),
		tool: jest.fn().mockReturnThis(),
		generate: jest.fn().mockResolvedValue({
			structuredOutput: {
				pass: true,
				reasoning: 'All good',
				failureCategory: null,
				rootCause: null,
			},
		}),
	})),
	Tool: jest.fn(() => ({
		description: jest.fn().mockReturnThis(),
		input: jest.fn().mockReturnThis(),
		handler: jest.fn().mockReturnThis(),
		build: jest.fn().mockReturnValue({}),
	})),
}));

import { EvalJudgeService } from '../judge.service';

const makeResult = (
	overrides: Partial<InstanceAiEvalExecutionResult> = {},
): InstanceAiEvalExecutionResult => ({
	executionId: 'test-exec',
	success: true,
	nodeResults: {
		Webhook: {
			output: [{ json: { name: 'test' } }],
			interceptedRequests: [],
			executionMode: 'pinned',
		},
		'HTTP Request': {
			output: [{ json: { id: 1 } }],
			interceptedRequests: [
				{
					url: 'https://api.example.com/data',
					method: 'GET',
					nodeType: 'n8n-nodes-base.httpRequest',
				},
			],
			executionMode: 'mocked',
		},
		Code: {
			output: [{ json: { processed: true } }],
			interceptedRequests: [],
			executionMode: 'real',
		},
	},
	errors: [],
	hints: {
		globalContext: 'test context',
		triggerContent: { body: { name: 'test' } },
		nodeHints: {},
		warnings: [],
		bypassPinData: {},
	},
	...overrides,
});

const makeWorkflow = () => ({
	id: 'wf-1',
	name: 'Test Workflow',
	active: false,
	nodes: [
		{
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			parameters: { path: '/test' },
			typeVersion: 1,
			position: [0, 0] as [number, number],
		},
		{
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			parameters: { url: 'https://api.example.com' },
			typeVersion: 4,
			position: [200, 0] as [number, number],
		},
		{
			name: 'Code',
			type: 'n8n-nodes-base.code',
			parameters: { jsCode: 'return items;' },
			typeVersion: 1,
			position: [400, 0] as [number, number],
		},
	],
	connections: {
		Webhook: { main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]] },
		'HTTP Request': { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
	},
	settings: {},
});

describe('EvalJudgeService', () => {
	const logger = mock<Logger>();
	const service = new EvalJudgeService(logger);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return a verdict from the LLM', async () => {
		const result = await service.judge(
			makeResult(),
			makeWorkflow() as never,
			'The workflow should fetch data and process it',
		);

		expect(result).toEqual({
			pass: true,
			reasoning: 'All good',
			failureCategory: undefined,
			rootCause: undefined,
		});
	});

	it('should include scenario hints in the summary when provided', async () => {
		const { createEvalAgent } = jest.requireMock('@n8n/instance-ai');

		await service.judge(
			makeResult(),
			makeWorkflow() as never,
			'test criteria',
			'API returns 3 items',
		);

		const agentInstance = createEvalAgent.mock.results[0].value;
		const generateCall = agentInstance.generate.mock.calls[0][0] as string;
		expect(generateCall).toContain('API returns 3 items');
	});

	it('should handle null structuredOutput', async () => {
		const { createEvalAgent } = jest.requireMock('@n8n/instance-ai');
		createEvalAgent.mockReturnValueOnce({
			structuredOutput: jest.fn().mockReturnThis(),
			tool: jest.fn().mockReturnThis(),
			generate: jest.fn().mockResolvedValue({ structuredOutput: null }),
		});

		const result = await service.judge(makeResult(), makeWorkflow() as never, 'test criteria');

		expect(result.pass).toBe(false);
		expect(result.failureCategory).toBe('verification_gap');
	});

	it('should handle LLM errors gracefully', async () => {
		const { createEvalAgent } = jest.requireMock('@n8n/instance-ai');
		createEvalAgent.mockReturnValueOnce({
			structuredOutput: jest.fn().mockReturnThis(),
			tool: jest.fn().mockReturnThis(),
			generate: jest.fn().mockRejectedValue(new Error('API rate limit')),
		});

		const result = await service.judge(makeResult(), makeWorkflow() as never, 'test criteria');

		expect(result.pass).toBe(false);
		expect(result.reasoning).toContain('API rate limit');
		expect(result.failureCategory).toBe('verification_gap');
	});

	it('should detect pre-analysis flags for empty trigger content', async () => {
		const { createEvalAgent } = jest.requireMock('@n8n/instance-ai');

		await service.judge(
			makeResult({
				hints: {
					globalContext: '',
					triggerContent: {},
					nodeHints: {},
					warnings: [],
					bypassPinData: {},
				},
			}),
			makeWorkflow() as never,
			'test criteria',
		);

		const agentInstance = createEvalAgent.mock.results[0].value;
		const generateCall = agentInstance.generate.mock.calls[0][0] as string;
		expect(generateCall).toContain('Trigger content empty');
	});

	it('should detect config issues in pre-analysis flags', async () => {
		const { createEvalAgent } = jest.requireMock('@n8n/instance-ai');

		await service.judge(
			makeResult({
				nodeResults: {
					'Bad Node': {
						output: null,
						interceptedRequests: [],
						executionMode: 'mocked',
						configIssues: { param1: ['Missing required parameter'] },
					},
				},
			}),
			makeWorkflow() as never,
			'test criteria',
		);

		const agentInstance = createEvalAgent.mock.results[0].value;
		const generateCall = agentInstance.generate.mock.calls[0][0] as string;
		expect(generateCall).toContain('BUILDER');
		expect(generateCall).toContain('Bad Node');
	});
});
