import type { INodeListSearchResult, INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import {
	collectMethods,
	param,
	type Overrides,
} from 'n8n-nodes-base/nodes/N8n/v2/define-overrides';
import { buildProperties, checkMethodNames } from './build';
import { diffContracts, emptyContract, resolveOperations, toContract } from './contract';
import { operationName, resourceName } from './naming';
import type { Contract, SpecOperation } from './types';

const retryOperation = (pathParam = 'executionId', bodyRequired = false): SpecOperation => ({
	operationId: 'retryExecution',
	tag: 'Executions',
	method: 'POST',
	apiPath: `/executions/{${pathParam}}/retry`,
	summary: 'Retry an execution',
	description: 'Retry an execution.',
	emptyResponse: false,
	paginated: false,
	parameters: [
		{
			wire: `path:${pathParam}`,
			name: pathParam,
			location: 'path',
			required: true,
			schema: { type: 'string' },
		},
		{
			wire: 'body:loadWorkflow',
			name: 'loadWorkflow',
			location: 'body',
			required: bodyRequired,
			schema: { type: 'boolean' },
		},
	],
});

const addUsersOperation = (): SpecOperation => ({
	operationId: 'addUsersToProject',
	tag: 'Projects',
	method: 'POST',
	apiPath: '/projects/{projectId}/users',
	summary: 'Add users',
	description: 'Add users.',
	emptyResponse: true,
	paginated: false,
	parameters: [
		{
			wire: 'path:projectId',
			name: 'projectId',
			location: 'path',
			required: true,
			schema: { type: 'string' },
		},
		{
			wire: 'body:relations',
			name: 'relations',
			location: 'body',
			required: true,
			schema: {
				type: 'array',
				items: {
					type: 'object',
					properties: { userId: { type: 'string' }, role: { type: 'string' } },
					required: ['userId', 'role'],
				},
			},
		},
	],
});

async function getRoles(): Promise<INodePropertyOptions[]> {
	return [];
}

function generate(
	operations: SpecOperation[],
	config: Overrides = {},
	previous: Contract = emptyContract(),
) {
	const { resolved, pending, excluded, errors } = resolveOperations(operations, config, previous);
	const { properties, details } = buildProperties(resolved, config);
	return { errors, properties, pending, contract: toContract(resolved, excluded, details) };
}

const field = (properties: INodeProperties[], name: string) =>
	properties.find((p) => p.name === name);
const operationOption = (properties: INodeProperties[]) =>
	field(properties, 'operation')?.options?.[0] as INodePropertyOptions;

describe('n8n node codegen', () => {
	describe('naming', () => {
		it.each([
			['Executions', 'execution'],
			['Tags', 'tag'],
			['DataTable', 'dataTable'],
			['SettingsLdap', 'settingsLdap'],
		])('turns tag %s into resource %s', (tag, resource) => {
			expect(resourceName(tag)).toBe(resource);
		});

		it.each([
			['getExecutions', 'execution', true, 'getAll'],
			['getAllRoles', 'role', false, 'getAll'],
			['getTag', 'tag', false, 'get'],
			['retryExecution', 'execution', false, 'retry'],
			['addUsersToProject', 'project', false, 'addUsers'],
			['changeUserRoleInProject', 'project', false, 'changeUserRole'],
		])('turns %s into operation %s:%s', (operationId, resource, paginated, operation) => {
			expect(operationName(operationId, resource, paginated)).toBe(operation);
		});
	});

	describe('contract', () => {
		it('records a new operation with default names, placement, format and default', () => {
			const { contract, errors } = generate([retryOperation()]);

			expect(errors).toEqual([]);
			expect(contract.operations['execution:retry']).toEqual({
				api: 'retryExecution',
				params: {
					executionId: { api: 'path:executionId', placement: 'root', shape: 'string', default: '' },
					loadWorkflow: {
						api: 'body:loadWorkflow',
						placement: 'additionalFields',
						shape: 'boolean',
						default: false,
					},
				},
			});
		});

		it('keeps the remembered placement when the API makes a field required', () => {
			const { contract: released } = generate([retryOperation()]);

			const { properties } = generate([retryOperation('executionId', true)], {}, released);

			expect(field(properties, 'loadWorkflow')).toBeUndefined();
			expect(field(properties, 'additionalFields')?.options?.map((o) => o.name)).toEqual([
				'loadWorkflow',
			]);
		});
	});

	describe('comparison with a released contract', () => {
		it('reports a renamed API parameter as breaking and suggests the config change', () => {
			const { contract: released } = generate([retryOperation()]);
			const { contract } = generate([retryOperation('id')], {}, released);

			const { breaking } = diffContracts(released, contract);

			expect(breaking).toEqual([
				"execution:retry: parameter \"executionId\" was removed. If the API renamed it, add to packages/nodes-base/nodes/N8n/v2/overrides.ts: operations: { 'execution:retry': { params: { executionId: { api: 'path:id' } } } }.",
			]);
		});

		it('keeps the node parameter name when the config maps it to the new API name', () => {
			const { contract: released } = generate([retryOperation()]);
			const config: Overrides = {
				operations: { 'execution:retry': { params: { executionId: { api: 'path:id' } } } },
			};

			const { contract, properties, errors } = generate([retryOperation('id')], config, released);

			expect(errors).toEqual([]);
			expect(diffContracts(released, contract)).toEqual({
				changes: ['~ execution:retry: parameter "executionId" now reads path:id'],
				breaking: [],
			});
			expect(operationOption(properties).routing?.request?.url).toBe(
				'=/executions/{{ toPathSegment($parameter["executionId"]) }}/retry',
			);
		});

		it('reports a change of the stored format', () => {
			const { contract: released } = generate([retryOperation()]);
			const config: Overrides = {
				rules: [
					{
						api: 'path:executionId',
						use: param({ type: 'resourceLocator', default: { mode: 'id', value: '' }, modes: [] }),
					},
				],
			};

			const { contract } = generate([retryOperation()], config, released);

			expect(diffContracts(released, contract).breaking).toContainEqual(
				'execution:retry: parameter "executionId" changes its stored format from "string" to "rl".',
			);
		});

		it('reports a change of the default value', () => {
			const { contract: released } = generate([retryOperation()]);
			const config: Overrides = {
				rules: [{ api: 'body:loadWorkflow', use: param({ default: true }) }],
			};

			const { contract } = generate([retryOperation()], config, released);

			expect(diffContracts(released, contract).breaking).toEqual([
				'execution:retry: parameter "loadWorkflow" changes its default from false to true. Workflows that kept the default do not store a value.',
			]);
		});

		it('lists a new operation and reports a removed one as breaking', () => {
			const { contract: released } = generate([retryOperation()]);
			const { contract } = generate([addUsersOperation()], {}, released);

			const { changes, breaking } = diffContracts(released, contract);

			expect(changes).toEqual(['+ project:addUsers (addUsersToProject)']);
			expect(breaking).toEqual([
				"execution:retry: operation was removed. If the API renamed \"retryExecution\", add to packages/nodes-base/nodes/N8n/v2/overrides.ts: operations: { 'execution:retry': { api: '<new operationId>' } }.",
			]);
		});
	});

	describe('config', () => {
		it('excludes an operation', () => {
			const { contract } = generate([retryOperation()], {
				exclude: { retryExecution: 'not needed' },
			});

			expect(contract).toEqual({ operations: {}, excluded: { retryExecution: 'not needed' } });
		});

		it('reports an unknown operation with a suggestion', () => {
			const { errors } = generate([retryOperation()], {
				operations: { 'execution:rety': { displayName: 'Retry' } },
			});

			expect(errors).toEqual([
				'packages/nodes-base/nodes/N8n/v2/overrides.ts: "operations" names the node operation "execution:rety", which does not exist. Did you mean "execution:retry"?',
			]);
		});

		it('reports an unknown excluded API operation with a suggestion', () => {
			const { errors } = generate([retryOperation()], { exclude: { retryExecutions: 'typo' } });

			expect(errors).toEqual([
				'packages/nodes-base/nodes/N8n/v2/overrides.ts: "exclude" names the API operation "retryExecutions", which is not in the spec. Did you mean "retryExecution"?',
			]);
		});

		it('names an operation and flattens a list into fields for one item', () => {
			const config: Overrides = {
				operations: {
					'project:addUser': {
						api: 'addUsersToProject',
						displayName: 'Add User',
						flatten: 'relations',
					},
				},
			};

			const { properties, errors } = generate([addUsersOperation()], config);

			expect(errors).toEqual([]);
			expect(operationOption(properties).name).toBe('Add User');
			expect(field(properties, 'relations')).toBeUndefined();
			expect(field(properties, 'userId')?.routing?.send).toEqual({
				type: 'body',
				property: 'relations',
				value: '={{ [{ "userId": $parameter["userId"], "role": $parameter["role"] }] }}',
			});
		});

		it('references a load options method by the function and registers it', () => {
			const config: Overrides = {
				rules: [
					{
						api: 'body:role',
						resource: 'project',
						use: param({ type: 'options' }, { loadOptions: getRoles }),
					},
				],
				operations: { 'project:addUser': { api: 'addUsersToProject', flatten: 'relations' } },
			};

			const { properties } = generate([addUsersOperation()], config);

			expect(field(properties, 'role')?.typeOptions?.loadOptionsMethod).toBe('getRoles');
			expect(collectMethods(config).loadOptions).toEqual({ getRoles });
		});

		it('reports a search list method that the config does not pass as a function', () => {
			const config: Overrides = {
				rules: [
					{
						api: 'path:executionId',
						use: param({
							type: 'resourceLocator',
							modes: [
								{
									displayName: 'List',
									name: 'list',
									type: 'list',
									typeOptions: { searchListMethod: 'searchExecutions' },
								},
							],
						}),
					},
				],
			};

			expect(checkMethodNames(config)).toEqual([
				'packages/nodes-base/nodes/N8n/v2/overrides.ts: a template uses searchListMethod "searchExecutions". Pass that function as { listSearch: searchExecutions } to param().',
			]);
		});
	});

	describe('labels and expressions', () => {
		it('changes a parameter label without changing the contract', () => {
			const { contract: released } = generate([retryOperation()]);
			const overrides: Overrides = {
				operations: {
					'execution:retry': {
						displayName: 'Run Again',
						params: { executionId: { use: param({ displayName: 'Execution' }) } },
					},
				},
			};

			const { properties, contract } = generate([retryOperation()], overrides, released);

			expect(operationOption(properties).name).toBe('Run Again');
			expect(field(properties, 'executionId')?.displayName).toBe('Execution');
			expect(diffContracts(released, contract)).toEqual({ changes: [], breaking: [] });
		});

		it('blocks expressions without changing the contract', () => {
			const { contract: released } = generate([retryOperation()]);
			const overrides: Overrides = {
				operations: {
					'execution:retry': {
						params: { executionId: { use: param({ noDataExpression: true }) } },
					},
				},
			};

			const { properties, contract } = generate([retryOperation()], overrides, released);

			expect(field(properties, 'executionId')?.noDataExpression).toBe(true);
			expect(diffContracts(released, contract)).toEqual({ changes: [], breaking: [] });
		});
	});

	describe('include', () => {
		it('generates only the included resources and lists the rest as pending', () => {
			const { contract, pending } = generate([retryOperation(), addUsersOperation()], {
				include: ['execution'],
			});

			expect(Object.keys(contract.operations)).toEqual(['execution:retry']);
			expect(pending.map((op) => op.key)).toEqual(['project:addUsers']);
		});

		it('accepts a single node operation', () => {
			const { contract } = generate([retryOperation(), addUsersOperation()], {
				include: ['project:addUsers'],
			});

			expect(Object.keys(contract.operations)).toEqual(['project:addUsers']);
		});

		it('accepts overrides for an operation that is not included yet', () => {
			const { errors } = generate([retryOperation(), addUsersOperation()], {
				include: ['execution'],
				operations: { 'project:addUser': { api: 'addUsersToProject', flatten: 'relations' } },
			});

			expect(errors).toEqual([]);
		});

		it('reports an unknown entry with a suggestion', () => {
			const { errors } = generate([retryOperation()], { include: ['executions'] });

			expect(errors).toEqual([
				'packages/nodes-base/nodes/N8n/v2/overrides.ts: "include" names "executions", which is neither a resource nor a node operation. Did you mean "execution"?',
			]);
		});
	});

	describe('method names', () => {
		it('reports an unnamed load options function', () => {
			const overrides: Overrides = {
				rules: [
					{ api: 'body:role', use: param({ type: 'options' }, { loadOptions: async () => [] }) },
				],
			};

			expect(checkMethodNames(overrides)).toEqual([
				'packages/nodes-base/nodes/N8n/v2/overrides.ts: a template passes an unnamed loadOptions function. Export a named function from methods.ts and pass it.',
			]);
		});

		it('reports two different load options functions with the same name', () => {
			const first = { getRoles };
			const second = {
				async getRoles(): Promise<INodePropertyOptions[]> {
					return [];
				},
			};
			const overrides: Overrides = {
				rules: [
					{ api: 'body:role', use: param({ type: 'options' }, { loadOptions: first.getRoles }) },
					{
						api: 'body:otherRole',
						use: param({ type: 'options' }, { loadOptions: second.getRoles }),
					},
				],
			};

			expect(checkMethodNames(overrides)).toEqual([
				'packages/nodes-base/nodes/N8n/v2/overrides.ts: two different loadOptions functions are named "getRoles". The node registers methods by name, so give each function its own name.',
			]);
		});

		it('accepts the same function in two templates', () => {
			const overrides: Overrides = {
				rules: [
					{ api: 'body:role', use: param({ type: 'options' }, { loadOptions: getRoles }) },
					{ api: 'body:otherRole', use: param({ type: 'options' }, { loadOptions: getRoles }) },
				],
			};

			expect(checkMethodNames(overrides)).toEqual([]);
		});

		it('accepts a load options and a list search function with the same name', () => {
			const loader = {
				async sameName(): Promise<INodePropertyOptions[]> {
					return [];
				},
			};
			const search = {
				async sameName(): Promise<INodeListSearchResult> {
					return { results: [] };
				},
			};
			const overrides: Overrides = {
				rules: [
					{ api: 'body:role', use: param({ type: 'options' }, { loadOptions: loader.sameName }) },
					{
						api: 'path:workflowId',
						use: param({ type: 'resourceLocator' }, { listSearch: search.sameName }),
					},
				],
			};

			expect(checkMethodNames(overrides)).toEqual([]);
		});
	});

	describe('generic rules', () => {
		it('outputs success for an empty response', () => {
			const { properties } = generate([addUsersOperation()]);

			expect(operationOption(properties).routing?.output?.postReceive).toEqual([
				{ type: 'set', properties: { value: '={{ { "success": true } }}' } },
			]);
		});

		it('renders a list of flat objects as a fixed collection', () => {
			const { properties } = generate([addUsersOperation()]);

			const relations = field(properties, 'relations');
			expect(relations?.type).toBe('fixedCollection');
			expect(relations?.routing?.send).toEqual({
				type: 'body',
				property: 'relations',
				value: '={{ $value.values ?? [] }}',
			});
		});
	});
});
