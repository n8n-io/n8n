import type { IConnections, INode, IWorkflowGroup } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';
import { tagPublicSchema } from '../tag/tag-public.dto';

// Nodes, connections, settings, static data, meta, and pin data all carry
// arbitrary, already-stored shapes. This DTO only needs to confirm the
// top-level shape (array vs. object) it is exposing under each field name --
// re-validating their internals here would risk rejecting legitimately
// stored data that predates a stricter input schema.
const nodesPublicSchema = z.custom<INode[]>((value) => Array.isArray(value), {
	message: 'Nodes must be an array',
});

const connectionsPublicSchema = z.custom<IConnections>(
	(value) => typeof value === 'object' && value !== null && !Array.isArray(value),
	{ message: 'Connections must be an object' },
);

const nodeGroupsPublicSchema = z.custom<IWorkflowGroup[]>((value) => Array.isArray(value), {
	message: 'Node groups must be an array',
});

const nullableObjectPublicSchema = z.custom<Record<string, unknown> | null>(
	(value) => value === null || (typeof value === 'object' && !Array.isArray(value)),
	{ message: 'Must be an object or null' },
);

const workflowProjectPublicSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum(['personal', 'team']),
});

export const sharedWorkflowPublicSchema = z.object({
	role: z.string(),
	workflowId: z.string(),
	projectId: z.string(),
	project: workflowProjectPublicSchema,
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
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
	triggerCount: z.number(),
	nodes: nodesPublicSchema,
	connections: connectionsPublicSchema,
	nodeGroups: nodeGroupsPublicSchema,
	settings: nullableObjectPublicSchema,
	staticData: nullableObjectPublicSchema,
	pinData: nullableObjectPublicSchema.optional(),
	meta: nullableObjectPublicSchema,
	tags: z.array(tagPublicSchema).optional(),
	shared: z.array(sharedWorkflowPublicSchema),
	activeVersion: activeWorkflowVersionPublicSchema.nullable(),
});

export class WorkflowPublicDto extends Z.class(workflowPublicSchema.shape) {}
