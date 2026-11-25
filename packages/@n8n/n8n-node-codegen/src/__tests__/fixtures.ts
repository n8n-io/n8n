import type { ApiParameter, OperationRow, SpecOperation } from '../types';

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
