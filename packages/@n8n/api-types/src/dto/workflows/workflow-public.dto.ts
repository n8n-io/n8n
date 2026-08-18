import '../../openapi-extend';

import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';
import type { IConnections, INode, IWorkflowGroup } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';
import { tagPublicSchema } from '../tag/tag-public.dto';

// These fields can look different for every workflow, so we only check
// whether each one is the right basic type (a list or an object), not what's
// inside it. Checking more than that could reject real, already-saved
// workflows that were created before this check existed.
//
// `.openapi()` only describes the field in the published spec. It does not change what the check
// above accepts, so the docs can be exact while validation stays permissive.
const nodesPublicSchema = z
	.custom<INode[]>((value) => Array.isArray(value), { message: 'Nodes must be an array' })
	.openapi({
		type: 'array',
		description: 'Nodes that make up the workflow',
		items: {
			type: 'object',
			properties: {
				id: { type: 'string', example: '0f5532f9-36ba-4bef-86c7-30d607400b15' },
				name: { type: 'string', example: 'Jira' },
				webhookId: { type: 'string' },
				disabled: { type: 'boolean' },
				notesInFlow: { type: 'boolean' },
				notes: { type: 'string' },
				type: { type: 'string', example: 'n8n-nodes-base.jira' },
				typeVersion: { type: 'number', example: 1 },
				executeOnce: { type: 'boolean', example: false },
				alwaysOutputData: { type: 'boolean', example: false },
				retryOnFail: { type: 'boolean', example: false },
				maxTries: { type: 'number' },
				waitBetweenTries: { type: 'number' },
				continueOnFail: {
					type: 'boolean',
					example: false,
					description: 'use onError instead',
					deprecated: true,
				},
				onError: { type: 'string', example: 'stopWorkflow' },
				position: { type: 'array', items: { type: 'number' }, example: [-100, 80] },
				parameters: { type: 'object', additionalProperties: true },
				// No `id` in this example: ajv reads a nested `id` as a schema `$id`, and this schema is
				// inlined at two places, so a duplicate stops the bundle compiling.
				credentials: {
					type: 'object',
					example: { jiraSoftwareCloudApi: { name: 'jiraApi' } },
				},
				customTelemetryTags: {
					type: 'object',
					properties: {
						tag: {
							type: 'array',
							items: {
								type: 'object',
								properties: { key: { type: 'string' }, value: { type: 'string' } },
								required: ['key', 'value'],
							},
						},
					},
				},
				createdAt: { type: 'string', format: 'date-time', readOnly: true },
				updatedAt: { type: 'string', format: 'date-time', readOnly: true },
			},
		},
	});

const connectionsPublicSchema = z
	.custom<IConnections>(
		(value) => typeof value === 'object' && value !== null && !Array.isArray(value),
		{ message: 'Connections must be an object' },
	)
	.openapi({
		type: 'object',
		description: 'Connections between nodes, keyed by source node name',
		example: { Jira: { main: [[{ node: 'Jira', type: 'main', index: 0 }]] } },
	});

const nodeGroupsPublicSchema = z
	.custom<IWorkflowGroup[]>((value) => Array.isArray(value), {
		message: 'Node groups must be an array',
	})
	.openapi({
		type: 'array',
		description: 'Visual groupings of nodes shown as frames on the canvas',
		items: {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					description: 'Unique identifier for the node group',
					example: '9b1c8e2a-4d3f-4a6b-8c7d-1e2f3a4b5c6d',
				},
				name: {
					type: 'string',
					description: 'Display name of the node group',
					example: 'Data processing',
				},
				description: {
					type: 'string',
					maxLength: 155,
					description: 'Optional plain-text description of the node group',
					example: 'Cleans and normalizes incoming records',
				},
				nodeIds: {
					type: 'array',
					description: 'IDs of the nodes that belong to this group',
					items: { type: 'string' },
				},
			},
			required: ['id', 'name', 'nodeIds'],
		},
	});

const nullableObjectPublicSchema = z.custom<Record<string, unknown> | null>(
	(value) => value === null || (typeof value === 'object' && !Array.isArray(value)),
	{ message: 'Must be an object or null' },
);

// We generate OpenAPI 3.0, which marks a nullable field with `nullable: true`. OpenAPI 3.1 removed
// that keyword, and `.openapi()` accepts only the fields both versions define, so it rejects
// `nullable` outright. This adds it back.
function alsoNullable(metadata: ZodOpenAPIMetadata): ZodOpenAPIMetadata {
	return { ...metadata, nullable: true } as ZodOpenAPIMetadata;
}

const settingsPublicSchema = nullableObjectPublicSchema.openapi(
	alsoNullable({
		type: 'object',
		description: 'Execution and behaviour settings for the workflow',
		properties: {
			saveExecutionProgress: {
				oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['DEFAULT'] }],
			},
			saveManualExecutions: {
				oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['DEFAULT'] }],
			},
			saveDataErrorExecution: { type: 'string', enum: ['DEFAULT', 'all', 'none'] },
			saveDataSuccessExecution: { type: 'string', enum: ['DEFAULT', 'all', 'none'] },
			executionTimeout: { type: 'number', example: 3600 },
			errorWorkflow: {
				type: 'string',
				example: 'VzqKEW0ShTXA5vPj',
				description: 'The ID of the workflow that contains the error trigger node.',
			},
			timezone: { type: 'string', example: 'America/New_York' },
			executionOrder: { type: 'string', example: 'v1' },
			binaryMode: {
				type: 'string',
				enum: ['separate', 'combined'],
				description:
					"Controls how binary data is resolved from a node's input. This is a derived, internal " +
					'setting rather than something intended to be set programmatically. It is included in ' +
					'workflow responses for reference, but any value sent when creating or updating a ' +
					'workflow is ignored.',
			},
			callerPolicy: {
				type: 'string',
				enum: ['any', 'none', 'workflowsFromAList', 'workflowsFromSameOwner'],
				example: 'workflowsFromSameOwner',
				description:
					'Controls which workflows are allowed to call this workflow using the Execute Workflow ' +
					'node. Defaults to workflowsFromSameOwner.\n\nAvailable options:\n' +
					'- `any`: Any workflow can call this workflow (no restrictions)\n' +
					'- `none`: No other workflows can call this workflow (completely blocked)\n' +
					'- `workflowsFromSameOwner` (default): Only workflows owned by the same project can ' +
					'call this workflow\n' +
					'- `workflowsFromAList`: Only the workflows listed in `callerIds` can call this workflow',
			},
			callerIds: {
				type: 'string',
				example: '14, 18, 23',
				description:
					'Comma-separated list of workflow IDs allowed to call this workflow (only used with the ' +
					'workflowsFromAList policy)',
			},
			timeSavedMode: {
				type: 'string',
				enum: ['fixed', 'dynamic'],
				description:
					'Controls how the time saved per execution is calculated.\n\nAvailable options:\n' +
					'- `fixed`: Uses the value in `timeSavedPerExecution`. Use when the time saved is the ' +
					'same for every execution.\n' +
					'- `dynamic`: Calculates the time saved from actual execution metrics. ' +
					'`timeSavedPerExecution` is ignored.',
			},
			timeSavedPerExecution: {
				type: 'number',
				description: 'Estimated time saved per execution in minutes',
			},
			redactionPolicy: {
				type: 'string',
				enum: ['none', 'non-manual', 'manual-only', 'all'],
				example: 'non-manual',
				description:
					'Controls whether execution data is redacted for this workflow.\n\nAvailable options:\n' +
					'- `none` (default): No redaction. All execution data is stored.\n' +
					'- `non-manual`: Redact production (non-manually triggered) executions only.\n' +
					'- `manual-only`: Redact manually triggered executions only.\n' +
					'- `all`: Redact all executions, manual and production.',
			},
			availableInMCP: {
				type: 'boolean',
				example: false,
				description:
					'Controls whether this workflow is reachable over the Model Context Protocol (MCP). ' +
					'Defaults to false. The workflow must be active and must hold at least one active ' +
					'Webhook node.',
			},
			customTelemetryTags: {
				type: 'array',
				items: {
					type: 'object',
					properties: { key: { type: 'string' }, value: { type: 'string' } },
					required: ['key', 'value'],
				},
			},
			credentialResolverId: {
				type: 'string',
				description:
					'ID of the credential resolver that resolves credentials for this workflow. This is a ' +
					'derived, internal setting managed through the credential resolver configuration rather ' +
					'than something intended to be set programmatically. It is included in workflow ' +
					'responses for reference, but any value sent when creating or updating a workflow is ' +
					'ignored.',
			},
		},
	}),
);

const staticDataPublicSchema = nullableObjectPublicSchema.openapi(
	alsoNullable({
		type: 'object',
		description: 'Data the workflow keeps between executions',
		example: { lastId: 1 },
	}),
);

const pinDataPublicSchema = nullableObjectPublicSchema.openapi(
	alsoNullable({
		type: 'object',
		description: 'Pinned sample data for nodes, keyed by node name',
	}),
);

const metaPublicSchema = nullableObjectPublicSchema.openapi(
	alsoNullable({
		type: 'object',
		readOnly: true,
		description: 'Workflow metadata such as template information',
		properties: {
			onboardingId: { type: 'string' },
			templateId: { type: 'string' },
			instanceId: { type: 'string' },
			templateCredsSetupCompleted: { type: 'boolean' },
		},
	}),
);

const projectIconPublicSchema = z
	.object({
		type: z.enum(['emoji', 'icon']),
		value: z.string(),
	})
	.nullable();

const projectCustomTelemetryTagPublicSchema = z.object({
	key: z.string(),
	value: z.string(),
});

const workflowProjectPublicSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum(['personal', 'team']),
	icon: projectIconPublicSchema,
	description: z.string().nullable(),
	customTelemetryTags: z.array(projectCustomTelemetryTagPublicSchema),
	creatorId: z.string().nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const sharedWorkflowPublicSchema = z.object({
	role: z.string(),
	workflowId: z.string(),
	projectId: z.string(),
	project: workflowProjectPublicSchema,
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

const workflowPublishHistoryPublicSchema = z.object({
	id: z.number(),
	workflowId: z.string(),
	versionId: z.string().nullable(),
	event: z.enum(['activated', 'deactivated']),
	userId: z.string().nullable(),
	createdAt: z.string().datetime(),
});

export const activeWorkflowVersionPublicSchema = z.object({
	versionId: z.string(),
	workflowId: z.string(),
	nodes: nodesPublicSchema,
	connections: connectionsPublicSchema,
	nodeGroups: nodeGroupsPublicSchema,
	authors: z.string(),
	name: z.string().nullable(),
	description: z.string().nullable(),
	autosaved: z.boolean(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	workflowPublishHistory: z.array(workflowPublishHistoryPublicSchema),
});

export const workflowPublicSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	active: z.boolean(),
	activeVersionId: z.string().nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	isArchived: z.boolean(),
	versionId: z.string(),
	versionCounter: z.number(),
	sourceWorkflowId: z.string().nullable(),
	triggerCount: z.number(),
	nodes: nodesPublicSchema,
	connections: connectionsPublicSchema,
	nodeGroups: nodeGroupsPublicSchema,
	settings: settingsPublicSchema,
	staticData: staticDataPublicSchema,
	pinData: pinDataPublicSchema.optional(),
	meta: metaPublicSchema,
	tags: z.array(tagPublicSchema).optional(),
	shared: z.array(sharedWorkflowPublicSchema),
	activeVersion: activeWorkflowVersionPublicSchema.nullable(),
});

export class WorkflowPublicDto extends Z.class(workflowPublicSchema.shape) {}

// The list query selects fewer columns than a single-workflow fetch, so these are absent from every
// item — adding them back makes the response fail its own validation.
export const workflowListItemSharedPublicSchema = sharedWorkflowPublicSchema.omit({
	project: true,
});

export const workflowListItemActiveVersionPublicSchema = activeWorkflowVersionPublicSchema.omit({
	workflowPublishHistory: true,
});

export const workflowListItemPublicSchema = workflowPublicSchema
	.omit({
		description: true,
		versionCounter: true,
		sourceWorkflowId: true,
		shared: true,
		activeVersion: true,
	})
	.extend({
		shared: z.array(workflowListItemSharedPublicSchema),
		activeVersion: workflowListItemActiveVersionPublicSchema.nullable(),
	});

export class WorkflowListPublicDto extends Z.class({
	data: z.array(workflowListItemPublicSchema),
	nextCursor: z.string().nullable(),
}) {}
