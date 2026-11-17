import { executeWorkflow, loadWorkflow, mockNode } from '../src';
import definition from './fixtures/pages.json';

test('gives a mock function a different reply for each run', async () => {
	const workflow = loadWorkflow(definition);
	mockNode(
		workflow.node('Get customers'),
		vi
			.fn()
			.mockReturnValueOnce([{ id: 1 }, { id: 2 }])
			.mockReturnValueOnce([{ id: 3 }]),
	);

	const result = await executeWorkflow(workflow, { input: [{ page: 1 }, { page: 2 }] });

	const runs = result.node('Get customers').runs;
	expect(runs.map((run) => run.output)).toEqual([[{ id: 1 }, { id: 2 }], [{ id: 3 }]]);
	expect(() => result.node('Get customers').output).toThrow(
		'Node "Get customers" ran 2 times. Read its runs.',
	);
});
