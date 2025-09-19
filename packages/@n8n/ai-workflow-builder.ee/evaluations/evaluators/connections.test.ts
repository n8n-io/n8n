import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	NodeConnectionType,
	INodeInputConfiguration,
	ExpressionString,
	INodeTypeDescription,
} from 'n8n-workflow';

import { SimpleWorkflow } from '@/types';
import { evaluateConnections, resolveConnections } from './connections';
import { mock } from 'jest-mock-extended';

const DEFAULT_VERSION = 1;

describe('resolveInputConnections', () => {
	it('should return empty array for empty inputs', () => {
		const inputs: NodeConnectionType[] = [];
		const result = resolveConnections(inputs, {}, DEFAULT_VERSION);
		expect(result).toEqual([]);
	});

	it('should return simple node connection types inputs as is', () => {
		const inputs = [
			NodeConnectionTypes.Main,
			NodeConnectionTypes.AiDocument,
			NodeConnectionTypes.AiEmbedding,
		];

		const result = resolveConnections(inputs, {}, DEFAULT_VERSION);
		expect(result).toEqual(inputs);
	});

	it('should return simple node input configurations as is', () => {
		const inputs = [
			{ type: NodeConnectionTypes.Main, displayName: 'Main', maxConnections: 1 },
			{ type: NodeConnectionTypes.AiDocument, displayName: 'Document', maxConnections: 1 },
		] satisfies INodeInputConfiguration[];

		const result = resolveConnections(inputs, {}, DEFAULT_VERSION);
		expect(result).toEqual(inputs);
	});

	it('should evaluate simple expression', () => {
		const inputs =
			`={{ ["${NodeConnectionTypes.Main}", "${NodeConnectionTypes.AiDocument}"] }}` as const;

		const result = resolveConnections(inputs, {}, DEFAULT_VERSION);
		expect(result).toEqual([NodeConnectionTypes.Main, NodeConnectionTypes.AiDocument]);
	});

	it('should evaluate expression with parameters', () => {
		const inputs = `={{ ["${NodeConnectionTypes.Main}", $parameter["extraInput"]] }}` as const;
		const parameters = { extraInput: NodeConnectionTypes.AiDocument };

		const result = resolveConnections(inputs, parameters, DEFAULT_VERSION);
		expect(result).toEqual([NodeConnectionTypes.Main, NodeConnectionTypes.AiDocument]);
	});

	it('should evaluate complex expression with parameters', () => {
		const inputs = `={{
			((parameters) => {
				const mode = parameters?.mode;
				const useReranker = parameters?.useReranker;
				const inputs = [{ displayName: "Embedding", type: "${NodeConnectionTypes.AiEmbedding}", required: true, maxConnections: 1}]

				if (['load', 'retrieve', 'retrieve-as-tool'].includes(mode) && useReranker) {
					inputs.push({ displayName: "Reranker", type: "${NodeConnectionTypes.AiReranker}", required: true, maxConnections: 1})
				}

				if (mode === 'retrieve-as-tool') {
					return inputs;
				}

				if (['insert', 'load', 'update'].includes(mode)) {
					inputs.push({ displayName: "", type: "${NodeConnectionTypes.Main}"})
				}

				if (['insert'].includes(mode)) {
					inputs.push({ displayName: "Document", type: "${NodeConnectionTypes.AiDocument}", required: true, maxConnections: 1})
				}
				return inputs
			})($parameter)
		}}` satisfies ExpressionString;

		const parameters = { mode: 'load', useReranker: true };
		const result = resolveConnections(inputs, parameters, DEFAULT_VERSION);
		expect(result).toEqual([
			{
				displayName: 'Embedding',
				type: NodeConnectionTypes.AiEmbedding,
				required: true,
				maxConnections: 1,
			},
			{
				displayName: 'Reranker',
				type: NodeConnectionTypes.AiReranker,
				required: true,
				maxConnections: 1,
			},
			{ displayName: '', type: NodeConnectionTypes.Main },
		]);

		const parameters2 = { mode: 'retrieve-as-tool', useReranker: false };
		const result2 = resolveConnections(inputs, parameters2, DEFAULT_VERSION);
		expect(result2).toEqual([
			{
				displayName: 'Embedding',
				type: NodeConnectionTypes.AiEmbedding,
				required: true,
				maxConnections: 1,
			},
		]);
	});
});

describe('evaluateConnections', () => {
	const mockNodeTypes = [
		{
			name: 'n8n-nodes-test.code',
			displayName: 'Code',
			inputs: ['main'],
			outputs: ['main'],
		},
		{
			name: 'n8n-nodes-test.httpRequest',
			displayName: 'HTTP Request',
			inputs: ['main'],
			outputs: ['main'],
		},
		{
			name: 'n8n-nodes-test.openAi',
			displayName: 'OpenAI',
			inputs:
				'={{(() => { return [{ type: "main" }, { type: "ai_tool", displayName: "Tools" }]; })()}}',
			outputs: ['main'],
		},
		{
			name: 'n8n-nodes-test.merge',
			displayName: 'Merge',
			inputs:
				// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
				'={{ Array.from({ length: $parameter.numberInputs || 2 }, (_, i) => ({ type: "main", displayName: `Input ${i + 1}` })) }}',
			outputs: ['main'],
		},
		{
			name: 'n8n-nodes-test.llmChain',
			displayName: 'LLM Chain',
			inputs: [
				{ type: NodeConnectionTypes.Main },
				{ type: NodeConnectionTypes.AiLanguageModel, required: true, maxConnections: 1 },
				{ type: NodeConnectionTypes.AiMemory, required: false, maxConnections: 1 },
			],
			outputs: [NodeConnectionTypes.Main],
		},
		{
			name: 'n8n-nodes-test.chatOpenAi',
			displayName: 'Chat OpenAI',
			inputs: [],
			outputs: [NodeConnectionTypes.AiLanguageModel],
		},
		{
			name: 'n8n-nodes-test.vectorStore',
			displayName: 'Vector Store',
			inputs:
				'={{ (() => { const mode = $parameter.mode; if (mode === "retrieve") { return [{ type: "ai_embedding", required: true }]; } return [{ type: "main" }, { type: "ai_document" }]; })() }}',
			outputs:
				'={{ (() => { const mode = $parameter.mode; if (mode === "retrieve-as-tool") { return [{ type: "ai_tool" }]; } return [{ type: "ai_vectorStore" }]; })() }}',
		},
	] as INodeTypeDescription[];

	describe('basic workflow validation', () => {
		it('should return no issues for a valid simple workflow', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Code Node',
						type: 'n8n-nodes-test.code',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-test.httpRequest',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {
					'Code Node': {
						main: [
							[
								{
									node: 'HTTP Request',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			});

			const { issues } = evaluateConnections(workflow, mockNodeTypes);
			expect(issues).toEqual([]);
		});

		it('should detect missing node type', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Unknown Node',
						type: 'n8n-nodes-test.unknown',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const { issues } = evaluateConnections(workflow, mockNodeTypes);
			expect(issues).toContain('Node type n8n-nodes-test.unknown not found for node Unknown Node');
		});

		it('should detect missing required inputs', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'LLM Chain',
						type: 'n8n-nodes-test.llmChain',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const { issues } = evaluateConnections(workflow, mockNodeTypes);
			expect(issues).toContain(
				'Node LLM Chain (n8n-nodes-test.llmChain) is missing required input of type ai_languageModel',
			);
		});

		it('should detect unsupported connection types', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Chat OpenAI',
						type: 'n8n-nodes-test.chatOpenAi',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Code Node',
						type: 'n8n-nodes-test.code',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {
					'Chat OpenAI': {
						ai_languageModel: [
							[
								{
									node: 'Code Node',
									type: 'ai_languageModel',
									index: 0,
								},
							],
						],
					},
				},
			});

			const { issues } = evaluateConnections(workflow, mockNodeTypes);
			expect(issues).toContain(
				'Node Code Node (n8n-nodes-test.code) received unsupported connection type ai_languageModel',
			);
		});
	});

	describe('dynamic input/output resolution', () => {
		it('should resolve dynamic inputs based on parameters', () => {
			// Use OpenAI node which has dynamic inputs that resolve to multiple input types
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'OpenAI Node',
						type: 'n8n-nodes-test.openAi',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const { issues } = evaluateConnections(workflow, mockNodeTypes);
			// Should not have any issues - the node's dynamic inputs should be resolved
			expect(issues).toEqual([]);
		});

		it('should resolve vector store inputs based on mode', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Vector Store',
						type: 'n8n-nodes-test.vectorStore',
						parameters: { mode: 'retrieve' },
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const { issues } = evaluateConnections(workflow, mockNodeTypes);
			// Should report missing required ai_embedding input
			expect(issues).toContain(
				'Node Vector Store (n8n-nodes-test.vectorStore) is missing required input of type ai_embedding',
			);
		});

		it('should resolve vector store outputs based on mode', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Vector Store',
						type: 'n8n-nodes-test.vectorStore',
						parameters: { mode: 'retrieve-as-tool' },
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'OpenAI',
						type: 'n8n-nodes-test.openAi',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {
					'Vector Store': {
						ai_tool: [
							[
								{
									node: 'OpenAI',
									type: 'ai_tool',
									index: 0,
								},
							],
						],
					},
				},
			});

			const { issues } = evaluateConnections(workflow, mockNodeTypes);
			// Should be valid - Vector Store outputs ai_tool when in retrieve-as-tool mode
			expect(issues).toEqual([]);
		});
	});

	describe('complex workflow scenarios', () => {
		it('should validate workflow with AI nodes', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'AI Workflow',
				nodes: [
					{
						id: '1',
						name: 'Chat Model',
						type: 'n8n-nodes-test.chatOpenAi',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'LLM Chain',
						type: 'n8n-nodes-test.llmChain',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
					{
						id: '3',
						name: 'Code',
						type: 'n8n-nodes-test.code',
						parameters: {},
						typeVersion: 1,
						position: [400, 0],
					},
				],
				connections: {
					'Chat Model': {
						ai_languageModel: [
							[
								{
									node: 'LLM Chain',
									type: 'ai_languageModel',
									index: 0,
								},
							],
						],
					},
					'LLM Chain': {
						main: [
							[
								{
									node: 'Code',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			});

			const { issues } = evaluateConnections(workflow, mockNodeTypes);
			expect(issues).toEqual([]);
		});

		it('should handle workflows with no connections', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Code Node',
						type: 'n8n-nodes-test.code',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: undefined,
			});

			const { issues } = evaluateConnections(workflow, mockNodeTypes);
			expect(issues).toEqual([]);
		});

		it('should handle multiple connections to the same node', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Code1',
						type: 'n8n-nodes-test.code',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Code2',
						type: 'n8n-nodes-test.code',
						parameters: {},
						typeVersion: 1,
						position: [0, 200],
					},
					{
						id: '3',
						name: 'Merge',
						type: 'n8n-nodes-test.merge',
						parameters: { numberInputs: 2 },
						typeVersion: 1,
						position: [200, 100],
					},
				],
				connections: {
					Code1: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Code2: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 1,
								},
							],
						],
					},
				},
			});

			const { issues } = evaluateConnections(workflow, mockNodeTypes);
			expect(issues).toEqual([]);
		});
	});

	describe('merge node validation', () => {
		it('should report issue when merge node has only one input connection', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Code',
						type: 'n8n-nodes-test.code',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Merge Data',
						type: 'n8n-nodes-test.merge',
						parameters: { numberInputs: 2 },
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {
					Code: {
						main: [
							[
								{
									node: 'Merge Data',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			});

			const { issues } = evaluateConnections(workflow, mockNodeTypes);
			expect(issues).toContain(
				'Merge node Merge Data has only 1 input connection(s). Merge nodes require at least 2 inputs to function properly.',
			);
		});

		it('should report issue when merge node has no input connections', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Merge Without Inputs',
						type: 'n8n-nodes-test.merge',
						parameters: { numberInputs: 2 },
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {},
			});

			const { issues } = evaluateConnections(workflow, mockNodeTypes);
			expect(issues).toContain(
				'Merge node Merge Without Inputs has only 0 input connection(s). Merge nodes require at least 2 inputs to function properly.',
			);
		});

		it('should not report issue when merge node has 2 or more input connections', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Code1',
						type: 'n8n-nodes-test.code',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Code2',
						type: 'n8n-nodes-test.code',
						parameters: {},
						typeVersion: 1,
						position: [0, 200],
					},
					{
						id: '3',
						name: 'Merge',
						type: 'n8n-nodes-test.merge',
						parameters: { numberInputs: 2 },
						typeVersion: 1,
						position: [200, 100],
					},
				],
				connections: {
					Code1: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Code2: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 1,
								},
							],
						],
					},
				},
			});

			const { issues } = evaluateConnections(workflow, mockNodeTypes);
			// Should not contain merge node issues
			expect(issues).not.toContain(expect.stringMatching(/Merge node.*has only.*input connection/));
		});

		it('should detect join nodes as merge nodes', () => {
			const joinNodeType = mock<INodeTypeDescription>({
				name: 'n8n-nodes-test.join',
				displayName: 'Join',
				inputs: ['main', 'main'],
				outputs: ['main'],
			});

			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Code',
						type: 'n8n-nodes-test.code',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Join Data',
						type: 'n8n-nodes-test.join',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {
					Code: {
						main: [
							[
								{
									node: 'Join Data',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			});

			const { issues } = evaluateConnections(workflow, [...mockNodeTypes, joinNodeType]);
			expect(issues).toContain(
				'Merge node Join Data has only 1 input connection(s). Merge nodes require at least 2 inputs to function properly.',
			);
		});
	});

	describe('error handling', () => {
		it('should catch and report expression evaluation errors', () => {
			const nodeTypeWithBadExpression = mock<INodeTypeDescription>({
				name: 'n8n-nodes-test.badNode',
				displayName: 'Bad Node',
				inputs: '={{ invalidJavaScript( }}',
				outputs: ['main'],
			});

			const workflow = mock<SimpleWorkflow>({
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Bad Node',
						type: 'n8n-nodes-test.badNode',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const { issues } = evaluateConnections(workflow, [
				...mockNodeTypes,
				nodeTypeWithBadExpression,
			]);
			expect(issues.some((issue) => issue.includes('Failed to resolve inputs'))).toBe(true);
		});
	});
});
