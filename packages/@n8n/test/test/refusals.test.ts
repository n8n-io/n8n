import { executeWorkflow, loadWorkflow, mockNode } from '../src';
import type { WorkflowDefinition } from '../src';
import refusals from './fixtures/refusals.json';

function startThen(name: string): WorkflowDefinition {
	return {
		...refusals,
		nodes: refusals.nodes.filter((node) => node.name === 'Start' || node.name === name),
		connections: { Start: { main: [[{ node: name, type: 'main', index: 0 }]] } },
	};
}

test.each([
	['Wait for approval', 'WAIT_NOT_MOCKED', 'waits for a webhook call'],
	['Wait for form', 'WAIT_NOT_MOCKED', 'waits for a form submission'],
	['Ask manager', 'WAIT_NOT_MOCKED', 'sends a message and waits for a reply'],
	['Find refund', 'DATA_TABLE_NOT_MOCKED', 'uses a data table'],
	['Score refund', 'CODE_NODE_NOT_MOCKED', 'runs Python code'],
])('fails on node "%s" with no mock', async (name, code, reason) => {
	const workflow = loadWorkflow(startThen(name));

	const execution = executeWorkflow(workflow, { input: { refundId: 9 } });

	await expect(execution).rejects.toMatchObject({
		code,
		node: name,
		message: expect.stringMatching(new RegExp(`${reason}.*mockNode\\(\\)`)),
	});
});

test('continues with the mocked data of a wait for approval', async () => {
	const workflow = loadWorkflow(startThen('Wait for approval'));
	mockNode(workflow.node('Wait for approval'), [{ approved: true }]);

	const result = await executeWorkflow(workflow, { input: { refundId: 9 } });

	expect(result.output).toEqual([{ approved: true }]);
});
