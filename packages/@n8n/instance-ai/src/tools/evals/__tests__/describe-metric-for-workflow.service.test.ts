import type { WorkflowJSON } from '@n8n/workflow-sdk';

import {
	describeMetricForWorkflow,
	recommendedMetricId,
} from '../describe-metric-for-workflow.service';
import type { MetricId } from '../metric-catalog';

type TestNode = Partial<WorkflowJSON['nodes'][number]>;
type RecommendedMetricId = Exclude<MetricId, 'helpfulness'>;

const baseAgent: TestNode = {
	name: 'Chef Agent',
	type: '@n8n/n8n-nodes-langchain.agent',
	typeVersion: 1,
	parameters: {},
	position: [0, 0],
	id: 'a',
};

const wf = (nodes: TestNode[], connections: WorkflowJSON['connections'] = {}): WorkflowJSON =>
	({
		name: 't',
		nodes,
		connections,
		pinData: {},
		settings: {},
	}) as unknown as WorkflowJSON;

describe('describeMetricForWorkflow', () => {
	describe('correctness', () => {
		it('mentions the agent name in a generic comparison', () => {
			const result = describeMetricForWorkflow(wf([baseAgent]), 'Chef Agent', 'correctness');
			expect(result).toContain('Chef Agent');
			expect(result).toMatch(/ground-truth/i);
		});
	});

	describe('tool_use', () => {
		it('returns the no-tools message when agent has none', () => {
			const result = describeMetricForWorkflow(wf([baseAgent]), 'Chef Agent', 'tool_use');
			expect(result).toMatch(/Add tools/i);
		});

		it('lists the tool names when agent has tools', () => {
			const workflow = wf(
				[
					baseAgent,
					{
						name: 'Calculator',
						type: '@n8n/n8n-nodes-langchain.toolCalculator',
						typeVersion: 1,
						parameters: {},
						position: [0, 0],
						id: 'c',
					},
					{
						name: 'Recipe Search',
						type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
						typeVersion: 1,
						parameters: {},
						position: [0, 0],
						id: 'r',
					},
				],
				{
					Calculator: { ai_tool: [[{ node: 'Chef Agent', type: 'ai_tool', index: 0 }]] },
					'Recipe Search': { ai_tool: [[{ node: 'Chef Agent', type: 'ai_tool', index: 0 }]] },
				},
			);
			const result = describeMetricForWorkflow(workflow, 'Chef Agent', 'tool_use');
			expect(result).toMatch(/Calculator/);
			expect(result).toMatch(/Recipe Search/);
			expect(result).toMatch(/picks correctly/i);
		});
	});

	describe('relevance', () => {
		it('returns the RAG-fallback message when no retriever is present', () => {
			const result = describeMetricForWorkflow(wf([baseAgent]), 'Chef Agent', 'relevance');
			expect(result).toMatch(/RAG/);
		});

		it('lists the retriever name when one is wired to the agent', () => {
			const workflow = wf(
				[
					baseAgent,
					{
						name: 'Pinecone Store',
						type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
						typeVersion: 1,
						parameters: {},
						position: [0, 0],
						id: 'v',
					},
				],
				{
					'Pinecone Store': {
						ai_vectorStore: [[{ node: 'Chef Agent', type: 'ai_vectorStore', index: 0 }]],
					},
				},
			);
			const result = describeMetricForWorkflow(workflow, 'Chef Agent', 'relevance');
			expect(result).toMatch(/Pinecone Store/);
			expect(result).toMatch(/retrieved context/i);
		});
	});

	describe('helpfulness', () => {
		it('returns a generic description', () => {
			const result = describeMetricForWorkflow(wf([baseAgent]), 'Chef Agent', 'helpfulness');
			expect(result).toMatch(/addresses the user/i);
		});
	});

	describe('unknown metric', () => {
		it('returns empty string for unknown ids', () => {
			expect(describeMetricForWorkflow(wf([baseAgent]), 'Chef Agent', 'nope')).toBe('');
		});
	});
});

describe('recommendedMetricId', () => {
	it('returns tool_use when the agent has tools', () => {
		const workflow = wf(
			[
				baseAgent,
				{
					name: 'Calculator',
					type: '@n8n/n8n-nodes-langchain.toolCalculator',
					typeVersion: 1,
					parameters: {},
					position: [0, 0],
					id: 'c',
				},
			],
			{ Calculator: { ai_tool: [[{ node: 'Chef Agent', type: 'ai_tool', index: 0 }]] } },
		);
		expect(recommendedMetricId(workflow, 'Chef Agent')).toBe('tool_use');
	});

	it('returns relevance when the agent has a retriever but no tools', () => {
		const workflowRetrieverOnly = wf(
			[
				baseAgent,
				{
					name: 'Pinecone',
					type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
					typeVersion: 1,
					parameters: {},
					position: [0, 0],
					id: 'v',
				},
			],
			{
				Pinecone: {
					ai_vectorStore: [[{ node: 'Chef Agent', type: 'ai_vectorStore', index: 0 }]],
				},
			},
		);
		expect(recommendedMetricId(workflowRetrieverOnly, 'Chef Agent')).toBe('relevance');
	});

	it('returns correctness for a plain agent with no tools or retrievers', () => {
		expect(recommendedMetricId(wf([baseAgent]), 'Chef Agent')).toBe('correctness');
	});

	it('returns a narrowed metric id type', () => {
		const metricId: RecommendedMetricId = recommendedMetricId(wf([baseAgent]), 'Chef Agent');

		expect(metricId).toBe('correctness');
	});
});
