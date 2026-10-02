import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../zod-class';

const paginationNumber = z
	.string()
	.regex(/^\d+$/, 'Must be an integer string')
	.transform((value) => parseInt(value, 10));

const listQueryPaginationSchema = {
	take: paginationNumber.transform((value) => Math.min(value, 100)).optional(),
	skip: paginationNumber.optional(),
};

const workflowFilter = z.object({
	ids: z
		.array(z.string())
		.max(50)
		.refine((ids) => new Set(ids).size === ids.length)
		.optional(),
	query: z.string().optional(),
	active: z.boolean().optional(),
	isArchived: z.boolean().optional(),
	tags: z.array(z.string()).optional(),
	projectId: z.string().optional(),
	parentFolderId: z.string().optional(),
	availableInMCP: z.boolean().optional(),
	nodeTypes: z.array(z.string()).optional(),
	triggerNodeTypes: z.array(z.string()).optional(),
	includeCallableSubworkflows: z.boolean().optional(),
	parentWorkflowId: z.string().optional(),
});

const credentialFilter = z.object({
	name: z.string().optional(),
	type: z.string().optional(),
	projectId: z.string().optional(),
});

function parsedFilter<T extends z.ZodTypeAny>(schema: T) {
	return z
		.string()
		.optional()
		.transform((value, ctx) => {
			if (!value) return undefined;
			let parsed: unknown;
			try {
				parsed = jsonParse(value);
			} catch {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid filter format' });
				return z.NEVER;
			}
			const result = schema.safeParse(parsed);
			if (result.success) return Object.keys(result.data).length ? result.data : undefined;
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid filter fields' });
			return z.NEVER;
		});
}

function parsedSelect(fields: readonly string[]) {
	return z
		.string()
		.optional()
		.transform((value, ctx) => {
			if (!value) return undefined;
			let parsed: unknown;
			try {
				parsed = jsonParse(value);
			} catch {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid select format' });
				return z.NEVER;
			}
			const result = z.array(z.string()).safeParse(parsed);
			if (!result.success) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid select fields' });
				return z.NEVER;
			}
			const select = Object.fromEntries(
				result.data
					.filter((field) => fields.includes(field))
					.map((field) => [field, true as const]),
			);
			return Object.keys(select).length ? select : undefined;
		});
}

const workflowListQuerySchema = {
	...listQueryPaginationSchema,
	filter: parsedFilter(workflowFilter),
	select: parsedSelect([
		'id',
		'name',
		'active',
		'activeVersionId',
		'tags',
		'createdAt',
		'updatedAt',
		'versionId',
		'ownedBy',
		'parentFolder',
		'nodes',
		'isArchived',
		'description',
	]),
	sortBy: z
		.string()
		.refine((value) => {
			const [column, direction] = value.split(':');
			return (
				['name', 'createdAt', 'updatedAt'].includes(column) && ['asc', 'desc'].includes(direction)
			);
		}, 'Invalid value for sortBy parameter')
		.optional(),
};

export const credentialsListQuerySchema = {
	...listQueryPaginationSchema,
	filter: parsedFilter(credentialFilter),
	select: parsedSelect(['id', 'name', 'description', 'type']),
};

export class WorkflowListQueryDto extends Z.class({
	...workflowListQuerySchema,
	includeScopes: z.string().optional(),
	includeFolders: z.string().optional(),
	onlySharedWithMe: z.string().optional(),
}) {}

export class McpWorkflowsListQueryDto extends Z.class(workflowListQuerySchema) {}

export class TestRunsListQueryDto extends Z.class(workflowListQuerySchema) {}
