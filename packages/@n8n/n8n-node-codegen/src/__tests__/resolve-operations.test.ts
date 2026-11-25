import { resolveOperations } from '../resolve-operations';
import type { Spec, SpecOperation, SpecTag } from '../types';

const tag = (name: string, displayName = name): SpecTag => ({
	name,
	displayName,
	group: { name: 'BuildAndRun', displayName: 'Build and run' },
});

const operation = (operationId: string, overrides: Partial<SpecOperation> = {}): SpecOperation => ({
	operationId,
	summary: `Summary of ${operationId}`,
	method: 'GET',
	apiPath: `/${operationId}`,
	tag: tag('Workflow'),
	deprecated: false,
	paginated: false,
	emptyResponse: false,
	parameters: [],
	blockers: [],
	...overrides,
});

const spec = (...operations: SpecOperation[]): Spec => ({ operations });

describe('resolveOperations', () => {
	it('should give each operation the singular resource of its tag', () => {
		const { rows } = resolveOperations(
			spec(
				operation('getWorkflow', { tag: tag('Workflow', 'Workflows') }),
				operation('deleteExecution', { tag: tag('Executions') }),
				operation('getRateLimitSettings', {
					tag: tag('SettingsRateLimits', 'Settings Rate Limits'),
				}),
			),
			{},
		);

		expect(rows.map((row) => row.resource)).toEqual([
			{ id: 'workflow', displayName: 'Workflow' },
			{ id: 'execution', displayName: 'Execution' },
			{ id: 'settingsRateLimit', displayName: 'Settings Rate Limit' },
		]);
	});

	it('should report two tags in the node with the same resource', () => {
		const { errors } = resolveOperations(
			spec(
				operation('getExecution', { tag: tag('Execution') }),
				operation('deleteExecution', { tag: tag('Executions') }),
			),
			{ getExecution: { default: true } },
			'execution',
		);

		expect(errors).toEqual(['"execution" is the resource of 2 tags: Execution, Executions.']);
	});

	it('should set the exclude reason only on the operations in exclude', () => {
		const { rows, errors } = resolveOperations(
			spec(operation('getWorkflow'), operation('deleteWorkflow')),
			{ getWorkflow: { default: true }, deleteWorkflow: { exclude: 'Not reviewed yet' } },
			'workflow',
		);

		expect(rows.map((row) => row.excludeReason)).toEqual([undefined, 'Not reviewed yet']);
		expect(errors).toEqual([]);
	});

	it('should report an override for an operation that is not in the spec', () => {
		const { errors } = resolveOperations(
			spec(operation('getWorkflow')),
			{ getWorkflow: { default: true }, getWorkflw: { exclude: 'Not reviewed yet' } },
			'workflow',
		);

		expect(errors).toEqual([
			'overrides: "getWorkflw" is not an operation in the spec. The spec does not contain this operation any more, or the ID is not correct.',
		]);
	});

	it('should report an empty reason in exclude', () => {
		const { errors } = resolveOperations(spec(operation('getWorkflow')), {
			getWorkflow: { exclude: '  ' },
		});

		expect(errors).toEqual(['exclude: "getWorkflow" has no reason.']);
	});

	it('should report an operation with a blocker that is not in exclude', () => {
		const { errors } = resolveOperations(
			spec(operation('exportPackage', { blockers: ['application/gzip response'] })),
			{ exportPackage: { default: true } },
			'workflow',
		);

		expect(errors).toEqual([
			'"exportPackage" is not in exclude, but the generator cannot build it: application/gzip response. Add it to exclude with a reason, or add support to the generator.',
		]);
	});

	it('should accept an operation with a blocker that is in exclude', () => {
		const { errors } = resolveOperations(
			spec(operation('exportPackage', { blockers: ['application/gzip response'] })),
			{ exportPackage: { exclude: 'The generator cannot read a gzip response' } },
		);

		expect(errors).toEqual([]);
	});

	it('should report only a required parameter that has the name of a node field', () => {
		const resourceParameter = (required: boolean) => ({
			name: 'resource',
			location: 'query' as const,
			required,
			deprecated: false,
			schema: { type: 'string' },
		});
		const { errors } = resolveOperations(
			spec(
				operation('getCapabilities', { parameters: [resourceParameter(true)] }),
				operation('getDiscover', { parameters: [resourceParameter(false)] }),
			),
			{ getDiscover: { default: true } },
			'workflow',
		);

		expect(errors).toEqual([
			'"getCapabilities" is not in exclude, but the generator cannot build it: parameter name "resource". Add it to exclude with a reason, or add support to the generator.',
		]);
	});

	it('should replace a flattened list with the fields of one item, without read-only fields', () => {
		const relations = {
			name: 'relations',
			location: 'body' as const,
			required: true,
			deprecated: false,
			schema: {
				type: 'array',
				items: {
					type: 'object',
					required: ['userId'],
					properties: {
						id: { type: 'string', readOnly: true },
						userId: { type: 'string' },
						role: { type: 'string' },
					},
				},
			},
		};
		const { rows, errors } = resolveOperations(
			spec(operation('addUsersToProject', { parameters: [relations] })),
			{ addUsersToProject: { flatten: 'relations', default: true } },
			'workflow',
		);

		expect(errors).toEqual([]);
		expect(rows[0].operation.parameters).toEqual([
			{
				name: 'userId',
				location: 'body',
				property: 'relations[0].userId',
				required: true,
				deprecated: false,
				schema: { type: 'string' },
			},
			{
				name: 'role',
				location: 'body',
				property: 'relations[0].role',
				required: false,
				deprecated: false,
				schema: { type: 'string' },
			},
		]);
	});

	it('should report a flatten entry that the generator cannot apply', () => {
		const list = (name: string, location: 'body' | 'wholeBody' = 'body') => ({
			name,
			location,
			required: true,
			deprecated: false,
			schema: {
				type: 'array',
				items: { type: 'object', properties: { name: { type: 'string' } } },
			},
		});
		const name = { ...list('name'), schema: { type: 'string' } };
		const { errors } = resolveOperations(
			spec(
				operation('createUser', { parameters: [list('body', 'wholeBody')] }),
				operation('createTags', { parameters: [name, list('tags')] }),
			),
			{ createUser: { flatten: 'body', default: true }, createTags: { flatten: 'tags' } },
			'workflow',
		);

		expect(errors).toEqual([
			'flatten: "createUser" has no body field "body" that is a list of objects.',
			'flatten: "createTags" gets two fields with the name "name".',
		]);
	});

	it('should report two operations in the node with the same summary in one tag', () => {
		const { errors } = resolveOperations(
			spec(
				operation('activateWorkflow', { summary: 'Publish a workflow' }),
				operation('publishWorkflow', { summary: 'Publish a workflow' }),
			),
			{ publishWorkflow: { default: true } },
			'workflow',
		);

		expect(errors).toEqual([
			'"Workflow / Publish a workflow" is the name of 2 operations: activateWorkflow, publishWorkflow.',
		]);
	});

	it('should accept the same summary when one of the operations is deprecated', () => {
		const { errors } = resolveOperations(
			spec(
				operation('activateWorkflow', { summary: 'Publish a workflow', deprecated: true }),
				operation('publishWorkflow', { summary: 'Publish a workflow' }),
			),
			{ publishWorkflow: { default: true } },
			'workflow',
		);

		expect(errors).toEqual([]);
	});

	it('should accept the same summary when one of the operations is in exclude', () => {
		const { errors } = resolveOperations(
			spec(
				operation('activateWorkflow', { summary: 'Publish a workflow' }),
				operation('publishWorkflow', { summary: 'Publish a workflow' }),
			),
			{
				activateWorkflow: { exclude: 'Deprecated, use publishWorkflow' },
				publishWorkflow: { default: true },
			},
			'workflow',
		);

		expect(errors).toEqual([]);
	});

	it('should accept the same summary in two tags', () => {
		const { errors } = resolveOperations(
			spec(
				operation('getCredentialTypePolicyAttachments', {
					summary: 'Retrieve the attachments',
					tag: tag('CredentialTypePolicy'),
				}),
				operation('getNodeTypePolicyAttachments', {
					summary: 'Retrieve the attachments',
					tag: tag('NodeTypePolicy'),
				}),
			),
			{
				getCredentialTypePolicyAttachments: { default: true },
				getNodeTypePolicyAttachments: { default: true },
			},
			'credentialTypePolicy',
		);

		expect(errors).toEqual([]);
	});

	it('should mark only the operation with default: true as the default', () => {
		const { rows } = resolveOperations(spec(operation('getWorkflow'), operation('getWorkflows')), {
			getWorkflows: { default: true },
		});

		expect(rows.map((row) => row.isDefault)).toEqual([false, true]);
	});

	it('should report a missing default resource and each resource without one default operation', () => {
		const { errors } = resolveOperations(
			spec(
				operation('getWorkflow'),
				operation('getWorkflows'),
				operation('getTag', { tag: tag('Tag') }),
			),
			{ getWorkflow: { default: true }, getWorkflows: { default: true } },
		);

		expect(errors).toEqual([
			'defaultResource must be one of the resources in the node: workflow, tag.',
			'"workflow" needs one operation in the node with default: true. It has 2: getWorkflow, getWorkflows.',
			'"tag" needs one operation in the node with default: true. It has none.',
		]);
	});

	it('should need no defaults when the node has no operations', () => {
		const { errors } = resolveOperations(spec(operation('getWorkflow')), {
			getWorkflow: { exclude: 'Not reviewed yet' },
		});

		expect(errors).toEqual([]);
	});

	it('should give each operation the field from "*" and let the field of the operation replace it', () => {
		const locator = { type: 'resourceLocator' as const, default: { mode: 'list', value: '' } };
		const { rows, errors } = resolveOperations(
			spec(operation('getWorkflow'), operation('deleteWorkflow')),
			{
				'*': { fields: { workflowId: locator } },
				getWorkflow: { default: true },
				deleteWorkflow: { fields: { workflowId: { type: 'string' } } },
			},
			'workflow',
		);

		expect(errors).toEqual([]);
		expect(rows.map((row) => row.fields)).toEqual([
			{ workflowId: locator },
			{ workflowId: { type: 'string' } },
		]);
	});
});
