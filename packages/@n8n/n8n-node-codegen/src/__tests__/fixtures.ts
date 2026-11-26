import type { ApiParameter, OperationRow, Schema, SpecOperation } from '../types';

export const parameter = (name: string, overrides: Partial<ApiParameter> = {}): ApiParameter => ({
	name,
	location: 'query',
	required: false,
	deprecated: false,
	schema: { type: 'string' },
	...overrides,
});

export const row = (
	operationId: string,
	overrides: Partial<SpecOperation> = {},
	fields: OperationRow['fields'] = {},
): OperationRow => ({
	resource: { id: 'workflow', displayName: 'Workflow' },
	isDefault: false,
	fields,
	operation: {
		operationId,
		summary: `Summary of ${operationId}`,
		method: 'GET',
		apiPath: '/workflows',
		tag: {
			name: 'Workflow',
			displayName: 'Workflows',
			group: { name: 'BuildAndRun', displayName: 'Build and run' },
		},
		deprecated: false,
		paginated: false,
		emptyResponse: false,
		parameters: [],
		blockers: [],
		...overrides,
	},
});

export const required = (name: string, schema: Schema = {}) =>
	parameter(name, { required: true, schema: { type: 'string', ...schema } });

export const optional = (name: string, schema: Schema = {}) =>
	parameter(name, { schema: { type: 'string', ...schema } });

export const workflowId = parameter('workflowId', { location: 'path', required: true });

export const nodes = (type: 'array' | 'object') =>
	parameter('nodes', { location: 'body', required: true, schema: { type } });

export const locator = (...modes: string[]): OperationRow['fields'] => ({
	workflowId: {
		type: 'resourceLocator',
		default: { mode: 'id', value: '' },
		modes: modes.map((name) => ({ displayName: name, name, type: 'string' })),
	},
});

export const levels = (...values: Array<string | number>): OperationRow['fields'] => ({
	level: {
		type: 'options',
		default: values[0],
		options: values.map((value) => ({ name: String(value), value })),
	},
});

export const getWorkflow = (parameters: ApiParameter[] = [], fields: OperationRow['fields'] = {}) =>
	row('getWorkflow', { apiPath: '/workflows/{workflowId}', parameters }, fields);

export const getTag: OperationRow = {
	...row('getTag'),
	resource: { id: 'tag', displayName: 'Tag' },
};

export const asDefault = (operation: OperationRow): OperationRow => ({
	...operation,
	isDefault: true,
});
