import { executeWorkflow, loadWorkflow, mockNode } from '../src';
import definition from './fixtures/format-name.json';

test('joins the first name and the last name, and ignores pinned data', async () => {
	const workflow = loadWorkflow(definition);

	const result = await executeWorkflow(workflow, { input: { first: 'Ada', last: 'Lovelace' } });

	expect(result.output).toEqual([{ fullName: 'Ada Lovelace' }]);
});

test('keeps a mock on the handle that the load call returned', async () => {
	const mocked = loadWorkflow(definition);
	const fresh = loadWorkflow(definition);
	mockNode(mocked.node('Format name'), [{ fullName: 'Mocked' }]);

	const result = await executeWorkflow(fresh, { input: { first: 'Ada', last: 'Lovelace' } });

	expect(result.output).toEqual([{ fullName: 'Ada Lovelace' }]);
});

test('fails the execution when a mock function returns undefined', async () => {
	const workflow = loadWorkflow(definition);
	mockNode(workflow.node('Format name'), vi.fn().mockReturnValue(undefined));

	await expect(executeWorkflow(workflow, { input: {} })).rejects.toMatchObject({
		code: 'MOCK_INVALID_OUTPUT',
		node: 'Format name',
	});
});

test('throws on an unknown node name and lists the node names', () => {
	const workflow = loadWorkflow(definition);

	expect(() => workflow.node('Format nmae')).toThrow(
		'Workflow "Format name" has no node "Format nmae". Nodes: Start, Format name',
	);
});

test('rejects a second execution while one is in progress', async () => {
	const workflow = loadWorkflow(definition);

	const first = executeWorkflow(workflow, { input: {} });
	const second = executeWorkflow(workflow, { input: {} });

	await expect(second).rejects.toMatchObject({ code: 'EXECUTION_IN_PROGRESS' });
	await expect(first).resolves.toBeDefined();
});
