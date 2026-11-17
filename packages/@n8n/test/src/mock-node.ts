import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { deepCopy, NodeOperationError } from 'n8n-workflow';

import { WorkflowTestError } from './errors';
import { failExecution, type ExecutionSetup } from './execution-context';
import type { NodeReference } from './workflow-set';

export type MockItems = IDataObject[];

export interface MockOutputs {
	outputs: MockItems[];
}

export type MockResult = MockItems | MockOutputs;

// Vitest types a bare vi.fn() as a function or a class, so a class type must also be accepted.
type BareMockFunction = abstract new (...args: never[]) => unknown;

export type MockOutput =
	| MockResult
	| { error: { message: string } }
	| ((items: IDataObject[]) => MockResult | Promise<MockResult>)
	| BareMockFunction
	| { each(item: IDataObject): MockResult | Promise<MockResult> };

export function mockNode(node: NodeReference, output: MockOutput): void {
	node.workflow.mocks.set(node.name, output);
}

export async function runMock(
	context: ExecutionSetup,
	functions: IExecuteFunctions,
	mock: MockOutput,
): Promise<INodeExecutionData[][]> {
	const items = functions.getInputData();
	const toOutputs = (value: unknown) => toNodeOutputs(context, functions, value);

	if (typeof mock === 'function') {
		const value: unknown = await Reflect.apply(mock, undefined, [items.map((item) => item.json)]);
		return toOutputs(value);
	}
	if (Array.isArray(mock) || 'outputs' in mock) return toOutputs(mock);
	if ('error' in mock) throw new NodeOperationError(functions.getNode(), mock.error.message);

	const outputs: INodeExecutionData[][] = [];
	for (const [index, item] of items.entries()) {
		const itemOutputs = toOutputs(await mock.each(item.json));
		itemOutputs.forEach((output, outputIndex) => {
			outputs[outputIndex] ??= [];
			outputs[outputIndex].push(
				...output.map((data) => ({ ...data, pairedItem: { item: index } })),
			);
		});
	}
	return Array.from(outputs, (output) => output ?? []);
}

function toNodeOutputs(
	context: ExecutionSetup,
	functions: IExecuteFunctions,
	value: unknown,
): INodeExecutionData[][] {
	const toItems = (items: MockItems) => items.map((json) => ({ json: deepCopy(json) }));
	if (isItems(value)) return [toItems(value)];
	if (isOutputs(value)) return value.outputs.map(toItems);

	const node = functions.getNode().name;
	return failExecution(
		context,
		new WorkflowTestError(
			'MOCK_INVALID_OUTPUT',
			`The mock of node "${node}" returned ${String(value)}. Return an array of items or { outputs }.`,
			{ workflow: context.handle.name, node },
		),
	);
}

function isItems(value: unknown): value is MockItems {
	return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null);
}

function isOutputs(value: unknown): value is MockOutputs {
	return (
		typeof value === 'object' &&
		value !== null &&
		'outputs' in value &&
		Array.isArray(value.outputs) &&
		value.outputs.every(isItems)
	);
}
