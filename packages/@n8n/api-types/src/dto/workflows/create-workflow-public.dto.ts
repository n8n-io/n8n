import '../../openapi-extend';

import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';
import type { IConnections } from 'n8n-workflow';
import { z } from 'zod';

import {
	connectionsOpenApi,
	readOnlyTimestampOpenApi,
	workflowCreateFieldDocs,
	workflowCreateReadOnlyFieldDocs,
	workflowNodeFieldDocs,
	workflowNodeGroupFieldDocs,
	workflowSettingsFieldDocs,
} from './workflow-public.openapi';
import { Z } from '../../zod-class';

const readOnlyPublicSchema = (descriptor: ZodOpenAPIMetadata) =>
	z.undefined({ invalid_type_error: 'is read-only' }).openapi(descriptor);

const customTelemetryTagPublicSchema = z
	.object({
		key: z.string(),
		value: z.string(),
	})
	.strict();

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
		createdAt: readOnlyPublicSchema(readOnlyTimestampOpenApi),
		updatedAt: readOnlyPublicSchema(readOnlyTimestampOpenApi),
	})
	.strict();

const workflowNodeGroupCreatePublicSchema = z
	.object({
		id: z.string().openapi(workflowNodeGroupFieldDocs.id),
		name: z.string().openapi(workflowNodeGroupFieldDocs.name),
		description: z.string().max(155).optional().openapi(workflowNodeGroupFieldDocs.description),
		nodeIds: z.array(z.string()).openapi(workflowNodeGroupFieldDocs.nodeIds),
	})
	.strict();

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

const sharedWorkflowCreatePublicSchema = z
	.object({
		role: z.string().optional().openapi({ example: 'workflow:owner' }),
		workflowId: z.string().optional().openapi({ example: '2tUt1wbLX592XDdX' }),
		projectId: z.string().optional().openapi({ example: '2tUt1wbLX592XDdX' }),
		project: z
			.object({
				id: readOnlyPublicSchema({ type: 'string', readOnly: true }),
				name: z.string().optional(),
				type: readOnlyPublicSchema({ type: 'string', readOnly: true }),
			})
			.passthrough()
			.optional(),
		createdAt: readOnlyPublicSchema(readOnlyTimestampOpenApi),
		updatedAt: readOnlyPublicSchema(readOnlyTimestampOpenApi),
	})
	.strict();

const staticDataCreatePublicSchema = z
	.union([
		z
			.string()
			.refine(
				(value) => {
					try {
						JSON.parse(value);
						return true;
					} catch {
						return false;
					}
				},
				{ message: 'must be a JSON string' },
			)
			.openapi({ format: 'jsonString' }),
		z.record(z.unknown()),
	])
	// `.nullable()`, not a `z.null()` member: that would add a second `{ nullable: true }` branch.
	.nullable()
	.openapi(workflowCreateFieldDocs.staticData);

const createWorkflowPublicShape = {
	id: readOnlyPublicSchema(workflowCreateReadOnlyFieldDocs.id),
	name: z.string().openapi(workflowCreateFieldDocs.name),
	active: readOnlyPublicSchema(workflowCreateReadOnlyFieldDocs.active),
	createdAt: readOnlyPublicSchema(workflowCreateReadOnlyFieldDocs.createdAt),
	updatedAt: readOnlyPublicSchema(workflowCreateReadOnlyFieldDocs.updatedAt),
	isArchived: readOnlyPublicSchema(workflowCreateReadOnlyFieldDocs.isArchived),
	versionId: readOnlyPublicSchema(workflowCreateReadOnlyFieldDocs.versionId),
	triggerCount: readOnlyPublicSchema(workflowCreateReadOnlyFieldDocs.triggerCount),
	nodes: z.array(workflowNodeCreatePublicSchema).openapi(workflowCreateFieldDocs.nodes),
	connections: z
		.custom<IConnections>(
			(value) => typeof value === 'object' && value !== null && !Array.isArray(value),
			{ message: 'must be object' },
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
	meta: readOnlyPublicSchema(workflowCreateReadOnlyFieldDocs.meta),
	tags: readOnlyPublicSchema(workflowCreateReadOnlyFieldDocs.tags),
	shared: z
		.array(sharedWorkflowCreatePublicSchema)
		.optional()
		.openapi(workflowCreateFieldDocs.shared),
	activeVersion: readOnlyPublicSchema(workflowCreateReadOnlyFieldDocs.activeVersion),
} as const;

export class CreateWorkflowPublicDto extends Z.class(createWorkflowPublicShape, {
	strict: true,
}) {}
