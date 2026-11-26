import { generateWorkflowCode } from './index';
import { parseWorkflowCode, parseWorkflowCodeToBuilder } from './parse-workflow-code';
import type { WorkflowJSON } from '../types/base';

/**
 * Codegen is the artifact the Instance AI agent edits, so a saved node id has to be
 * expressible in it — otherwise every rebuild re-identifies the whole graph and the
 * logs panel and version diff treat every node as deleted (INS-970, INS-1120, INS-1179).
 */
describe('node id emission', () => {
	const simpleWorkflow: WorkflowJSON = {
		id: 'wf-1',
		name: 'Node Id Emission',
		nodes: [
			{
				id: 'saved-trigger',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'saved-set',
				name: 'Process',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [220, 0],
				parameters: { mode: 'manual' },
			},
		],
		connections: {
			Start: { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
		},
	};

	describe('opt-in', () => {
		it('should not emit node ids by default', () => {
			const code = generateWorkflowCode(simpleWorkflow);

			expect(code).not.toContain('saved-trigger');
			expect(code).not.toContain('saved-set');
		});

		it('should not emit node ids when includeNodeIds is false', () => {
			const code = generateWorkflowCode({ workflow: simpleWorkflow, includeNodeIds: false });

			expect(code).not.toContain('saved-set');
		});
	});

	describe('when includeNodeIds is enabled', () => {
		it('should emit the id as the first config entry, before the name', () => {
			const code = generateWorkflowCode({ workflow: simpleWorkflow, includeNodeIds: true });

			expect(code).toMatch(/config:\s*\{\s*id: 'saved-set',\s*name: 'Process'/);
		});

		it('should emit an id for every node that has one', () => {
			const code = generateWorkflowCode({ workflow: simpleWorkflow, includeNodeIds: true });

			expect(code).toContain("id: 'saved-trigger'");
			expect(code).toContain("id: 'saved-set'");
		});

		it('should emit the id for a sticky note', () => {
			const code = generateWorkflowCode({
				workflow: {
					...simpleWorkflow,
					nodes: [
						...simpleWorkflow.nodes,
						{
							id: 'saved-sticky',
							name: 'Sticky Note',
							type: 'n8n-nodes-base.stickyNote',
							typeVersion: 1,
							position: [-40, -80],
							parameters: { content: '## Notes', height: 200, width: 400 },
						},
					],
				},
				includeNodeIds: true,
			});

			expect(code).toContain("id: 'saved-sticky'");
		});

		it('should emit the id for a merge node', () => {
			const code = generateWorkflowCode({
				workflow: {
					...simpleWorkflow,
					nodes: [
						...simpleWorkflow.nodes,
						{
							id: 'saved-merge',
							name: 'Merge',
							type: 'n8n-nodes-base.merge',
							typeVersion: 3,
							position: [440, 0],
							parameters: {},
						},
					],
					connections: {
						Start: { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
						Process: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
					},
				},
				includeNodeIds: true,
			});

			expect(code).toContain("id: 'saved-merge'");
		});

		it('should emit the id for a subnode', () => {
			const code = generateWorkflowCode({
				workflow: {
					id: 'wf-ai',
					name: 'Agent',
					nodes: [
						{
							id: 'saved-agent',
							name: 'AI Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 2,
							position: [0, 0],
							parameters: {},
						},
						{
							id: 'saved-model',
							name: 'OpenAI Chat Model',
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							typeVersion: 1.2,
							position: [0, 200],
							parameters: {},
						},
					],
					connections: {
						'OpenAI Chat Model': {
							ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
						},
					},
				},
				includeNodeIds: true,
			});

			expect(code).toContain("id: 'saved-agent'");
			expect(code).toContain("id: 'saved-model'");
		});

		it('should skip nodes with a missing or empty id', () => {
			const code = generateWorkflowCode({
				workflow: {
					...simpleWorkflow,
					nodes: [{ ...simpleWorkflow.nodes[0], id: '' }, { ...simpleWorkflow.nodes[1] }],
				},
				includeNodeIds: true,
			});

			expect(code).not.toContain("id: ''");
			expect(code).toContain("id: 'saved-set'");
		});

		// A handful of real saved workflows carry duplicate node *names* too, so the
		// emittable set has to be keyed on node identity rather than on name or id.
		it('should emit a duplicated id only once when the names also collide', () => {
			const code = generateWorkflowCode({
				workflow: {
					...simpleWorkflow,
					nodes: [
						{ ...simpleWorkflow.nodes[1], id: 'dup', name: 'Same' },
						{ ...simpleWorkflow.nodes[1], id: 'dup', name: 'Same' },
					],
					connections: {},
				},
				includeNodeIds: true,
			});

			expect(code.match(/id: 'dup'/g)).toHaveLength(1);
		});

		it('should emit both ids when two nodes share a name but not an id', () => {
			const code = generateWorkflowCode({
				workflow: {
					...simpleWorkflow,
					nodes: [
						{ ...simpleWorkflow.nodes[1], id: 'first', name: 'Same' },
						{ ...simpleWorkflow.nodes[1], id: 'second', name: 'Same' },
					],
					connections: {},
				},
				includeNodeIds: true,
			});

			expect(code).toContain("id: 'first'");
			expect(code).toContain("id: 'second'");
		});

		// ~1% of real saved workflows contain duplicate node ids; two nodes cannot both
		// keep one id, so codegen hands it to the first and lets the rest be reassigned.
		it('should emit a duplicated id only once', () => {
			const code = generateWorkflowCode({
				workflow: {
					...simpleWorkflow,
					nodes: [
						{ ...simpleWorkflow.nodes[0], id: 'dup' },
						{ ...simpleWorkflow.nodes[1], id: 'dup' },
					],
				},
				includeNodeIds: true,
			});

			expect(code.match(/id: 'dup'/g)).toHaveLength(1);
		});
	});

	describe('round trip', () => {
		it('should preserve every node id through code and back', () => {
			const code = generateWorkflowCode({ workflow: simpleWorkflow, includeNodeIds: true });
			const rebuilt = parseWorkflowCodeToBuilder(code).toJSON();

			for (const original of simpleWorkflow.nodes) {
				expect(rebuilt.nodes.find((n) => n.name === original.name)?.id).toBe(original.id);
			}
		});

		it('should preserve the id of a node renamed in the generated code', () => {
			const code = generateWorkflowCode({ workflow: simpleWorkflow, includeNodeIds: true });
			const rebuilt = parseWorkflowCodeToBuilder(
				code.replace(/'Process'/g, "'Transform'"),
			).toJSON();

			expect(rebuilt.nodes.find((n) => n.name === 'Transform')?.id).toBe('saved-set');
		});

		it('should assign a fresh id to a node added without one', () => {
			const code = generateWorkflowCode({ workflow: simpleWorkflow, includeNodeIds: true });
			// Add a node that declares no id, the way an agent extends the generated source: declare
			// it above the builder and hang it off the end of the export chain.
			const declaration =
				"const added = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Added' } });\n\n";
			const withAdded = `${code.replace('const wf = workflow(', `${declaration}const wf = workflow(`).trimEnd()}\n  .to(added)\n`;
			expect(withAdded).toContain("name: 'Added'");

			const rebuilt = parseWorkflowCodeToBuilder(withAdded).toJSON();
			const addedNode = rebuilt.nodes.find((n) => n.name === 'Added');

			expect(addedNode?.id).toBeTruthy();
			// A fresh id, not one borrowed from a preserved node.
			expect(['saved-trigger', 'saved-set']).not.toContain(addedNode?.id);
			expect(rebuilt.nodes.find((n) => n.name === 'Process')?.id).toBe('saved-set');
			const ids = rebuilt.nodes.map((n) => n.id);
			expect(new Set(ids).size).toBe(ids.length);
		});
	});

	describe('toolAvailability source references', () => {
		const createToolAvailabilityWorkflow = (version: 3 | 3.1): WorkflowJSON => ({
			id: 'wf-tool-availability',
			name: 'Tool Availability',
			nodes: [
				{
					id: 'trigger-id',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'agent-id',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: version,
					position: [200, 0],
					parameters: {
						promptType: 'define',
						text: 'Use the available tools',
						toolAvailability: {
							rules: [{ sourceNodeId: 'calculator-id', available: '={{ $json.allowTool }}' }],
						},
					},
				},
				{
					id: 'model-id',
					name: 'Chat Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1.2,
					position: [200, 200],
					parameters: { model: 'gpt-4o-mini' },
				},
				{
					id: 'calculator-id',
					name: 'Calculator',
					type: '@n8n/n8n-nodes-langchain.toolCalculator',
					typeVersion: 1,
					position: [400, 200],
					parameters: {},
				},
				{
					id: 'wikipedia-id',
					name: 'Wikipedia',
					type: '@n8n/n8n-nodes-langchain.toolWikipedia',
					typeVersion: 1,
					position: [600, 200],
					parameters: {},
				},
			],
			connections: {
				Start: { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] },
				'Chat Model': {
					ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
				},
				Calculator: { ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]] },
				Wikipedia: { ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]] },
			},
		});

		it.each([3, 3.1] as const)(
			'preserves referenced tool source IDs in a default round trip for Agent V%s',
			(version) => {
				const original = createToolAvailabilityWorkflow(version);
				const code = generateWorkflowCode(original);

				expect(code).toContain("id: 'calculator-id'");
				expect(code).not.toContain('trigger-id');
				expect(code).not.toContain('agent-id');
				expect(code).not.toContain('model-id');
				expect(code).not.toContain('wikipedia-id');

				const rebuilt = parseWorkflowCode(code);
				const agent = rebuilt.nodes.find(({ name }) => name === 'AI Agent');
				const calculator = rebuilt.nodes.find(({ name }) => name === 'Calculator');

				expect(agent?.typeVersion).toBe(version);
				expect(calculator?.id).toBe('calculator-id');
				expect(agent?.parameters?.toolAvailability).toEqual({
					rules: [{ sourceNodeId: calculator?.id, available: '={{ $json.allowTool }}' }],
				});
				expect(rebuilt.connections).toEqual(original.connections);

				const builder = parseWorkflowCodeToBuilder(code);
				expect(builder.validate().errors).toEqual([]);
				builder.regenerateNodeIds();
				const regenerated = builder.toJSON();
				expect(regenerated.nodes.find(({ name }) => name === 'Calculator')?.id).toBe(
					'calculator-id',
				);
			},
		);

		it('still emits referenced tool source IDs when includeNodeIds is false', () => {
			const code = generateWorkflowCode({
				workflow: createToolAvailabilityWorkflow(3.1),
				includeNodeIds: false,
			});

			expect(code).toContain("id: 'calculator-id'");
			expect(code).not.toContain('wikipedia-id');
		});

		it('does not emit IDs for non-tool nodes referenced by a stale rule', () => {
			const workflow = createToolAvailabilityWorkflow(3);
			workflow.nodes[1] = {
				...workflow.nodes[1],
				parameters: {
					...workflow.nodes[1].parameters,
					toolAvailability: {
						rules: [
							{ sourceNodeId: 'calculator-id', available: true },
							{ sourceNodeId: 'trigger-id', available: false },
						],
					},
				},
			};

			const code = generateWorkflowCode(workflow);

			expect(code).toContain("id: 'calculator-id'");
			expect(code).not.toContain("id: 'trigger-id'");
		});

		it('emits a duplicated referenced tool ID only once', () => {
			const workflow = createToolAvailabilityWorkflow(3);
			workflow.nodes[4] = { ...workflow.nodes[4], id: 'calculator-id' };

			const code = generateWorkflowCode(workflow);

			expect(code.match(/id: 'calculator-id'/g)).toHaveLength(1);
			expect(parseWorkflowCodeToBuilder(code).validate().errors).toEqual([]);
		});
	});
});
