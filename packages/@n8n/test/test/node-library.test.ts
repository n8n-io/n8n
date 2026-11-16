import { executeWorkflow, loadWorkflow, mockNode } from '../src';
import definition from './fixtures/ai-agent.json';

const input = { question: 'What is n8n?' };

test('runs a mocked AI agent and its model sub-node', async () => {
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
