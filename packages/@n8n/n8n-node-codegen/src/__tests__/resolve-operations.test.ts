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
			{ exclude: {} },
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
			{ exclude: {} },
		);

		expect(errors).toEqual(['"execution" is the resource of 2 tags: Execution, Executions.']);
	});

	it('should set the exclude reason only on the operations in exclude', () => {
		const { rows, errors } = resolveOperations(
			spec(operation('getWorkflow'), operation('deleteWorkflow')),
			{ exclude: { deleteWorkflow: 'Not reviewed yet' } },
		);

		expect(rows.map((row) => row.excludeReason)).toEqual([undefined, 'Not reviewed yet']);
		expect(errors).toEqual([]);
	});

	it('should report an operation in exclude that is not in the spec', () => {
		const { errors } = resolveOperations(spec(operation('getWorkflow')), {
			exclude: { getWorkflw: 'Not reviewed yet' },
		});

		expect(errors).toEqual([
			'exclude: "getWorkflw" is not an operation in the spec. The spec does not contain this operation any more, or the ID is not correct.',
		]);
	});

	it('should report an empty reason in exclude', () => {
		const { errors } = resolveOperations(spec(operation('getWorkflow')), {
			exclude: { getWorkflow: '  ' },
		});

		expect(errors).toEqual(['exclude: "getWorkflow" has no reason.']);
	});

	it('should report an operation with a blocker that is not in exclude', () => {
		const { errors } = resolveOperations(
			spec(operation('exportPackage', { blockers: ['application/gzip response'] })),
			{ exclude: {} },
		);

		expect(errors).toEqual([
			'"exportPackage" is not in exclude, but the generator cannot build it: application/gzip response. Add it to exclude with a reason, or add support to the generator.',
		]);
	});

	it('should accept an operation with a blocker that is in exclude', () => {
		const { errors } = resolveOperations(
			spec(operation('exportPackage', { blockers: ['application/gzip response'] })),
			{ exclude: { exportPackage: 'The generator cannot read a gzip response' } },
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
			{ exclude: {} },
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
			{ exclude: {}, flatten: { addUsersToProject: 'relations' } },
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
			{
				exclude: {},
				flatten: { createUser: 'body', createTags: 'tags', getTag: 'tags' },
			},
		);

		expect(errors).toEqual([
			'flatten: "createUser" has no body field "body" that is a list of objects.',
			'flatten: "createTags" gets two fields with the name "name".',
			'flatten: "getTag" is not an operation in the spec.',
		]);
	});

	it('should report two operations in the node with the same summary in one tag', () => {
		const { errors } = resolveOperations(
			spec(
				operation('activateWorkflow', { summary: 'Publish a workflow' }),
				operation('publishWorkflow', { summary: 'Publish a workflow' }),
			),
			{ exclude: {} },
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
			{ exclude: {} },
		);

		expect(errors).toEqual([]);
	});

	it('should accept the same summary when one of the operations is in exclude', () => {
		const { errors } = resolveOperations(
			spec(
				operation('activateWorkflow', { summary: 'Publish a workflow' }),
				operation('publishWorkflow', { summary: 'Publish a workflow' }),
			),
			{ exclude: { activateWorkflow: 'Deprecated, use publishWorkflow' } },
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
			{ exclude: {} },
		);

		expect(errors).toEqual([]);
	});
});
