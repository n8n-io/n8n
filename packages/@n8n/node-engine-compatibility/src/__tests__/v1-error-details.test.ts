import type { INode } from 'n8n-workflow';
import { deepCopy, NodeApiError, NodeOperationError, WorkflowOperationError } from 'n8n-workflow';
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
	it('is what the error serializes for the editor', () => {
		const error = new NodeOperationError(node, 'boom', {
			description: 'Check the credentials',
			itemIndex: 2,
		});

		expect(toV1ErrorDetails(error)).toEqual(deepCopy(error.toJSON?.()));
		expect(toV1ErrorDetails(error)).toMatchObject({
			name: 'NodeOperationError',
			message: 'boom',
			description: 'Check the credentials',
			context: { itemIndex: 2 },
		});
	});

	it('carries no more than the editor would get after a v1 run', () => {
		const error = new NodeApiError(node, {}, { httpCode: '429', message: 'Too many' });

		expect(toV1ErrorDetails(error)).not.toHaveProperty('httpCode');
		expect(toV1ErrorDetails(error)).not.toHaveProperty('node');
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
