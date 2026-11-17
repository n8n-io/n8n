import { executeWorkflow, loadWorkflow, mockNode } from '../src';
import definition from './fixtures/two-branches.json';

test('joins the items of every run of the end node in run order', async () => {
	const workflow = loadWorkflow(definition);
	mockNode(workflow.node('Left'), [{ side: 'left' }]);
	mockNode(workflow.node('Right'), [{ side: 'right' }]);

	const result = await executeWorkflow(workflow);

	expect(result.node('End').runs).toHaveLength(2);
	expect(result.output).toEqual([{ side: 'left' }, { side: 'right' }]);
});
