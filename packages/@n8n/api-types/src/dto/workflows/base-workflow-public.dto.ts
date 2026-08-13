import type { IConnections } from 'n8n-workflow';
import { z } from 'zod';

import type { workflowPublicSchema } from './workflow-public.dto';

/**
 * What the hand-written `workflowNodeGroup.yml` published, which is what callers were allowed to
 * send. Deliberately not `GROUP_DESCRIPTION_MAX_LENGTH` (145): the engine truncates to that rather
 * than rejecting, so borrowing it here would start rejecting requests the old API accepted.
 */
const GROUP_DESCRIPTION_PUBLIC_MAX_LENGTH = 155;

/**
 * Server-managed fields: present in the response, rejected in a request. The hand-written spec
 * marked them `readOnly`, which express-openapi-validator enforced.
 *
 * They are deliberately absent from the shape below rather than declared and rejected. A declared
 * field would appear in the generated request spec, and the generator cannot express `readOnly`
 * for it — so the published contract would invite callers to send fields the server always
 * rejects. Left out, the `strict` object rejects them as unrecognised keys, and the error map
 * below restores the specific message.
 *
 * `satisfies` ties the names to the response schema, so renaming a field there fails the build
 * here rather than silently degrading this message to the generic one.
 */
const READ_ONLY_PUBLIC_FIELDS = new Set<string>([
	'id',
	'active',
	'createdAt',
	'updatedAt',
	'isArchived',
	'versionId',
	'triggerCount',
	'meta',
	'tags',
	'activeVersion',
] satisfies Array<keyof typeof workflowPublicSchema.shape>);

/** Tells a caller a rejected key is read-only, rather than leaving it to look like a typo. */
export const readOnlyPublicFieldErrorMap: z.ZodErrorMap = (issue, ctx) => {
	if (issue.code === z.ZodIssueCode.unrecognized_keys) {
		const readOnly = issue.keys.filter((key) => READ_ONLY_PUBLIC_FIELDS.has(key));

		if (readOnly.length > 0) {
			const names = readOnly.map((key) => `'${key}'`).join(', ');
			const verb = readOnly.length > 1 ? 'are read-only fields' : 'is a read-only field';
			return { message: `${names} ${verb} and cannot be set` };
		}
	}

	return { message: ctx.defaultError };
};

/**
 * Mirrors the hand-written `node.yml`, down to `additionalProperties: false` and its lack of any
 * required property. A node the old API rejected -- an unknown key, a wrongly typed field, a
 * non-object -- has to keep being rejected here, so every property it listed is reproduced even
 * where `INode` is wider (`extendsCredential`, `rewireOutputLogTo` and `forceCustomOperation` are
 * absent on purpose: the published contract never accepted them).
 *
 * `createdAt` and `updatedAt` are omitted for the same reason the workflow-level server-managed
 * fields are -- see `READ_ONLY_PUBLIC_FIELDS` above.
 */
const nodeWritePublicSchema = z
	.object({
		id: z.string().optional(),
		name: z.string().optional(),
		webhookId: z.string().optional(),
		disabled: z.boolean().optional(),
		notesInFlow: z.boolean().optional(),
		notes: z.string().optional(),
		type: z.string().optional(),
		typeVersion: z.number().optional(),
		executeOnce: z.boolean().optional(),
		alwaysOutputData: z.boolean().optional(),
		retryOnFail: z.boolean().optional(),
		maxTries: z.number().optional(),
		waitBetweenTries: z.number().optional(),
		continueOnFail: z.boolean().optional(),
		onError: z.string().optional(),
		position: z.array(z.number()).optional(),
		parameters: z.record(z.string(), z.unknown()).optional(),
		credentials: z.record(z.string(), z.unknown()).optional(),
		customTelemetryTags: z
			.object({
				tag: z.array(z.object({ key: z.string(), value: z.string() }).strict()).optional(),
			})
			.strict()
			.optional(),
	})
	.strict();

const nodesWritePublicSchema = z.array(nodeWritePublicSchema);

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
// column transformer, exactly as it was before this DTO existed. The string still has to *be*
// JSON: `format: jsonString` made the old API reject anything else with a 400, and without the
// check the persistence layer throws on a parse failure and the caller sees a 500.
const jsonStringPublicSchema = z.string().refine(
	(value) => {
		try {
			JSON.parse(value);
			return true;
		} catch {
			return false;
		}
	},
	{ message: 'Must be a JSON string' },
);

const staticDataWritePublicSchema = z
	.union([jsonStringPublicSchema, z.record(z.string(), z.unknown())])
	.nullable();

const pinDataWritePublicSchema = z.record(z.string(), z.unknown()).nullable();

/**
 * `sharedWorkflow.yml` was the one relation the old spec never marked `readOnly`, so a caller could
 * send `shared` and have it accepted. The entity mapper's write allowlist drops it, so it has never
 * had any effect -- but rejecting it now would turn a working request into a 400.
 */
const sharedWritePublicSchema = z.array(
	z
		.object({
			role: z.string().optional(),
			workflowId: z.string().optional(),
			projectId: z.string().optional(),
			project: z
				.object({
					id: z.string().optional(),
					name: z.string().optional(),
					type: z.string().optional(),
				})
				.passthrough()
				.optional(),
		})
		.strict(),
);

/**
 * Fields the create and update Public API request bodies have in common (both are full-object
 * bodies -- the update is a `PUT`, not a partial `PATCH`).
 *
 * The two hand-written bodies were not identical, and each difference is reproduced at the call
 * site rather than merged in here: `workflowCreate.yml` had `projectId` and no `description`,
 * `workflow.yml` had `description` and no `projectId`. Sharing either one would start accepting a
 * field the old API answered with a 400.
 */
export const workflowWritePublicShape = {
	name: z.string(),
	nodes: nodesWritePublicSchema,
	connections: connectionsWritePublicSchema,
	nodeGroups: nodeGroupsWritePublicSchema.optional(),
	settings: settingsWritePublicSchema,
	staticData: staticDataWritePublicSchema.optional(),
	pinData: pinDataWritePublicSchema.optional(),
	parentFolderId: z.string().nullable().optional(),
	shared: sharedWritePublicSchema.optional(),
} as const;
