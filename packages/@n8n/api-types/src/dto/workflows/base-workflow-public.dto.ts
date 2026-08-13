import type { IConnections, INode } from 'n8n-workflow';
import { z } from 'zod';

/**
 * What the hand-written `workflowNodeGroup.yml` published, which is what callers were allowed to
 * send. Deliberately not `GROUP_DESCRIPTION_MAX_LENGTH` (145): the engine truncates to that rather
 * than rejecting, so borrowing it here would start rejecting requests the old API accepted.
 */
const GROUP_DESCRIPTION_PUBLIC_MAX_LENGTH = 155;

/**
 * Fields the public GET/POST/PUT response includes but that are server-managed. The previous
 * hand-written OpenAPI schema (`workflow.yml`/`workflowCreate.yml`) marked these `readOnly`,
 * which express-openapi-validator enforced by rejecting the request when one was present. This
 * reproduces that rejection instead of silently accepting or stripping the value.
 */
function readOnlyPublicField(fieldName: string) {
	return z.custom<undefined>((value) => value === undefined, {
		message: `'${fieldName}' is a read-only field and cannot be set`,
	});
}

// Nodes, connections, settings, static data, and pin data all carry arbitrary,
// node-type-specific shapes that only the workflow engine can fully validate --
// re-validating their internals here would risk rejecting legitimately shaped
// data. Mirrors the shape-only checks `WorkflowPublicDto` already applies on the
// way out; the engine (`WorkflowHelpers.validateWorkflowStructure`, etc.) still
// validates the real structure server-side, exactly as it did before this DTO existed.
const nodesWritePublicSchema = z.custom<INode[]>((value) => Array.isArray(value), {
	message: 'Nodes must be an array',
});

const connectionsWritePublicSchema = z.custom<IConnections>(
	(value) => typeof value === 'object' && value !== null && !Array.isArray(value),
	{ message: 'Connections must be an object' },
);

// Mirrors the hand-written `workflowNodeGroup.yml`: a small, fully specified structure, so it is
// described rather than waved through. Declared here rather than reusing the internal
// `workflowNodeGroupsSchema` so a change to the internal request DTO cannot silently move the
// public contract.
const nodeGroupsWritePublicSchema = z.array(
	z
		.object({
			id: z.string(),
			name: z.string(),
			nodeIds: z.array(z.string()),
			description: z.string().max(GROUP_DESCRIPTION_PUBLIC_MAX_LENGTH).optional(),
		})
		.strict(),
);

/**
 * Mirrors the hand-written `workflowSettings.yml`, which set `additionalProperties: false` and
 * typed every value. `binaryMode` and `credentialResolverId` are listed there too, so a request
 * carrying them is accepted and then stripped by the controller rather than rejected.
 */
const settingsWritePublicSchema = z
	.object({
		saveExecutionProgress: z.boolean(),
		saveManualExecutions: z.boolean(),
		saveDataErrorExecution: z.enum(['all', 'none']),
		saveDataSuccessExecution: z.enum(['all', 'none']),
		executionTimeout: z.number(),
		errorWorkflow: z.string(),
		timezone: z.string(),
		executionOrder: z.string(),
		binaryMode: z.enum(['separate', 'combined']),
		credentialResolverId: z.string(),
		callerPolicy: z.enum(['any', 'none', 'workflowsFromAList', 'workflowsFromSameOwner']),
		callerIds: z.string(),
		timeSavedMode: z.enum(['fixed', 'dynamic']),
		timeSavedPerExecution: z.number(),
		redactionPolicy: z.enum(['none', 'non-manual', 'manual-only', 'all']),
		availableInMCP: z.boolean(),
		customTelemetryTags: z.array(z.object({ key: z.string(), value: z.string() }).strict()),
	})
	.partial()
	.strict();

// Accepts the pre-parsed object shape or a raw JSON string, matching the wire contract
// (`anyOf: [jsonString, object]`) -- parsing the string is left to the persistence layer's
// column transformer, exactly as it was before this DTO existed.
const staticDataWritePublicSchema = z
	.union([z.string(), z.record(z.string(), z.unknown())])
	.nullable();

const pinDataWritePublicSchema = z.record(z.string(), z.unknown()).nullable();

/**
 * Fields shared by the create and update Public API request bodies: both accept the same
 * writable workflow shape (the update body is a full-object `PUT`, not a partial `PATCH`).
 * `CreateWorkflowPublicDto` extends this with `projectId`; nothing else differs.
 */
export const workflowWritePublicShape = {
	name: z.string(),
	description: z.string().nullable().optional(),
	nodes: nodesWritePublicSchema,
	connections: connectionsWritePublicSchema,
	nodeGroups: nodeGroupsWritePublicSchema.optional(),
	settings: settingsWritePublicSchema,
	staticData: staticDataWritePublicSchema.optional(),
	pinData: pinDataWritePublicSchema.optional(),
	parentFolderId: z.string().nullable().optional(),

	id: readOnlyPublicField('id'),
	active: readOnlyPublicField('active'),
	createdAt: readOnlyPublicField('createdAt'),
	updatedAt: readOnlyPublicField('updatedAt'),
	isArchived: readOnlyPublicField('isArchived'),
	versionId: readOnlyPublicField('versionId'),
	triggerCount: readOnlyPublicField('triggerCount'),
	meta: readOnlyPublicField('meta'),
	tags: readOnlyPublicField('tags'),
	shared: readOnlyPublicField('shared'),
	activeVersion: readOnlyPublicField('activeVersion'),
} as const;
