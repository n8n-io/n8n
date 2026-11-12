/**
 * What uses a workflow, credential or data table, and what a workflow uses, read from the
 * workflow dependency index. An agent calls it before it archives, unpublishes or changes a
 * resource that other workflows can depend on.
 *
 * Like `get_node_usage`, this lists workflows that are not available in MCP: their names and
 * links are visible, and the agent must know about them to warn the user. The requested workflow
 * itself must be available in MCP, because its own list describes its content.
 */
import { DEPENDENCY_PUBLIC_TYPES } from '@n8n/api-types';
import type {
	DependencyPublicType,
	DependencyResourceType,
	DependencyVersion,
	ResolvedDependency,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { UserError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import z from 'zod';

import type { WorkflowDependencyQueryService } from '@/modules/workflow-index/workflow-dependency-query.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { createLimitSchema } from './schemas';
import { toolResult } from './tool-result.utils';
import { validateMcpWorkflow } from './workflow-validation.utils';

export const GET_DEPENDENCIES_TOOL_NAME = 'get_dependencies';

const MAX_RESULTS = 100;
const DEFAULT_LIMIT = 50;

const inputSchema = {
	resourceType: z
		.enum(['workflow', 'credential', 'dataTable'])
		.describe('The type of the resource to list dependencies for'),
	resourceId: z
		.string()
		.min(1)
		.describe(
			'The ID of the workflow, credential or data table. Get it from search_workflows, list_credentials or search_data_tables.',
		),
	limit: createLimitSchema(MAX_RESULTS),
	cursor: z
		.string()
		.min(1)
		.optional()
		.describe('The nextCursor value from the previous page. Omit it for the first page.'),
} satisfies z.ZodRawShape;

const dependencySchema = z.object({
	type: z
		.string()
		.describe(
			'How the item is linked to the requested resource. ' +
				'"credential", "dataTable", "subWorkflow", "errorWorkflow": the requested workflow uses the item. ' +
				'"parentWorkflow": the item is a workflow that uses the requested resource. ' +
				'"errorWorkflowParent": the item is a workflow that uses the requested workflow as its error workflow. ' +
				'"agent": the item is an agent that uses the requested resource. ' +
				'New values can be added later.',
		),
	id: z.string(),
	name: z.string(),
	projectId: z.string().optional().describe('The project that owns the item, when it is known'),
	versions: z
		.enum(['draft', 'published', 'both'])
		.optional()
		.describe(
			'Which version of the linking workflow holds the link: the draft, the published version, or both. ' +
				'The linking workflow is the requested workflow for "credential", "dataTable", "subWorkflow" and ' +
				'"errorWorkflow", and the item for "parentWorkflow" and "errorWorkflowParent". ' +
				'The published version is the one that runs in production.',
		),
	archived: z
		.literal(true)
		.optional()
		.describe('Set when the item is an archived workflow. An archived workflow does not run.'),
});

const outputSchema = {
	success: z.boolean(),
	resourceType: z.string(),
	resourceId: z.string(),
	dependencies: z.array(dependencySchema),
	nextCursor: z
		.string()
		.nullable()
		.describe('Pass it as cursor to get the next page. Null on the last page.'),
	inaccessibleCount: z
		.number()
		.int()
		.min(0)
		.describe('The number of linked items that the user cannot see. They are not listed.'),
	withheldCount: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe(
			'The number of linked credentials, data tables or agents that this session is not granted to read. They are not listed.',
		),
	error: z.string().optional(),
} satisfies z.ZodRawShape;

/** The output item, with `type` kept narrow inside the tool. The schema leaves it open for clients. */
type DependencyItem = Omit<z.infer<typeof dependencySchema>, 'type'> & {
	type: DependencyPublicType;
};
type GetDependenciesOutput = z.infer<z.ZodObject<typeof outputSchema>>;

type GetDependenciesParams = {
	resourceType: DependencyResourceType;
	resourceId: string;
	limit?: number;
	cursor?: string;
};

/**
 * What this session may read. A scoped OAuth token can carry `workflow:read` without the scopes
 * for credentials, data tables or agents, so the tool withholds those items, as the activity
 * tools do for credentials.
 */
export type GetDependenciesToolOptions = {
	credentialGranted: boolean;
	dataTableGranted: boolean;
	agentGranted: boolean;
};

class InvalidCursorError extends UserError {
	constructor() {
		super('The cursor is not valid. Omit it to start from the first page.');
	}
}

function encodeCursor(offset: number): string {
	return Buffer.from(JSON.stringify({ offset })).toString('base64url');
}

function decodeCursor(cursor: string | undefined): number {
	if (cursor === undefined) return 0;
	try {
		const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
		if (
			typeof decoded === 'object' &&
			decoded !== null &&
			'offset' in decoded &&
			typeof decoded.offset === 'number' &&
			Number.isInteger(decoded.offset) &&
			decoded.offset >= 0
		) {
			return decoded.offset;
		}
	} catch {
		// Fall through to the error below.
	}
	throw new InvalidCursorError();
}

function toVersionsLabel(versions: DependencyVersion[] | undefined): DependencyItem['versions'] {
	if (!versions || versions.length === 0) return undefined;
	if (versions.length > 1) return 'both';
	return versions[0];
}

export const createGetDependenciesTool = (
	user: User,
	workflowDependencyQueryService: WorkflowDependencyQueryService,
	workflowFinderService: WorkflowFinderService,
	telemetry: Telemetry,
	options: GetDependenciesToolOptions,
): ToolDefinition<typeof inputSchema> => {
	const isWithheld = (type: ResolvedDependency['type']) =>
		(type === 'credentialId' && !options.credentialGranted) ||
		(type === 'dataTableId' && !options.dataTableGranted) ||
		(type === 'agentUsage' && !options.agentGranted);

	const assertCanRead = async (resourceType: DependencyResourceType, resourceId: string) => {
		if (resourceType === 'workflow') {
			const workflow = await workflowFinderService.findWorkflowForUser(resourceId, user, [
				'workflow:read',
			]);
			// Archived workflows stay readable: "is it safe to delete?" is a question about them.
			validateMcpWorkflow(workflow, { allowArchived: true });
			return;
		}

		const granted =
			resourceType === 'credential' ? options.credentialGranted : options.dataTableGranted;
		const label = resourceType === 'credential' ? 'credential' : 'data table';
		if (!granted) {
			throw new UserError(`This session is not granted to read ${label}s.`);
		}
		if (!(await workflowDependencyQueryService.canReadResource(resourceId, resourceType, user))) {
			throw new UserError(`The ${label} was not found, or you don't have permission to read it.`);
		}
	};

	return {
		name: GET_DEPENDENCIES_TOOL_NAME,
		config: {
			description:
				'List what uses a workflow, credential or data table, and what a workflow uses. ' +
				'Call it before you archive, unpublish, rename or delete a workflow, or change its inputs, ' +
				'and before you change or delete a credential or data table. ' +
				'Each item says how it is linked and whether the draft, the published version or both hold the link. ' +
				'The list holds only references that n8n can read without running a workflow. ' +
				'It does not hold a sub-workflow or data table that a node picks through an expression or by name. ' +
				'Recent changes can be missing. ' +
				'So an empty list means that no known item uses the resource, not that nothing uses it. ' +
				'Say this to the user before they archive or delete the resource.',
			inputSchema,
			outputSchema,
			annotations: {
				title: 'Get Dependencies',
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
		},
		handler: async ({ resourceType, resourceId, limit, cursor }: GetDependenciesParams) => {
			const telemetryPayload: UserCalledMCPToolEventPayload = {
				user_id: user.id,
				tool_name: GET_DEPENDENCIES_TOOL_NAME,
				parameters: { resourceType, resourceId, limit, hasCursor: cursor !== undefined },
			};

			try {
				const offset = decodeCursor(cursor);
				const pageSize = Math.min(Math.max(1, limit ?? DEFAULT_LIMIT), MAX_RESULTS);

				await assertCanRead(resourceType, resourceId);

				const byResource = await workflowDependencyQueryService.getResourceDependencies(
					[resourceId],
					resourceType,
					user,
					{ includeVersions: true },
				);
				const result = byResource[resourceId];

				let withheldCount = 0;
				const all: DependencyItem[] = [];
				for (const dependency of result?.dependencies ?? []) {
					if (isWithheld(dependency.type)) {
						withheldCount++;
						continue;
					}
					const versions = toVersionsLabel(dependency.versions);
					all.push({
						type: DEPENDENCY_PUBLIC_TYPES[dependency.type],
						id: dependency.id,
						name: dependency.name,
						...(dependency.projectId ? { projectId: dependency.projectId } : {}),
						...(versions ? { versions } : {}),
						...(dependency.archived ? { archived: true as const } : {}),
					});
				}
				// A stable order, so offset cursors return the same items across calls.
				all.sort(
					(a, b) =>
						a.type.localeCompare(b.type) ||
						a.name.localeCompare(b.name) ||
						a.id.localeCompare(b.id),
				);

				const nextOffset = offset + pageSize;
				const output: GetDependenciesOutput = {
					success: true,
					resourceType,
					resourceId,
					dependencies: all.slice(offset, nextOffset),
					nextCursor: nextOffset < all.length ? encodeCursor(nextOffset) : null,
					inaccessibleCount: result?.inaccessibleCount ?? 0,
					...(withheldCount > 0 ? { withheldCount } : {}),
				};

				telemetryPayload.results = {
					success: true,
					data: {
						resource_type: resourceType,
						dependency_count: all.length,
						inaccessible_count: output.inaccessibleCount,
					},
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

				return toolResult(output);
			} catch (er) {
				const error = ensureError(er);
				const isAccessError = error instanceof WorkflowAccessError;

				telemetryPayload.results = {
					success: false,
					error: error.message,
					error_reason: isAccessError ? error.reason : undefined,
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

				// Only errors meant for the caller go back as a result. Anything else is a bug.
				if (!(error instanceof UserError)) throw error;

				const output: GetDependenciesOutput = {
					success: false,
					resourceType,
					resourceId,
					dependencies: [],
					nextCursor: null,
					inaccessibleCount: 0,
					error: error.message,
				};
				return toolResult(output, true);
			}
		},
	};
};
