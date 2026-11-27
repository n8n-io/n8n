import { buildProperties } from '../build-properties';
import { compareOperations, findBreakingChanges, loadProperties } from '../contract';
import { N8N_NODE_CONFIG } from '../n8n-node.config';
import type { OperationRow } from '../types';
import {
	asDefault,
	getTag,
	getWorkflow,
	levels,
	locator,
	nodes,
	optional,
	required,
	row,
	workflowId,
} from './fixtures';

const node = (rows: OperationRow[], defaultResource = 'workflow') =>
	buildProperties(rows, N8N_NODE_CONFIG.spec, defaultResource);

interface Case {
	when: string;
	base: OperationRow[];
	current: OperationRow[];
	expected?: string[];
}

describe('findBreakingChanges', () => {
	it.each<Case>([
		{
			when: 'an operation is gone',
			base: [row('deleteWorkflow'), getWorkflow()],
			current: [row('deleteWorkflow')],
			expected: ['workflow / getWorkflow: the operation is gone.'],
		},
		{
			when: 'the node has no operations left',
			base: [getWorkflow()],
			current: [],
			expected: ['workflow / getWorkflow: the operation is gone.'],
		},
		{
			when: 'the default operation is gone',
			base: [asDefault(getWorkflow()), row('getWorkflows')],
			current: [asDefault(row('getWorkflows'))],
			expected: ['workflow / getWorkflow: the operation is gone.'],
		},
		{
			when: 'a field is gone',
			base: [getWorkflow([optional('status')])],
			current: [getWorkflow()],
			expected: ['workflow / getWorkflow: the field "status" is gone.'],
		},
		{
			when: 'a required parameter is added',
			base: [getWorkflow()],
			current: [getWorkflow([required('status')])],
			expected: ['workflow / getWorkflow: the field "status" is new at the top level.'],
		},
		{
			when: 'a required parameter becomes optional',
			base: [getWorkflow([required('status')])],
			current: [getWorkflow([optional('status')])],
			expected: ['workflow / getWorkflow: the field "status" moved from the top level to Options.'],
		},
		{
			when: 'an optional parameter becomes required',
			base: [getWorkflow([optional('status')])],
			current: [getWorkflow([required('status')])],
			expected: ['workflow / getWorkflow: the field "status" moved from Options to the top level.'],
		},
		{
			when: 'the type of a parameter changes',
			base: [getWorkflow([required('limit')])],
			current: [getWorkflow([required('limit', { type: 'integer' })])],
			expected: [
				'workflow / getWorkflow: the field "limit" changed its type from string to number.',
			],
		},
		{
			when: 'the type of a field in Options changes',
			base: [getWorkflow([optional('count')])],
			current: [getWorkflow([optional('count', { type: 'integer' })])],
			expected: [
				'workflow / getWorkflow: the field "count" changed its type from string to number.',
			],
		},
		{
			when: 'a JSON parameter changes from an array to an object',
			base: [getWorkflow([nodes('array')])],
			current: [getWorkflow([nodes('object')])],
			expected: [
				'workflow / getWorkflow: the field "nodes" changed its type from json array to json object.',
			],
		},
		{
			when: 'the default of a required parameter changes',
			base: [getWorkflow([required('status', { default: 'active' })])],
			current: [getWorkflow([required('status', { default: 'all' })])],
			expected: [
				'workflow / getWorkflow: the field "status" changed its default from "active" to "all". To keep the old default, set getWorkflow.fields.status.default in overrides.ts. For a field from "*", copy the whole field there.',
			],
		},
		{
			when: 'an enum value is gone',
			base: [getWorkflow([required('status', { enum: ['active', 'archived'] })])],
			current: [getWorkflow([required('status', { enum: ['active'] })])],
			expected: ['workflow / getWorkflow: the field "status" lost the values "archived".'],
		},
		{
			when: 'an enum value in Options is gone',
			base: [getWorkflow([optional('status', { enum: ['active', 'archived'] })])],
			current: [getWorkflow([optional('status', { enum: ['active'] })])],
			expected: ['workflow / getWorkflow: the field "status" lost the values "archived".'],
		},
		{
			when: 'an option value changes from a number to a string',
			base: [getWorkflow([optional('level')], levels(1, 2))],
			current: [getWorkflow([optional('level')], levels('1', '2'))],
			expected: ['workflow / getWorkflow: the field "level" lost the values 1, 2.'],
		},
		{
			when: 'a resource locator mode is gone',
			base: [getWorkflow([workflowId], locator('list', 'url', 'id'))],
			current: [getWorkflow([workflowId], locator('url', 'id'))],
			expected: ['workflow / getWorkflow: the field "workflowId" lost the values "list".'],
		},
		{
			when: 'the response becomes empty',
			base: [row('deleteWorkflow')],
			current: [row('deleteWorkflow', { emptyResponse: true })],
			expected: ['workflow / deleteWorkflow: the response format changed.'],
		},
		{
			when: 'an operation gets pagination',
			base: [row('getWorkflows')],
			current: [row('getWorkflows', { paginated: true })],
			expected: [
				'workflow / getWorkflows: the response format changed.',
				'workflow / getWorkflows: the field "returnAll" is new at the top level.',
			],
		},
		{
			when: 'default: true moves to another operation',
			base: [asDefault(getWorkflow()), row('getWorkflows')],
			current: [getWorkflow(), asDefault(row('getWorkflows'))],
			expected: [
				'workflow: the default operation changed from "getWorkflow" to "getWorkflows". To keep the old default, move default: true back to getWorkflow in overrides.ts.',
			],
		},
	])('should report the breaking changes when $when', ({ base, current, expected }) => {
		expect(findBreakingChanges(node(base), node(current))).toEqual(expected);
	});

	it('should report the breaking change when the default resource changes', () => {
		const rows = [getWorkflow(), getTag];

		expect(findBreakingChanges(node(rows, 'workflow'), node(rows, 'tag'))).toEqual([
			'The default resource changed from "workflow" to "tag". To keep the old default, set defaultResource back to "workflow" in overrides.ts.',
		]);
	});

	it('should report only the gone operations when the default resource is gone', () => {
		const base = node([getWorkflow(), getTag], 'tag');
		const current = node([getWorkflow()], 'workflow');

		expect(findBreakingChanges(base, current)).toEqual(['tag / getTag: the operation is gone.']);
	});

	it('should report nothing when the base operation has no default', () => {
		const base = node([getWorkflow()]).map((property) =>
			property.name === 'operation' ? { ...property, default: null } : property,
		);

		expect(findBreakingChanges(base, node([getWorkflow()]))).toEqual([]);
	});

	it.each<Case>([
		{
			when: 'nothing changes',
			base: [getWorkflow([required('status')])],
			current: [getWorkflow([required('status')])],
		},
		{
			when: 'the base has no operations',
			base: [],
			current: [getWorkflow()],
		},
		{
			when: 'an optional parameter is added',
			base: [getWorkflow()],
			current: [getWorkflow([optional('status')])],
		},
		{
			when: 'an enum value is added',
			base: [getWorkflow([required('status', { enum: ['active'] })])],
			current: [getWorkflow([required('status', { enum: ['active', 'archived'] })])],
		},
		{
			when: 'an operation is added',
			base: [getWorkflow()],
			current: [getWorkflow(), row('updateWorkflow')],
		},
		{
			when: 'a resource is added',
			base: [getWorkflow()],
			current: [getWorkflow(), getTag],
		},
		{
			when: 'the default of an optional parameter changes',
			base: [getWorkflow([optional('status', { default: 'active' })])],
			current: [getWorkflow([optional('status', { default: 'all' })])],
		},
		{
			when: 'a fields override keeps the old default',
			base: [getWorkflow([required('status', { default: 'active' })])],
			current: [
				getWorkflow([required('status', { default: 'all' })], { status: { default: 'active' } }),
			],
		},
	])('should report nothing when $when', ({ base, current }) => {
		expect(findBreakingChanges(node(base), node(current))).toEqual([]);
	});
});

describe('compareOperations', () => {
	it('should list the added and the removed operations when the operations differ', () => {
		const committed = node([row('deleteWorkflow'), getWorkflow()]);
		const current = node([row('archiveWorkflow'), getWorkflow(), getTag]);

		expect(compareOperations(committed, current)).toEqual({
			added: ['workflow / archiveWorkflow', 'tag / getTag'],
			removed: ['workflow / deleteWorkflow'],
		});
	});

	it('should list nothing when both nodes have the same operations', () => {
		const current = node([getWorkflow()]);

		expect(compareOperations(current, current)).toEqual({ added: [], removed: [] });
	});
});

describe('loadProperties', () => {
	it('should read the operations from the committed node file', async () => {
		const committed = await loadProperties(N8N_NODE_CONFIG.outputFile);

		expect(compareOperations([], committed).added).toContain('workflow / getWorkflows');
	});
});
