import { READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { Airtable } from '../Airtable.node';

const airtable = new Airtable();

describe('Airtable v1, annotations', () => {
	const { description } = airtable.getNodeType(1);

	it.each([
		[{}, READ_ONLY_ANNOTATIONS],
		[{ operation: 'append' }, { effect: 'write', destructive: false, idempotent: false }],
		[{ operation: 'delete' }, { effect: 'write', destructive: true, idempotent: false }],
		[{ operation: 'list' }, READ_ONLY_ANNOTATIONS],
		[{ operation: 'read' }, READ_ONLY_ANNOTATIONS],
		[{ operation: 'update' }, { effect: 'write', destructive: true, idempotent: false }],
	])('should resolve %j', (parameters, expected) => {
		expect(resolveNodeAnnotations(description, { parameters, typeVersion: 1 })).toEqual(expected);
	});
});

describe.each([2, 2.1, 2.2])('Airtable v%s, annotations', (typeVersion) => {
	const { description } = airtable.getNodeType(typeVersion);

	it.each([
		[{}, READ_ONLY_ANNOTATIONS],
		[{ resource: 'base' }, READ_ONLY_ANNOTATIONS],
		[
			{ resource: 'record', operation: 'create' },
			{ effect: 'write', destructive: false, idempotent: false },
		],
		[
			{ resource: 'record', operation: 'upsert' },
			{ effect: 'write', destructive: true, idempotent: false },
		],
		[
			{ resource: 'record', operation: 'deleteRecord' },
			{ effect: 'write', destructive: true, idempotent: false },
		],
		[{ resource: 'record', operation: 'get' }, READ_ONLY_ANNOTATIONS],
		[{ resource: 'record', operation: 'search' }, READ_ONLY_ANNOTATIONS],
		[
			{ resource: 'record', operation: 'update' },
			{ effect: 'write', destructive: true, idempotent: false },
		],
		[{ resource: 'base', operation: 'getMany' }, READ_ONLY_ANNOTATIONS],
		[{ resource: 'base', operation: 'getSchema' }, READ_ONLY_ANNOTATIONS],
	])('should resolve %j', (parameters, expected) => {
		expect(resolveNodeAnnotations(description, { parameters, typeVersion })).toEqual(expected);
	});
});
