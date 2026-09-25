import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

export const testNode: INode = {
	id: 'test',
	name: 'Confluence',
	type: 'n8n-nodes-base.confluence',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

export function mockExecuteCtx(
	params: Record<string, unknown>,
	items = 1,
): DeepMockProxy<IExecuteFunctions> {
	const ctx = mockDeep<IExecuteFunctions>();
	ctx.getInputData.mockReturnValue(Array.from({ length: items }, () => ({ json: {} })));
	ctx.getNodeParameter.mockImplementation(
		(name: string, _i?: number, fallback?: unknown, options?: { extractValue?: boolean }) => {
			const value = name in params ? params[name] : fallback;
			// Mimic extractValue unwrapping a resource locator to its value, so a
			// call site that forgets to ask for extraction fails the assertions.
			if (options?.extractValue && value && typeof value === 'object' && 'value' in value) {
				return (value as { value: unknown }).value as never;
			}
			return value as never;
		},
	);
	ctx.getNode.mockReturnValue(testNode);
	ctx.helpers.returnJsonArray.mockImplementation((data) =>
		(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
	);
	ctx.helpers.constructExecutionMetaData.mockImplementation(
		(data, { itemData }) => data.map((entry) => ({ ...entry, pairedItem: itemData })) as never,
	);
	return ctx;
}
