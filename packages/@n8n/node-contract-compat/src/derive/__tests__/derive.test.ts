import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

import { validate } from '@n8n/node-sdk';
import { generateNodeModule } from '@n8n/node-sdk/codegen';
import { canonicalJson } from '@n8n/node-sdk/registry';

import {
	deriveManifests,
	fromLegacyParameters,
	toLegacyParameters,
	type DerivedAction,
} from '../../index';
import { outputSchemaFrom } from '../derive';
import { normaliseParameters } from '../round-trip';

const show = (rules: Record<string, unknown[]>) =>
	({ displayOptions: { show: rules } }) as Pick<INodeProperties, 'displayOptions'>;

const todo: INodeTypeDescription = {
	displayName: 'Todo',
	name: 'todo',
	group: ['output'],
	version: [1, 2],
	description: 'Manage tasks',
	defaults: { name: 'Todo' },
	inputs: ['main'],
	outputs: ['main'],
	credentials: [{ name: 'todoApi', required: true }],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [{ name: 'Task', value: 'task' }],
			default: 'task',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			...show({ resource: ['task'] }),
			options: [
				{ name: 'Create', value: 'create', action: 'Create a task' },
				{ name: 'Get Many', value: 'getAll', action: 'Get many tasks' },
			],
			default: 'create',
		},
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			required: true,
			...show({ operation: ['create'] }),
			default: '',
		},
		{
			displayName: 'Notes',
			name: 'notes',
			type: 'string',
			...show({ operation: ['create'], '@version': [{ _cnd: { gte: 2 } }] }),
			default: '',
		},
		{
			displayName: 'Project',
			name: 'projectId',
			type: 'resourceLocator',
			...show({ operation: ['create'] }),
			default: { mode: 'list', value: '' },
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: { searchListMethod: 'searchProjects' },
				},
				{ displayName: 'ID', name: 'id', type: 'string' },
			],
		},
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			...show({ operation: ['create'] }),
			default: {},
			options: [
				{
					displayName: 'Priority',
					name: 'priority',
					type: 'options',
					options: [
						{ name: 'Low', value: 'low' },
						{ name: 'High', value: 'high' },
					],
					default: 'low',
				},
				{
					displayName: 'Tag',
					name: 'tag',
					type: 'options',
					typeOptions: { loadOptionsMethod: 'getTags' },
					default: '',
				},
			],
		},
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			...show({ operation: ['getAll'] }),
			default: false,
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1 },
			...show({ operation: ['getAll'], returnAll: [false] }),
			default: 50,
		},
	],
};

const request: INodeTypeDescription = {
	displayName: 'Request',
	name: 'request',
	group: ['output'],
	version: 1,
	description: 'Send a request',
	defaults: { name: 'Request' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{ displayName: 'URL', name: 'url', type: 'string', required: true, default: '' },
		{ displayName: 'Send Body', name: 'sendBody', type: 'boolean', default: false },
		{
			displayName: 'Body Content',
			name: 'specifyBody',
			type: 'options',
			...show({ sendBody: [true] }),
			options: [
				{ name: 'JSON', value: 'json' },
				{ name: 'Fields', value: 'keypair' },
			],
			default: 'keypair',
		},
		{
			displayName: 'JSON',
			name: 'jsonBody',
			type: 'json',
			...show({ sendBody: [true], specifyBody: ['json'] }),
			default: '',
		},
	],
};

const derive = (description: INodeTypeDescription) =>
	deriveManifests(description, { packageName: 'n8n-nodes-base' });

const actionOf = (description: INodeTypeDescription, typeVersion: number, id: string) => {
	const action = derive(description)
		.find((version) => version.typeVersion === typeVersion)
		?.actions.find((candidate) => candidate.contract.id === id);
	if (!action) throw new Error(`no ${id}@${typeVersion}`);
	return action;
};

const roundTrips = (
	action: DerivedAction,
	description: INodeTypeDescription,
	parameters: object,
) => {
	const { typeVersion } = action.compile.target;
	const input = fromLegacyParameters(action.compile, description, { ...parameters });
	const back = toLegacyParameters(action.compile, input);
	return {
		input,
		equal:
			canonicalJson(normaliseParameters(description, typeVersion, back)) ===
			canonicalJson(normaliseParameters(description, typeVersion, { ...parameters })),
	};
};

describe('deriveManifests', () => {
	it('derives one action per typeVersion, resource, and operation', () => {
		const versions = derive(todo);
		expect(versions.map((version) => version.typeVersion)).toEqual([1, 2]);
		expect(versions[1]?.actions.map((action) => action.contract.id)).toEqual([
			'todo.task.create',
			'todo.task.getAll',
		]);
		const create = actionOf(todo, 2, 'todo.task.create');
		expect(create.contract).toMatchObject({
			version: 2,
			nodeDisplayName: 'Todo',
			semver: '2.0.0',
			summary: 'Create a task',
			credentials: ['todoApi'],
			derived: true,
			outputClaim: 'unknown',
			output: {},
		});
		expect(create.compile.target).toEqual({
			type: 'n8n-nodes-base.todo',
			typeVersion: 2,
			resource: 'task',
			operation: 'create',
		});
	});

	it('evaluates `@version` conditions through displayOptions', () => {
		const fieldsAt = (typeVersion: number) =>
			Object.keys(actionOf(todo, typeVersion, 'todo.task.create').compile.fields);
		expect(fieldsAt(1)).not.toContain('notes');
		expect(fieldsAt(2)).toContain('notes');
	});

	it('makes a variant when one selector controls the shown fields', () => {
		const getAll = actionOf(todo, 1, 'todo.task.getAll');
		expect(getAll.shape).toBe('variants');
		expect(getAll.compile.selector).toBe('returnAll');
		const { input } = getAll.contract;
		expect(validate({ returnAll: true }, input)).toEqual([]);
		expect(validate({ returnAll: false, limit: 5 }, input)).toEqual([]);
		expect(validate({ returnAll: false, limit: 0 }, input)).toEqual([
			'input.limit: must be at least 1',
		]);
		expect(validate({ returnAll: true, limit: 5 }, input)).toEqual([
			'input: unknown field(s) limit. Allowed: returnAll',
		]);
	});

	it('types fields, maps locators, and reports what it cannot type', () => {
		const create = actionOf(todo, 2, 'todo.task.create');
		expect(create.shape).toBe('flat');
		expect(create.contract.input.required).toEqual(['title']);
		expect(create.compile.fields.projectId).toEqual({ path: 'projectId', kind: 'resourceLocator' });
		expect(create.issues.map((issue) => `${issue.kind} ${issue.field}`)).toEqual([
			'resourceLocator projectId',
			'loadOptions additionalFields.tag',
		]);
		expect(create.counts).toEqual({ top: 4, nested: 2, typed: 4, loose: 1, opaque: 0 });
	});

	it('keeps fields that a nested selector shows as optional fields of the branch', () => {
		const action = actionOf(request, 1, 'request.execute');
		expect(action.shape).toBe('variants');
		const { input } = action.contract;
		expect(
			validate({ url: 'u', sendBody: true, specifyBody: 'json', jsonBody: '{}' }, input),
		).toEqual([]);
		expect(validate({ url: 'u', sendBody: false, jsonBody: '{}' }, input)).toEqual([
			'input: unknown field(s) jsonBody. Allowed: sendBody, url',
		]);
	});

	it('uses a declared output schema and marks it inferred', () => {
		const [version] = deriveManifests(request, {
			packageName: 'n8n-nodes-base',
			outputSchema: () =>
				outputSchemaFrom({ type: 'object', version: 1, properties: { id: { type: 'string' } } }),
		});
		expect(version?.actions[0]?.contract).toMatchObject({
			outputClaim: 'inferred',
			output: { type: 'object', properties: { id: { type: 'string' } } },
		});
	});

	it('renders the typed module without the legacy locator flag', () => {
		const create = actionOf(todo, 2, 'todo.task.create');
		const module = generateNodeModule('todo', [
			{
				contract: create.contract,
				nodeType: create.compile.target.type,
				native: true,
				resource: 'task',
				operation: 'create',
			},
		]);
		expect(module).toContain('projectId?: { mode: "list" | "id"; value: Value<I, C, string> };');
		expect(module).toContain('tag?: Value<I, C, string> | Value<I, C, number>;');
		expect(module).not.toContain('__rl');
	});
});

describe('toLegacyParameters and fromLegacyParameters', () => {
	it('round-trips saved parameters through the identity map', () => {
		const create = actionOf(todo, 2, 'todo.task.create');
		const saved = {
			resource: 'task',
			operation: 'create',
			title: '={{ $json.title }}',
			projectId: { __rl: true, mode: 'id', value: 'p1', cachedResultName: 'Inbox' },
			additionalFields: { priority: 'high' },
		};
		const { input, equal } = roundTrips(create, todo, saved);
		expect(input).toEqual({
			title: '={{ $json.title }}',
			projectId: { mode: 'id', value: 'p1', cachedResultName: 'Inbox' },
			additionalFields: { priority: 'high' },
		});
		expect(validate(input, create.contract.input, { allowExpressions: true })).toEqual([]);
		expect(equal).toBe(true);
		expect(toLegacyParameters(create.compile, input)).toEqual(saved);
	});

	it('keeps the variant tag when it holds the default', () => {
		const getAll = actionOf(todo, 1, 'todo.task.getAll');
		const { input, equal } = roundTrips(getAll, todo, { resource: 'task', operation: 'getAll' });
		expect(input).toEqual({ returnAll: false });
		expect(validate(input, getAll.contract.input)).toEqual([]);
		expect(equal).toBe(true);
	});

	it('drops parameters that the action does not show', () => {
		const create = actionOf(todo, 1, 'todo.task.create');
		const input = fromLegacyParameters(create.compile, todo, {
			resource: 'task',
			operation: 'create',
			title: 't',
			notes: 'only shown in version 2',
		});
		expect(input).toEqual({ title: 't' });
	});
});
