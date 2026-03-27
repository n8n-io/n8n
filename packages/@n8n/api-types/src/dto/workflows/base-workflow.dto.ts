import type { IPinData, IConnections, IDataObject, INode, IWorkflowSettings } from 'n8n-workflow';
import { z } from 'zod';

export const WORKFLOW_NAME_MAX_LENGTH = 128;

export const workflowNameSchema = z
	.string()
	.min(1, { message: 'Workflow name is required' })
	.max(WORKFLOW_NAME_MAX_LENGTH, {
		message: `Workflow name must be ${WORKFLOW_NAME_MAX_LENGTH} characters or less`,
	});

export const workflowDescriptionSchema = z.string().nullable();

// Use z.custom() with type predicates for better type safety
export const workflowNodesSchema = z.custom<INode[]>((val) => Array.isArray(val), {
	message: 'Nodes must be an array',
});

export const workflowConnectionsSchema = z.custom<IConnections>(
	(val) => typeof val === 'object' && val !== null && !Array.isArray(val),
	{
		message: 'Connections must be an object',
	},
);

export const workflowSettingsSchema = z.custom<IWorkflowSettings>(
	(val) => val === null || (typeof val === 'object' && val !== null && !Array.isArray(val)),
	{
		message: 'Settings must be an object or null',
	},
);

export const workflowStaticDataSchema = z.preprocess(
	(val) => {
		// If it's a string, try to parse it as JSON
		if (typeof val === 'string') {
			try {
				return JSON.parse(val);
			} catch {
				throw new Error('Static data string must be valid JSON');
			}
		}
		return val;
	},
	z.custom<IDataObject | null>(
		(val) => val === null || (typeof val === 'object' && val !== null && !Array.isArray(val)),
		{
			message: 'Static data must be an object or null',
		},
	),
);

// Pin data is a record of node names to their pinned execution data
export const workflowPinDataSchema = z.custom<IPinData | null>(
	(val) => val === null || (typeof val === 'object' && val !== null && !Array.isArray(val)),
	{
		message: 'Pin data must be an object or null',
	},
);

export const workflowMetaSchema = z.record(z.string(), z.unknown()).nullable();

/**
 * Base workflow shape containing fields shared between Create and Update DTOs.
 */
export const baseWorkflowShape = {
	// Core workflow data
	name: workflowNameSchema,
	description: workflowDescriptionSchema.optional(),
	nodes: workflowNodesSchema,
	connections: workflowConnectionsSchema,

	// Optional workflow configuration
	settings: workflowSettingsSchema.optional(),
	staticData: workflowStaticDataSchema.optional(),
	meta: workflowMetaSchema.optional(),
	pinData: workflowPinDataSchema.optional(),
	hash: z.string().optional(),

	// Folder organization
	parentFolderId: z.string().optional(),
	parentFolder: z.object({ id: z.string(), name: z.string() }).nullable().optional(),

	// Tags
	tags: z
		// Accept either array of tag IDs (strings) or array of tag objects ({ id, name }) for backwards compatibility
		.union([z.array(z.string()), z.array(z.object({ id: z.string(), name: z.string() }))])
		.transform((val): string[] => {
			// If array of objects, extract just the ids
			if (val.length > 0 && typeof val[0] === 'object' && 'id' in val[0]) {
				return (val as Array<{ id: string; name: string }>).map((tag) => tag.id);
			}
			return val as string[];
		})
		.optional(),

	// UI context and builder metadata
	uiContext: z.string().optional(),
	aiBuilderAssisted: z.boolean().optional(),

	// Version control
	expectedChecksum: z.string().optional(),
	autosaved: z.boolean().optional(),
} as const;
