import '../../openapi-extend';

import type { IConnections, INode, IWorkflowGroup } from 'n8n-workflow';
import { z } from 'zod';

import {
	connectionsOpenApi,
	metaOpenApi,
	nodeGroupsOpenApi,
	nodesOpenApi,
	pinDataOpenApi,
	settingsOpenApi,
	staticDataOpenApi,
} from './workflow-public.openapi';
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
	.openapi(nodesOpenApi);

const connectionsPublicSchema = z
	.custom<IConnections>(
		(value) => typeof value === 'object' && value !== null && !Array.isArray(value),
		{ message: 'Connections must be an object' },
	)
	.openapi(connectionsOpenApi);

const nodeGroupsPublicSchema = z
	.custom<IWorkflowGroup[]>((value) => Array.isArray(value), {
		message: 'Node groups must be an array',
	})
	.openapi(nodeGroupsOpenApi);

const nullableObjectPublicSchema = z.custom<Record<string, unknown> | null>(
	(value) => value === null || (typeof value === 'object' && !Array.isArray(value)),
	{ message: 'Must be an object or null' },
);

const settingsPublicSchema = nullableObjectPublicSchema.openapi(settingsOpenApi);

const staticDataPublicSchema = nullableObjectPublicSchema.openapi(staticDataOpenApi);

const pinDataPublicSchema = nullableObjectPublicSchema.openapi(pinDataOpenApi);

const metaPublicSchema = nullableObjectPublicSchema.openapi(metaOpenApi);

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
