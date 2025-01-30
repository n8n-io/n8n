import type { INode, INodeType } from 'n8n-workflow';

import { isDeclarativeRunException } from '../is-declarative-run-exception';

describe('isDeclarativeRunException', () => {
	test('returns true when no declarativeRunExceptions are defined, not a declarative node', () => {
		const node: INode = { parameters: { resource: 'test', operation: 'run' } } as unknown as INode;
		const nodeType: INodeType = {
			description: {},
			execute: () => {},
		} as INodeType;

		expect(isDeclarativeRunException(node, nodeType, 'execute')).toBe(true);
	});

	test('returns true when resource-operation pair is in declarativeRunExceptions, run execute methood, do not create RoutingNode', () => {
		const node: INode = { parameters: { resource: 'test', operation: 'run' } } as unknown as INode;
		const nodeType: INodeType = {
			description: {
				declarativeRunExceptions: [{ resource: 'test', operation: 'run' }],
			},
			execute: () => {},
		} as INodeType;

		expect(isDeclarativeRunException(node, nodeType, 'execute')).toBe(true);
	});

	test('returns false when resource-operation pair is not in declarativeRunExceptions, proceed to declarative run', () => {
		const node: INode = { parameters: { resource: 'test', operation: 'run' } } as unknown as INode;
		const nodeType: INodeType = {
			description: {
				declarativeRunExceptions: [{ resource: 'other', operation: 'run' }],
			},
			execute: () => {},
		} as INodeType;

		expect(isDeclarativeRunException(node, nodeType, 'execute')).toBe(false);
	});
});
