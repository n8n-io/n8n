import { READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { versionDescription } from '../actions/versionDescription';

describe('Anthropic v1 annotations', () => {
	const nonDestructiveWrite = { effect: 'write', destructive: false, idempotent: false };
	const destructiveWrite = { effect: 'write', destructive: true, idempotent: false };

	it.each([
		[{ resource: 'document', operation: 'analyze' }, nonDestructiveWrite],
		[{ resource: 'file', operation: 'upload' }, nonDestructiveWrite],
		[{ resource: 'file', operation: 'get' }, READ_ONLY_ANNOTATIONS],
		[{ resource: 'file', operation: 'list' }, READ_ONLY_ANNOTATIONS],
		[{ resource: 'file', operation: 'deleteFile' }, destructiveWrite],
		[{ resource: 'image', operation: 'analyze' }, nonDestructiveWrite],
		[{ resource: 'prompt', operation: 'generate' }, nonDestructiveWrite],
		[{ resource: 'prompt', operation: 'improve' }, nonDestructiveWrite],
		[{ resource: 'prompt', operation: 'templatize' }, nonDestructiveWrite],
		[{ resource: 'text', operation: 'message' }, destructiveWrite],
	])('should resolve %j', (parameters, expected) => {
		expect(resolveNodeAnnotations(versionDescription, { parameters, typeVersion: 1 })).toEqual(
			expected,
		);
	});
});
