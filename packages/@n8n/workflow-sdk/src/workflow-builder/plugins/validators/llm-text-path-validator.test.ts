import { llmTextPathValidator } from './llm-text-path-validator';
import type { ConnectionTarget, GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createNode(
	type: string,
	name: string,
	config: {
		parameters?: Record<string, unknown>;
		output?: Array<Record<string, unknown>>;
	} = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '1',
		config: {
			parameters: config.parameters ?? {},
			output: config.output,
		},
	} as NodeInstance<string, string, unknown>;
}

function conn(node: string, index = 0): ConnectionTarget {
	return { node, type: 'main', index };
}

function createGraphNode(
	node: NodeInstance<string, string, unknown>,
	connections: Map<string, Map<number, ConnectionTarget[]>> = new Map(),
): GraphNode {
	return { instance: node, connections };
}

function createContext(nodes: Map<string, GraphNode>): PluginContext {
	return {
		nodes,
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

function llmToDownstream(
	llmType: string,
	llmParams: Record<string, unknown>,
	downstream: NodeInstance<string, string, unknown>,
) {
	const llm = createNode(llmType, 'LLM', { parameters: llmParams });
	const llmConns = new Map<string, Map<number, ConnectionTarget[]>>();
	llmConns.set('main', new Map([[0, [conn(downstream.name)]]]));
	const nodes = new Map<string, GraphNode>();
	nodes.set('LLM', createGraphNode(llm, llmConns));
	nodes.set(downstream.name, createGraphNode(downstream));
	return { llm, downstream, ctx: createContext(nodes) };
}

describe('llmTextPathValidator', () => {
	it('has correct id', () => {
		expect(llmTextPathValidator.id).toBe('core:llm-text-path');
	});

	describe('validateNode (output fixture)', () => {
		it('flags flat { text } fixture on Gemini with simplify on', () => {
			const gemini = createNode('@n8n/n8n-nodes-langchain.googleGemini', 'Gemini', {
				parameters: { resource: 'text', operation: 'message', simplify: true },
				output: [{ text: 'hello' }],
			});
			const issues = llmTextPathValidator.validateNode(
				gemini,
				createGraphNode(gemini),
				createContext(new Map([['Gemini', createGraphNode(gemini)]])),
			);
			expect(issues).toEqual([
				expect.objectContaining({
					code: 'WRONG_LLM_OUTPUT_FIXTURE',
					nodeName: 'Gemini',
				}),
			]);
		});

		it('does not flag provider-shaped fixtures', () => {
			const gemini = createNode('@n8n/n8n-nodes-langchain.googleGemini', 'Gemini', {
				parameters: { resource: 'text', operation: 'message' },
				output: [{ content: { parts: [{ text: 'hello' }] } }],
			});
			expect(
				llmTextPathValidator.validateNode(
					gemini,
					createGraphNode(gemini),
					createContext(new Map([['Gemini', createGraphNode(gemini)]])),
				),
			).toEqual([]);
		});

		it('skips when jsonOutput is true', () => {
			const gemini = createNode('@n8n/n8n-nodes-langchain.googleGemini', 'Gemini', {
				parameters: { resource: 'text', operation: 'message', jsonOutput: true },
				output: [{ text: 'hello' }],
			});
			expect(
				llmTextPathValidator.validateNode(
					gemini,
					createGraphNode(gemini),
					createContext(new Map([['Gemini', createGraphNode(gemini)]])),
				),
			).toEqual([]);
		});
	});

	describe('validateWorkflow (downstream paths)', () => {
		it('flags Code reading $json.text from Gemini without content path', () => {
			const code = createNode('n8n-nodes-base.code', 'Parse', {
				parameters: {
					jsCode: "const raw = $json.text || '';\nreturn { json: { raw } };",
				},
			});
			const { ctx } = llmToDownstream(
				'@n8n/n8n-nodes-langchain.googleGemini',
				{ resource: 'text', operation: 'message' },
				code,
			);

			const issues = llmTextPathValidator.validateWorkflow!(ctx);
			expect(issues).toEqual([
				expect.objectContaining({
					code: 'WRONG_LLM_TEXT_PATH',
					nodeName: 'Parse',
					parameterPath: 'jsCode',
				}),
			]);
		});

		it('does not flag Code that uses content.parts', () => {
			const code = createNode('n8n-nodes-base.code', 'Parse', {
				parameters: {
					jsCode:
						"const raw = $json.content ? $json.content.parts[0].text : ($json.text || '');\nreturn { json: { raw } };",
				},
			});
			const { ctx } = llmToDownstream(
				'@n8n/n8n-nodes-langchain.googleGemini',
				{ resource: 'text', operation: 'message' },
				code,
			);

			expect(llmTextPathValidator.validateWorkflow!(ctx)).toEqual([]);
		});

		it('flags expression reading $json.text from Anthropic', () => {
			const set = createNode('n8n-nodes-base.set', 'Save', {
				parameters: {
					assignments: {
						assignments: [{ id: '1', name: 'answer', value: '={{ $json.text }}', type: 'string' }],
					},
				},
			});
			const { ctx } = llmToDownstream(
				'@n8n/n8n-nodes-langchain.anthropic',
				{ resource: 'text', operation: 'message' },
				set,
			);

			const issues = llmTextPathValidator.validateWorkflow!(ctx);
			expect(issues.map((i) => i.code)).toEqual(['WRONG_LLM_TEXT_PATH']);
		});
	});

	describe('guessed output paths', () => {
		const openAiParams = (extra: Record<string, unknown> = {}) => ({
			resource: 'text',
			operation: 'response',
			...extra,
		});

		it('flags a Code node picking between output fields of an OpenAI parent', () => {
			const code = createNode('n8n-nodes-base.code', 'Format', {
				parameters: {
					jsCode:
						'const aiOutput = $input.first().json;\n' +
						'const content = aiOutput.content || aiOutput.text || aiOutput.output;\n' +
						'return [{ json: { content } }];',
				},
			});
			const { ctx } = llmToDownstream('@n8n/n8n-nodes-langchain.openAi', openAiParams(), code);

			const issues = llmTextPathValidator.validateWorkflow!(ctx);
			expect(issues.map((i) => i.code)).toContain('GUESSED_LLM_OUTPUT_PATH');
			expect(issues[0]).toMatchObject({ nodeName: 'Format', parameterPath: 'jsCode' });
		});

		it('does not flag a fallback between different sources', () => {
			const code = createNode('n8n-nodes-base.code', 'Format', {
				parameters: {
					jsCode:
						'const text = $json.output[0].content[0].text || $json.fallbackText;\n' +
						'return [{ json: { text } }];',
				},
			});
			const { ctx } = llmToDownstream('@n8n/n8n-nodes-langchain.openAi', openAiParams(), code);

			expect(llmTextPathValidator.validateWorkflow!(ctx)).toEqual([]);
		});

		it('flags JSON.parse of output the node already parsed', () => {
			const code = createNode('n8n-nodes-base.code', 'Format', {
				parameters: {
					jsCode:
						'const text = $json.output[0].content[0].text;\n' +
						'return [{ json: JSON.parse(text) }];',
				},
			});
			const { ctx } = llmToDownstream(
				'@n8n/n8n-nodes-langchain.openAi',
				openAiParams({ options: { textFormat: { textOptions: { type: 'json_schema' } } } }),
				code,
			);

			const issues = llmTextPathValidator.validateWorkflow!(ctx);
			expect(issues.map((i) => i.code)).toEqual(['REDUNDANT_LLM_OUTPUT_PARSE']);
		});

		it('allows JSON.parse when the node returns plain text', () => {
			const code = createNode('n8n-nodes-base.code', 'Format', {
				parameters: {
					jsCode:
						'const text = $json.output[0].content[0].text;\n' +
						'return [{ json: JSON.parse(text) }];',
				},
			});
			const { ctx } = llmToDownstream('@n8n/n8n-nodes-langchain.openAi', openAiParams(), code);

			expect(llmTextPathValidator.validateWorkflow!(ctx)).toEqual([]);
		});

		it('points at the raw-payload path when Simplify Output is off', () => {
			const code = createNode('n8n-nodes-base.code', 'Format', {
				parameters: { jsCode: 'return [{ json: { text: $json.text } }];' },
			});
			const { ctx } = llmToDownstream(
				'@n8n/n8n-nodes-langchain.openAi',
				openAiParams({ simplify: false }),
				code,
			);

			const issues = llmTextPathValidator.validateWorkflow!(ctx);
			expect(issues).toHaveLength(1);
			expect(issues[0].message).toContain('Simplify Output is off');
		});
	});
});
