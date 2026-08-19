import '../../openapi-extend';

import type { IConnections } from 'n8n-workflow';
import { z } from 'zod';

import { connectionsOpenApi } from './workflow-public.openapi';
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
 *   top level turns any of them into a 400.
 * - `workflowCreate.yml`, `node.yml`, `workflowSettings.yml` and `workflowNodeGroup.yml` all set
 *   `additionalProperties: false`, so every object here is strict.
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
		id: z.string().optional().openapi({ example: '0f5532f9-36ba-4bef-86c7-30d607400b15' }),
		name: z.string().optional().openapi({ example: 'Jira' }),
		webhookId: z.string().optional(),
		disabled: z.boolean().optional(),
		notesInFlow: z.boolean().optional(),
		notes: z.string().optional(),
		type: z.string().optional().openapi({ example: 'n8n-nodes-base.jira' }),
		typeVersion: z.number().optional().openapi({ example: 1 }),
		executeOnce: z.boolean().optional(),
		alwaysOutputData: z.boolean().optional(),
		retryOnFail: z.boolean().optional(),
		maxTries: z.number().optional(),
		waitBetweenTries: z.number().optional(),
		continueOnFail: z.boolean().optional().openapi({
			description: 'use onError instead',
			deprecated: true,
		}),
		onError: z.string().optional().openapi({ example: 'stopWorkflow' }),
		position: z
			.array(z.number())
			.optional()
			.openapi({ example: [-100, 80] }),
		parameters: z.record(z.unknown()).optional(),
		credentials: z
			.record(z.unknown())
			.optional()
			.openapi({ example: { jiraSoftwareCloudApi: { name: 'jiraApi' } } }),
		customTelemetryTags: z
			.object({ tag: z.array(customTelemetryTagPublicSchema).optional() })
			.strict()
			.optional(),
	})
	.strict();

/** `workflowNodeGroup.yml`. */
const workflowNodeGroupCreatePublicSchema = z
	.object({
		id: z.string().openapi({
			description: 'Unique identifier for the node group',
			example: '9b1c8e2a-4d3f-4a6b-8c7d-1e2f3a4b5c6d',
		}),
		name: z.string().openapi({
			description: 'Display name of the node group',
			example: 'Data processing',
		}),
		// 155, not the internal `GROUP_DESCRIPTION_MAX_LENGTH` of 145. The public schema has always
		// rejected at 155, and the internal cap truncates rather than rejects, so lowering this
		// number here would reject payloads the API accepts today.
		description: z.string().max(155).optional().openapi({
			description: 'Optional plain-text description of the node group',
			example: 'Cleans and normalizes incoming records',
		}),
		nodeIds: z.array(z.string()).openapi({
			description: 'IDs of the nodes that belong to this group',
		}),
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
		executionTimeout: z.number().optional().openapi({ example: 3600 }),
		errorWorkflow: z.string().optional().openapi({
			description: 'The ID of the workflow that contains the error trigger node.',
			example: 'VzqKEW0ShTXA5vPj',
		}),
		timezone: z.string().optional().openapi({ example: 'America/New_York' }),
		executionOrder: z.string().optional().openapi({ example: 'v1' }),
		binaryMode: z
			.enum(['separate', 'combined'])
			.optional()
			.openapi({
				description:
					"Controls how binary data is resolved from a node's input. This is a derived, internal " +
					'setting rather than something intended to be set programmatically. It is included in ' +
					'workflow responses for reference, but any value sent when creating or updating a ' +
					'workflow is ignored.',
			}),
		callerPolicy: z
			.enum(['any', 'none', 'workflowsFromAList', 'workflowsFromSameOwner'])
			.optional()
			.openapi({
				description:
					'Controls which workflows are allowed to call this workflow using the Execute Workflow ' +
					'node. Defaults to workflowsFromSameOwner.',
				example: 'workflowsFromSameOwner',
			}),
		callerIds: z
			.string()
			.optional()
			.openapi({
				description:
					'Comma-separated list of workflow IDs allowed to call this workflow (only used with the ' +
					'workflowsFromAList policy)',
				example: '14, 18, 23',
			}),
		timeSavedMode: z.enum(['fixed', 'dynamic']).optional().openapi({
			description: 'Controls how the time saved per execution is calculated.',
		}),
		timeSavedPerExecution: z.number().optional().openapi({
			description: 'Estimated time saved per execution in minutes',
		}),
		redactionPolicy: z
			.enum(['none', 'non-manual', 'manual-only', 'all'])
			.optional()
			.openapi({
				description:
					'Controls whether execution data is redacted for this workflow. A policy weaker than ' +
					'the instance redaction floor is rejected with 422. Omitting the field seeds the ' +
					'workflow to the floor.',
				example: 'non-manual',
			}),
		availableInMCP: z
			.boolean()
			.optional()
			.openapi({
				description:
					'Controls whether this workflow is reachable over the Model Context Protocol (MCP). ' +
					'Defaults to false. The workflow must be active and must hold at least one active ' +
					'Webhook node.',
				example: false,
			}),
		customTelemetryTags: z.array(customTelemetryTagPublicSchema).optional(),
		credentialResolverId: z
			.string()
			.optional()
			.openapi({
				description:
					'ID of the credential resolver that resolves credentials for this workflow. This is a ' +
					'derived, internal setting managed through the credential resolver configuration rather ' +
					'than something intended to be set programmatically. It is included in workflow ' +
					'responses for reference, but any value sent when creating or updating a workflow is ' +
					'ignored.',
			}),
	})
	.strict()
	.transform(
		({ binaryMode: _binaryMode, credentialResolverId: _resolverId, ...settings }) => settings,
	);

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
	.openapi({ description: 'Data the workflow keeps between executions', example: { lastId: 1 } });

export const createWorkflowPublicShape = {
	name: z.string().openapi({ example: 'Workflow 1' }),
	nodes: z.array(workflowNodeCreatePublicSchema).openapi({
		description: 'Nodes that make up the workflow',
	}),
	// `type: object` was the whole of the old check, which is what this custom schema does. It keeps
	// the domain type, so the parsed value needs no cast on the way to the workflow entity.
	connections: z
		.custom<IConnections>(
			(value) => typeof value === 'object' && value !== null && !Array.isArray(value),
			{ message: 'Connections must be an object' },
		)
		.openapi(connectionsOpenApi),
	settings: workflowSettingsCreatePublicSchema,
	nodeGroups: z.array(workflowNodeGroupCreatePublicSchema).optional().openapi({
		description: 'Visual groupings of nodes shown as frames on the canvas',
	}),
	staticData: staticDataCreatePublicSchema.optional(),
	pinData: z.record(z.unknown()).nullable().optional().openapi({
		description: 'Pinned sample data for nodes, keyed by node name',
	}),
	projectId: z.string().optional().openapi({
		description:
			"Target project to create the workflow in. Defaults to the user's personal project.",
		example: 'VmwOO9HeTEj20kxM',
	}),
	parentFolderId: z.string().nullable().optional().openapi({
		description:
			'ID of the folder to place the workflow in. Omit or null to place at the project root.',
		example: 'X8ovzm8lTQjcXRZQ',
	}),
	// Documented, accepted, and discarded: the owner share is derived from the target project. The
	// old schema type-checked the contents, which nothing reads, so this only checks it is a list.
	shared: z.array(z.unknown()).optional(),
} as const;

export class CreateWorkflowPublicDto extends Z.strictClass(createWorkflowPublicShape) {}
