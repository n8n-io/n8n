import { executeWorkflow, loadWorkflow, mockNode } from '../src';
import definition from './fixtures/prices.json';

test('links each mocked item to the input item that made it', async () => {
	const workflow = loadWorkflow(definition);
	const getPrice = vi.fn(async ({ id }: { id: number }) =>
		id === 1 ? [{ price: 2 }, { price: 3 }] : [{ price: 7 }],
	);
	mockNode(workflow.node('Get price'), { each: getPrice });

	const result = await executeWorkflow(workflow, { input: [{ id: 1 }, { id: 3 }] });

	expect(getPrice).toHaveBeenCalledTimes(2);
	expect(result.output).toEqual([
		{ id: 1, price: 2 },
		{ id: 1, price: 3 },
		{ id: 3, price: 7 },
	]);
});
