import type { INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError, WorkflowOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { fromV1ErrorDetails, toV1ErrorDetails } from '../v1-error-details';

const node: INode = {
	id: 'n',
	name: 'Subject',
	type: 'test.alwaysFails',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('toV1ErrorDetails', () => {
	it('keeps the structured part of a node error', () => {
		const error = new NodeOperationError(node, 'boom', {
			description: 'Check the credentials',
			level: 'warning',
			itemIndex: 2,
		});

		expect(toV1ErrorDetails(error)).toMatchObject({
			description: 'Check the credentials',
			level: 'warning',
			functionality: 'regular',
			context: { itemIndex: 2 },
			node: { id: 'n', name: 'Subject', type: 'test.alwaysFails' },
		});
	});

	it('keeps the HTTP code of an API error', () => {
		const error = new NodeApiError(node, {}, { httpCode: '429', message: 'Too many' });

		expect(toV1ErrorDetails(error)).toMatchObject({ httpCode: '429' });
	});

	it('has nothing for an error that is not a v1 execution error', () => {
		expect(toV1ErrorDetails(new TypeError('plain'))).toBeUndefined();
		expect(toV1ErrorDetails('not even an error')).toBeUndefined();
	});
});

describe('fromV1ErrorDetails', () => {
	it('rebuilds the error fields the editor renders after a reload', () => {
		const details = toV1ErrorDetails(
			new NodeOperationError(node, 'boom', {
				description: 'Check the credentials',
				itemIndex: 2,
			}),
		);

		const error = fromV1ErrorDetails('NodeOperationError', 'boom', details);

		expect(error).toBeInstanceOf(WorkflowOperationError);
		expect(error).toMatchObject({
			name: 'NodeOperationError',
			message: 'boom',
			description: 'Check the credentials',
			context: { itemIndex: 2 },
		});
		// What `ExecutionBaseError.toJSON` serializes is what reaches the editor.
		expect(error.toJSON?.()).toMatchObject({
			name: 'NodeOperationError',
			message: 'boom',
			description: 'Check the credentials',
			context: { itemIndex: 2 },
		});
	});

	it('rebuilds a bare error when there are no details', () => {
		const error = fromV1ErrorDetails('TypeError', 'plain', undefined);

		expect(error).toBeInstanceOf(WorkflowOperationError);
		expect(error).toMatchObject({ name: 'TypeError', message: 'plain' });
		expect(error.description).toBeUndefined();
	});

	it('ignores details it does not recognise', () => {
		const error = fromV1ErrorDetails('Error', 'odd', { description: 7, context: 'nope' });

		expect(error.description).toBeUndefined();
		expect(error.context).toEqual({});
	});
});
