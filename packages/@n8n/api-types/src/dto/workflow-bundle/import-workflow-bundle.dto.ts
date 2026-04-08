import { z } from 'zod';

import { Z } from '../../zod-class';

const bundleDataTableColumnSchema = z.object({
	name: z.string().min(1),
	type: z.enum(['string', 'number', 'boolean', 'date']),
	index: z.number(),
});

const bundleDataTableSchema = z.object({
	originalId: z.string().min(1),
	name: z.string().min(1),
	columns: z.array(bundleDataTableColumnSchema),
});

const bundleWorkflowSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1),
	nodes: z.array(z.record(z.unknown())),
	connections: z.record(z.unknown()),
	settings: z.record(z.unknown()).optional(),
	pinData: z.record(z.unknown()).optional(),
	meta: z.record(z.unknown()).optional(),
});

const workflowBundleSchema = z.object({
	bundleVersion: z.literal(1),
	mainWorkflow: bundleWorkflowSchema,
	subWorkflows: z.record(z.string(), bundleWorkflowSchema),
	dataTableSchemas: z.array(bundleDataTableSchema),
	meta: z
		.object({
			exportedAt: z.string(),
			instanceId: z.string(),
		})
		.optional(),
});

export class ImportWorkflowBundleDto extends Z.class({
	bundle: workflowBundleSchema,
	projectId: z.string().min(1),
}) {}

export class ExportWorkflowBundleDto extends Z.class({
	workflowId: z.string().min(1),
}) {}
