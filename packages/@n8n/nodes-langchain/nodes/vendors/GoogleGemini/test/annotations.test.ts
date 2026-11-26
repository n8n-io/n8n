import { READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { GoogleGemini } from '../GoogleGemini.node';

const { description } = new GoogleGemini();

describe.each([1, 1.1, 1.2])('GoogleGemini v%s, annotations', (typeVersion) => {
	it.each([
		[{}, { effect: 'write', destructive: true, idempotent: false }],
		[
			{ resource: 'audio', operation: 'analyze' },
			{ effect: 'write', destructive: false, idempotent: false },
		],
		[
			{ resource: 'audio', operation: 'transcribe' },
			{ effect: 'write', destructive: false, idempotent: false },
		],
		[
			{ resource: 'document', operation: 'analyze' },
			{ effect: 'write', destructive: false, idempotent: false },
		],
		[
			{ resource: 'file', operation: 'upload' },
			{ effect: 'write', destructive: false, idempotent: false },
		],
		[
			{ resource: 'fileSearch', operation: 'createStore' },
			{ effect: 'write', destructive: false, idempotent: false },
		],
		[
			{ resource: 'fileSearch', operation: 'deleteStore' },
			{ effect: 'write', destructive: true, idempotent: false },
		],
		[{ resource: 'fileSearch', operation: 'listStores' }, READ_ONLY_ANNOTATIONS],
		[
			{ resource: 'fileSearch', operation: 'uploadToStore' },
			{ effect: 'write', destructive: false, idempotent: false },
		],
		[
			{ resource: 'image', operation: 'analyze' },
			{ effect: 'write', destructive: false, idempotent: false },
		],
		[{ resource: 'image', operation: 'generate' }, READ_ONLY_ANNOTATIONS],
		[
			{ resource: 'image', operation: 'edit' },
			{ effect: 'write', destructive: false, idempotent: false },
		],
		[
			{ resource: 'text', operation: 'message' },
			{ effect: 'write', destructive: true, idempotent: false },
		],
		[
			{ resource: 'video', operation: 'analyze' },
			{ effect: 'write', destructive: false, idempotent: false },
		],
		[
			{ resource: 'video', operation: 'generate' },
			{ effect: 'write', destructive: false, idempotent: false },
		],
		[{ resource: 'video', operation: 'download' }, READ_ONLY_ANNOTATIONS],
	])('should resolve %j', (parameters, expected) => {
		expect(resolveNodeAnnotations(description, { parameters, typeVersion })).toEqual(expected);
	});
});
