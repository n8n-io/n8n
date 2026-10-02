import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

import { generateNodeModule } from '@n8n/node-sdk';

import { deriveModuleVersion, readLegacyParameters, toGeneratedAction } from '../../index';

const show = (rules: Record<string, unknown[]>) =>
	({ displayOptions: { show: rules } }) as Pick<INodeProperties, 'displayOptions'>;

const base: INodeTypeDescription = {
	displayName: 'Base',
	name: 'base',
	group: ['output'],
	version: [1, 2.1],
	description: 'Manage records',
	defaults: { name: 'Base' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Create', value: 'create', action: 'Create a record' },
				{ name: 'Search', value: 'search', action: 'Search records' },
			],
			default: 'create',
		},
		{
			displayName: 'Table',
			name: 'table',
			type: 'resourceLocator',
			default: { mode: 'id', value: '' },
			modes: [{ displayName: 'ID', name: 'id', type: 'string' }],
		},
		{
			displayName: 'Mode',
			name: 'mode',
			type: 'options',
			...show({ operation: ['search'] }),
			options: [
				{ name: 'Formula', value: 'formula' },
				{ name: 'View', value: 'view' },
			],
			default: 'formula',
		},
		{
			displayName: 'Formula',
			name: 'formula',
			type: 'string',
			...show({ operation: ['search'], mode: ['formula'] }),
			default: '',
		},
		{
			displayName: 'Sort',
			name: 'sort',
			type: 'boolean',
			...show({ operation: ['search'] }),
			default: false,
		},
		{
			displayName: 'Sort Field',
			name: 'sortField',
			type: 'string',
			...show({ operation: ['search'], sort: [true] }),
			default: '',
		},
	],
};

const derive = (description: INodeTypeDescription, typeVersion?: number) =>
	deriveModuleVersion(description, { packageName: 'n8n-nodes-base', typeVersion });

describe('deriveModuleVersion', () => {
	it('derives the latest typeVersion, or the one asked for', () => {
		expect(derive(base)?.typeVersion).toBe(2.1);
		expect(derive(base, 1)?.typeVersion).toBe(1);
		expect(derive(base, 7)?.typeVersion).toBe(2.1);
	});

	it('leaves out an action whose fields depend on more than one selector', () => {
		expect(derive(base)?.actions.map((action) => action.contract.id)).toEqual(['base.create']);
	});

	it.each([
		['a trigger', { inputs: [] }],
		['a node with two outputs', { outputs: ['main', 'main'] }],
		['an AI root node', { inputs: ['main', 'ai_languageModel'] }],
		['a name that is no identifier', { name: 'base-node' }],
		['a name that is a reserved word', { name: 'function' }],
	] as const)('derives no module for %s', (_case, change) => {
		expect(derive({ ...base, ...change } as INodeTypeDescription)).toBeUndefined();
	});
});

describe('toGeneratedAction', () => {
	it('types an options field without options as an ID by expression', () => {
		const status = {
			displayName: 'Status',
			name: 'status',
			type: 'options' as const,
			default: '',
		};
		const [action] = derive({ ...base, properties: [status] })?.actions ?? [];
		if (!action) throw new Error('no action');
		const module = generateNodeModule('base', [toGeneratedAction(action)]);
		expect(module).toContain('status?: Value<I, C, string> | Value<I, C, number>;');
		expect(action.issues).toEqual([{ kind: 'loadOptions', field: 'status', detail: 'no options' }]);
	});

	it('emits the legacy node version and its operation slot', () => {
		const actions = derive(base)?.actions ?? [];
		const module = generateNodeModule('base', actions.map(toGeneratedAction));
		expect(module).toContain(
			'contractStep("n8n-nodes-base.base", config, 2.1, {"operation":"create"})',
		);
		expect(module).toContain('/** create. Create a record (write, per-item) */');
		expect(module).toContain('export type BaseCreateOutput = { [key: string]: any };');
		expect(module).toContain('{ table?: { mode: "id"; value: Value<I, C, string> } }');
	});

	it('emits a node without resource and operation at its typeVersion', () => {
		const flat = { ...base, properties: base.properties.slice(1, 2) };
		const [action] = derive(flat)?.actions ?? [];
		if (!action) throw new Error('no action');
		expect(toGeneratedAction(action)).toMatchObject({
			nodeType: 'n8n-nodes-base.base',
			operation: 'execute',
			typeVersion: 2.1,
		});
		expect(toGeneratedAction(action)).not.toHaveProperty('slot');
	});
});

describe('readLegacyParameters', () => {
	const version = derive(base);
	const read = (parameters: Record<string, unknown>) => {
		if (!version) throw new Error('no version');
		return readLegacyParameters(version, base, parameters as never);
	};

	it('reads saved parameters as the input of the action that runs them', () => {
		const create = read({ operation: 'create', table: { __rl: true, mode: 'id', value: 't1' } });
		expect(create).toMatchObject({
			action: { contract: { id: 'base.create' } },
			input: { table: { mode: 'id', value: 't1' } },
		});
		expect(read({})).toMatchObject({ action: { contract: { id: 'base.create' } }, input: {} });
	});

	it('gives the reason when no derived action or input fits', () => {
		expect(read({ operation: 'search' })).toEqual({ reason: 'no derived action runs search' });
		expect(read({ operation: 'create', table: 'plain' })).toEqual({
			reason: expect.stringContaining('input.table'),
		});
	});
});
