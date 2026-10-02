import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

import { validate } from '@n8n/node-sdk';
import { generateNodeModule } from '@n8n/node-sdk/codegen';

import {
	connectionsOf,
	deriveModuleVersion,
	readLegacyParameters,
	toGeneratedAction,
	toLegacyParameters,
} from '../../index';

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

	it('types an action whose fields depend on more than one selector as variants of the first', () => {
		const actions = derive(base)?.actions ?? [];
		expect(actions.map((action) => [action.contract.id, action.shape])).toEqual([
			['base.create', 'flat'],
			['base.search', 'multiSelector'],
		]);
		const module = generateNodeModule('base', actions.map(toGeneratedAction));
		// The variant of the default mode needs no tag, as n8n fills the default.
		expect(module).toContain(
			'{ mode?: "formula"; formula?: Value<I, C, string> } | { mode: "view" }',
		);
		expect(module).toContain('sortField?: Value<I, C, string>;');
		const search = actions[1];
		if (!search) throw new Error('no search action');
		expect(validate({ formula: 'x' }, search.contract.input)).toEqual([]);
		expect(validate({ mode: 'view', formula: 'x' }, search.contract.input)).toEqual([
			'input: unknown field(s) formula. Allowed: mode, table, sort, sortField',
		]);
	});

	it.each([
		['outputs that its parameters decide', { outputs: '={{ $parameter.outputs }}' }],
		['two main inputs', { inputs: ['main', 'main'] }],
		['main and provider outputs', { outputs: ['main', 'ai_tool'] }],
		['an input that no provider slot takes', { inputs: ['main', 'ai_chain'] }],
		['a name that is no identifier', { name: 'base-node' }],
		['a name that is a reserved word', { name: 'function' }],
	] as const)('derives no module for %s', (_case, change) => {
		expect(derive({ ...base, ...change } as INodeTypeDescription)).toBeUndefined();
	});
});

const flat = (change: Partial<INodeTypeDescription>): INodeTypeDescription => ({
	...base,
	version: 1,
	properties: [{ displayName: 'Text', name: 'text', type: 'string', default: '' }],
	...change,
});

const moduleOf = (description: INodeTypeDescription) =>
	generateNodeModule(description.name, (derive(description)?.actions ?? []).map(toGeneratedAction));

describe('connectionsOf', () => {
	it('reads triggers, providers, steps with named outputs, and provider inputs', () => {
		expect(connectionsOf(flat({ inputs: [], group: ['trigger'], polling: true }))).toEqual({
			kind: 'trigger',
			trigger: 'poll',
			providers: [],
		});
		expect(connectionsOf(flat({ inputs: [], outputs: ['ai_languageModel'] }))).toEqual({
			kind: 'provider',
			provides: 'ai_languageModel',
			providers: [],
		});
		expect(
			connectionsOf(flat({ outputs: ['main', 'main'], outputNames: ['true', 'false'] })),
		).toEqual({ kind: 'step', outputs: ['true', 'false'], providers: [] });
		expect(
			connectionsOf(
				flat({
					inputs: [
						'main',
						{ type: 'ai_languageModel', required: true, maxConnections: 1 },
						{ type: 'ai_memory', maxConnections: 1 },
						'ai_tool',
					],
				}),
			),
		).toEqual({
			kind: 'step',
			providers: [
				{ type: 'ai_languageModel', required: true, many: false },
				{ type: 'ai_memory', required: false, many: false },
				{ type: 'ai_tool', required: false, many: true },
			],
		});
	});

	it('reads the provider inputs of an inputs expression from builderHint, else from the expression', () => {
		const hinted = flat({
			inputs: '={{ ((p) => ["main", "ai_languageModel", "ai_outputParser"])($parameter) }}',
			builderHint: {
				inputs: {
					ai_languageModel: { required: true },
					ai_outputParser: { required: true, displayOptions: { show: { hasParser: [true] } } },
				},
			},
		});
		expect(connectionsOf(hinted)).toEqual({
			kind: 'step',
			providers: [
				{ type: 'ai_languageModel', required: true, many: false },
				{ type: 'ai_outputParser', required: false, many: false },
			],
		});
		expect(
			connectionsOf(flat({ inputs: "={{ ['main', { type: 'ai_tool' }] }}", group: ['trigger'] })),
		).toEqual({
			kind: 'trigger',
			trigger: 'event',
			providers: [{ type: 'ai_tool', required: false, many: true }],
		});
	});

	it('does not type a provider whose inputs come from an expression without builderHint', () => {
		const inputs =
			"={{ ((p) => Array.from({ length: p.numberInputs }, () => ({ type: 'ai_languageModel' })))($parameter) }}";
		expect(connectionsOf(flat({ inputs, outputs: ['ai_languageModel'] }))).toEqual({
			reason: 'its parameters decide its provider inputs',
		});
	});
});

describe('derived modules by node kind', () => {
	it('types a trigger with plain values that runs the legacy trigger', () => {
		const module = moduleOf(
			flat({ name: 'baseTrigger', inputs: [], group: ['trigger'], webhooks: [], polling: true }),
		);
		expect(module).toContain('export type BaseTriggerTriggerInput = { text?: string };');
		expect(module).toContain('): Trigger<OutputOf<N, BaseTriggerTriggerOutput>, N>');
		expect(module).toContain(
			'contractTrigger("n8n-nodes-base.baseTrigger", config, 1, undefined, {',
		);
		expect(module).toContain('(trigger, poll)');
	});

	it('types a provider by its connection type', () => {
		const module = moduleOf(flat({ name: 'chatModel', inputs: [], outputs: ['ai_languageModel'] }));
		expect(module).toContain('): Provider<In, Ctx, "ai_languageModel"> =>');
		expect(module).toContain(
			'contractProvider("n8n-nodes-base.chatModel", "ai_languageModel", config)',
		);
	});

	it('types the provider slots of a root node: required ones required, many as a list', () => {
		const module = moduleOf(
			flat({
				name: 'agent',
				inputs: [
					'main',
					{ type: 'ai_languageModel', required: true, maxConnections: 1 },
					{ type: 'ai_memory', maxConnections: 1 },
					'ai_tool',
				],
			}),
		);
		expect(module).toContain('providers: {');
		expect(module).toContain('model: Provider<NoInfer<I>, NoInfer<C>, "ai_languageModel">;');
		expect(module).toContain('memory?: Provider<NoInfer<I>, NoInfer<C>, "ai_memory">;');
		expect(module).toContain(
			'tools?: Array<Provider<NoInfer<I>, NoInfer<C>, "ai_tool" | "tool">>;',
		);
	});

	it('renames an input field that a config key holds, and reads it back', () => {
		const named = flat({
			properties: [{ displayName: 'Name', name: 'name', type: 'string', default: '' }],
		});
		expect(moduleOf(named)).toContain('{ nameField?: Value<I, C, string> }');
		const version = derive(named);
		if (!version) throw new Error('no version');
		const [action] = version.actions;
		if (!action) throw new Error('no action');
		expect(toLegacyParameters(action.compile, { nameField: 'Acme' })).toEqual({ name: 'Acme' });
		expect(readLegacyParameters(version, named, { name: 'Acme' })).toMatchObject({
			input: { nameField: 'Acme' },
		});
	});

	it('types the named outputs of a step as a routed step', () => {
		const module = moduleOf(
			flat({ name: 'check', outputs: ['main', 'main'], outputNames: ['valid', 'invalid'] }),
		);
		expect(module).toContain(
			'): RoutedStep<In, Ctx, OutputOf<N, CheckExecuteOutput>, N, "valid" | "invalid"> =>',
		);
		expect(module).toContain('routedStep("n8n-nodes-base.check", config, ["valid","invalid"])');
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
		expect(read({ operation: 'search', mode: 'view', sort: true, sortField: 'f' })).toMatchObject({
			action: { contract: { id: 'base.search' } },
			input: { mode: 'view', sort: true, sortField: 'f' },
		});
	});

	it('gives the reason when no derived action or input fits', () => {
		expect(read({ operation: 'update' })).toEqual({ reason: 'no derived action runs update' });
		expect(read({ operation: 'create', table: 'plain' })).toEqual({
			reason: expect.stringContaining('input.table'),
		});
	});
});
