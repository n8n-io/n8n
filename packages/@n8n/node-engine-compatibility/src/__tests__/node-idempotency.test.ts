import type { INode, INodeType, INodeTypeDescription, INodeTypes } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { createIdempotencyResolver } from '../node-idempotency';

const httpNode = (method: string): INode => ({
	id: 'http-uuid',
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 1,
	position: [0, 0],
	parameters: { method },
});

/** A node type whose `method` option declares the annotation for GET only. */
const description = {
	properties: [
		{
			displayName: 'Method',
			name: 'method',
			type: 'options',
			default: 'GET',
			options: [
				{
					name: 'GET',
					value: 'GET',
					annotations: { effect: 'read', destructive: false, idempotent: true },
				},
				{ name: 'POST', value: 'POST' },
			],
		},
	],
} as unknown as INodeTypeDescription;

function nodeTypesWith(getByNameAndVersion: INodeTypes['getByNameAndVersion']): INodeTypes {
	return { getByNameAndVersion } as unknown as INodeTypes;
}

describe('createIdempotencyResolver', () => {
	const isIdempotent = createIdempotencyResolver(
		nodeTypesWith(() => ({ description }) as unknown as INodeType),
	);

	it('answers true for an operation that the node type annotates as idempotent', () => {
		expect(isIdempotent(httpNode('GET'))).toBe(true);
	});

	it('answers false for an operation with no annotation', () => {
		expect(isIdempotent(httpNode('POST'))).toBe(false);
	});

	it('answers false when an expression selects the operation', () => {
		expect(isIdempotent(httpNode('={{ $json.method }}'))).toBe(false);
	});

	it('answers false for a node type that is not known', () => {
		const resolver = createIdempotencyResolver(
			nodeTypesWith(() => {
				throw new Error('Unrecognized node type');
			}),
		);

		expect(resolver(httpNode('GET'))).toBe(false);
	});
});
