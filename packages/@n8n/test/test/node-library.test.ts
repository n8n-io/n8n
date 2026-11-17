import { executeWorkflow, loadWorkflow, mockNode, type WorkflowDefinition } from '../src';
import definition from './fixtures/ai-agent.json';

const input = { question: 'What is n8n?' };

test('runs a mocked AI agent and its downstream nodes', async () => {
	const workflow = loadWorkflow(definition);
	mockNode(workflow.node('AI Agent'), [{ output: 'A workflow tool.' }]);
	mockNode(workflow.node('Acme lookup'), [{ found: true }]);

	const result = await executeWorkflow(workflow, { input });

	expect(result.node('Format answer').output).toEqual([{ answer: 'A workflow tool.' }]);
});

test('fails on a node type that is not installed and has no mock', async () => {
	const workflow = loadWorkflow(definition);
	mockNode(workflow.node('AI Agent'), [{ output: 'A workflow tool.' }]);

	await expect(executeWorkflow(workflow, { input })).rejects.toMatchObject({
		code: 'NODE_TYPE_NOT_INSTALLED',
		workflow: 'Answer question',
		node: 'Acme lookup',
		message: expect.stringContaining('"n8n-nodes-acme.lookup" version 1'),
	});
});

test('accepts sub-nodes that are not installed when their branches meet at a mocked node', async () => {
	const subNode = (name: string) => ({
		id: name,
		name,
		type: 'n8n-nodes-acme.tool',
		typeVersion: 1,
		position: [0, 400],
		parameters: {},
	});
	const toTool = (node: string) => ({ ai_tool: [[{ node, type: 'ai_tool', index: 0 }]] });
	const converging: WorkflowDefinition = {
		...definition,
		nodes: [...definition.nodes, ...['Embeddings', 'Left', 'Right', 'Shared'].map(subNode)],
		connections: {
			...definition.connections,
			Embeddings: {
				ai_tool: [
					[
						{ node: 'Left', type: 'ai_tool', index: 0 },
						{ node: 'Right', type: 'ai_tool', index: 0 },
					],
				],
			},
			Left: toTool('Shared'),
			Right: toTool('Shared'),
			Shared: toTool('AI Agent'),
		},
	};
	const workflow = loadWorkflow(converging);
	mockNode(workflow.node('AI Agent'), [{ output: 'A workflow tool.' }]);
	mockNode(workflow.node('Acme lookup'), [{ found: true }]);

	const result = await executeWorkflow(workflow, { input });

	expect(result.node('Format answer').output).toEqual([{ answer: 'A workflow tool.' }]);
});
