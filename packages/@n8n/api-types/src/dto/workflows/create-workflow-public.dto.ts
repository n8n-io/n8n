import '../../openapi-extend';

import type { IConnections } from 'n8n-workflow';
import { z } from 'zod';

import {
	connectionsOpenApi,
	workflowCreateFieldDocs,
	workflowNodeFieldDocs,
	workflowNodeGroupFieldDocs,
	workflowSettingsFieldDocs,
} from './workflow-public.openapi';
import { Z } from '../../zod-class';

/**
 * Request body for `POST /api/v1/workflows`.
 *
 * This replaces the hand-written `workflowCreate.yml`, so it has to accept and reject exactly what
 * that schema did. Two rules from the old stack are easy to lose:
 *
 * - Every field the spec marked `readOnly` was a hard 400, not a field that was quietly ignored.
 *   express-openapi-validator registers its own Ajv `readOnly` keyword that fails on the property
 *   being present at all. So `id`, `active`, `createdAt`, `updatedAt`, `isArchived`, `versionId`,
 *   `triggerCount`, `meta`, `tags` and `activeVersion` are absent from this shape, and the strict
 *   top level turns any of them into a 400. The same holds for the read-only fields nested in
 *   `node.yml` and `sharedWorkflow.yml`.
 * - `workflowCreate.yml`, `node.yml`, `workflowSettings.yml`, `workflowNodeGroup.yml` and
 *   `sharedWorkflow.yml` all set `additionalProperties: false`, so those objects are strict here.
 *   `sharedWorkflow.yml`'s nested `project` does not, so that one stays open.
 *
 * Field documentation lives in `workflow-public.openapi.ts` alongside the response descriptors, so
 * each field is described once for both directions.
 */

const customTelemetryTagPublicSchema = z
	.object({
		key: z.string(),
		value: z.string(),
	})
	.strict();

/** `node.yml`. Every field is optional there, so a bare `{}` is a valid node. */
const workflowNodeCreatePublicSchema = z
	.object({
		id: z.string().optional().openapi(workflowNodeFieldDocs.id),
		name: z.string().optional().openapi(workflowNodeFieldDocs.name),
		webhookId: z.string().optional(),
		disabled: z.boolean().optional(),
		notesInFlow: z.boolean().optional(),
		notes: z.string().optional(),
		type: z.string().optional().openapi(workflowNodeFieldDocs.type),
		typeVersion: z.number().optional().openapi(workflowNodeFieldDocs.typeVersion),
		executeOnce: z.boolean().optional().openapi(workflowNodeFieldDocs.executeOnce),
		alwaysOutputData: z.boolean().optional().openapi(workflowNodeFieldDocs.alwaysOutputData),
		retryOnFail: z.boolean().optional().openapi(workflowNodeFieldDocs.retryOnFail),
		maxTries: z.number().optional(),
		waitBetweenTries: z.number().optional(),
		continueOnFail: z
			.boolean()
			.optional()
			.openapi({ ...workflowNodeFieldDocs.continueOnFail, deprecated: true }),
		onError: z.string().optional().openapi(workflowNodeFieldDocs.onError),
		position: z
			.array(z.number())
			.optional()
			.openapi({ example: [...workflowNodeFieldDocs.position.example] }),
		parameters: z.record(z.unknown()).optional(),
		credentials: z.record(z.unknown()).optional().openapi(workflowNodeFieldDocs.credentials),
		customTelemetryTags: z
			.object({ tag: z.array(customTelemetryTagPublicSchema).optional() })
			.strict()
			.optional(),
	})
	.strict();

/** `workflowNodeGroup.yml`. */
const workflowNodeGroupCreatePublicSchema = z
	.object({
		id: z.string().openapi(workflowNodeGroupFieldDocs.id),
		name: z.string().openapi(workflowNodeGroupFieldDocs.name),
		// 155, not the internal `GROUP_DESCRIPTION_MAX_LENGTH` of 145. The public schema has always
		// rejected at 155, and the internal cap truncates rather than rejects, so lowering this
		// number here would reject payloads the API accepts today.
		description: z.string().max(155).optional().openapi(workflowNodeGroupFieldDocs.description),
		nodeIds: z.array(z.string()).openapi(workflowNodeGroupFieldDocs.nodeIds),
	})
	.strict();

/**
 * `workflowSettings.yml`.
 *
 * `binaryMode` and `credentialResolverId` are derived, internal settings. The spec documents them
 * and the endpoint accepts them, but the stored value is left alone — so the transform drops them
 * after validation instead of the controller deleting them by hand.
 */
const workflowSettingsCreatePublicSchema = z
	.object({
		saveExecutionProgress: z.boolean().optional(),
		saveManualExecutions: z.boolean().optional(),
		saveDataErrorExecution: z.enum(['all', 'none']).optional(),
		saveDataSuccessExecution: z.enum(['all', 'none']).optional(),
		executionTimeout: z.number().optional().openapi(workflowSettingsFieldDocs.executionTimeout),
		errorWorkflow: z.string().optional().openapi(workflowSettingsFieldDocs.errorWorkflow),
		timezone: z.string().optional().openapi(workflowSettingsFieldDocs.timezone),
		executionOrder: z.string().optional().openapi(workflowSettingsFieldDocs.executionOrder),
		binaryMode: z
			.enum(['separate', 'combined'])
			.optional()
			.openapi(workflowSettingsFieldDocs.binaryMode),
		callerPolicy: z
			.enum(['any', 'none', 'workflowsFromAList', 'workflowsFromSameOwner'])
			.optional()
			.openapi(workflowSettingsFieldDocs.callerPolicy),
		callerIds: z.string().optional().openapi(workflowSettingsFieldDocs.callerIds),
		timeSavedMode: z
			.enum(['fixed', 'dynamic'])
			.optional()
			.openapi(workflowSettingsFieldDocs.timeSavedMode),
		timeSavedPerExecution: z
			.number()
			.optional()
			.openapi(workflowSettingsFieldDocs.timeSavedPerExecution),
		redactionPolicy: z
			.enum(['none', 'non-manual', 'manual-only', 'all'])
			.optional()
			.openapi(workflowSettingsFieldDocs.redactionPolicy),
		availableInMCP: z.boolean().optional().openapi(workflowSettingsFieldDocs.availableInMCP),
		customTelemetryTags: z.array(customTelemetryTagPublicSchema).optional(),
		credentialResolverId: z
			.string()
			.optional()
			.openapi(workflowSettingsFieldDocs.credentialResolverId),
	})
	.strict()
	.transform(
		({ binaryMode: _binaryMode, credentialResolverId: _resolverId, ...settings }) => settings,
	);

/**
 * `sharedWorkflow.yml`. Documented, accepted, and then discarded: the owner share is derived from
 * the target project. The shape is still replicated so a payload the old schema rejected keeps
 * being rejected. `createdAt` and `updatedAt` are read-only, so the strict object refuses them by
 * leaving them out; `project` is the one object the old schema left open, and its `id` and `type`
 * are read-only.
 */
const sharedWorkflowCreatePublicSchema = z
	.object({
		role: z.string().optional(),
		workflowId: z.string().optional(),
		projectId: z.string().optional(),
		project: z
			.object({ name: z.string().optional() })
			.passthrough()
			.refine((value) => !('id' in value) && !('type' in value), {
				message: 'project.id and project.type are read-only',
			})
			.optional(),
	})
	.strict();

/** `staticData`: a JSON string, an object, or null. */
const staticDataCreatePublicSchema = z
	.union([
		z.string().refine(
			(value) => {
				try {
					JSON.parse(value);
					return true;
				} catch {
					return false;
				}
			},
			{ message: 'staticData must be a JSON string' },
		),
		z.record(z.unknown()),
		z.null(),
	])
	.openapi(workflowCreateFieldDocs.staticData);

export const createWorkflowPublicShape = {
	name: z.string().openapi(workflowCreateFieldDocs.name),
	nodes: z.array(workflowNodeCreatePublicSchema).openapi(workflowCreateFieldDocs.nodes),
	// `type: object` was the whole of the old check, which is what this custom schema does. It keeps
	// the domain type, so the parsed value needs no cast on the way to the workflow entity.
	connections: z
		.custom<IConnections>(
			(value) => typeof value === 'object' && value !== null && !Array.isArray(value),
			{ message: 'Connections must be an object' },
		)
		.openapi(connectionsOpenApi),
	settings: workflowSettingsCreatePublicSchema,
	nodeGroups: z
		.array(workflowNodeGroupCreatePublicSchema)
		.optional()
		.openapi(workflowCreateFieldDocs.nodeGroups),
	staticData: staticDataCreatePublicSchema.optional(),
	pinData: z.record(z.unknown()).nullable().optional().openapi(workflowCreateFieldDocs.pinData),
	projectId: z.string().optional().openapi(workflowCreateFieldDocs.projectId),
	parentFolderId: z.string().nullable().optional().openapi(workflowCreateFieldDocs.parentFolderId),
	shared: z
		.array(sharedWorkflowCreatePublicSchema)
		.optional()
		.openapi(workflowCreateFieldDocs.shared),
} as const;

export class CreateWorkflowPublicDto extends Z.strictClass(createWorkflowPublicShape) {}
