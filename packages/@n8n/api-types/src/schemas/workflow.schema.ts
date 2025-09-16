import type { Scope } from '@n8n/permissions';
import type {
	IConnections,
	INodeUi,
	IPinData,
	IUsedCredential,
	IWorkflowSettings,
	ProjectSharingData,
	WorkflowMetadata,
} from 'n8n-workflow';
import { z } from 'zod';
import { tagSchema } from './tag.schema';

// Note: These are complex types from n8n-workflow that would need their own schemas
// For now, we'll use z.any() as placeholders, but ideally these should be properly typed
const nodeUiSchema = z.any() as z.ZodType<INodeUi>;
const connectionsSchema = z.any() as z.ZodType<IConnections>;
const workflowSettingsSchema = z.any() as z.ZodType<IWorkflowSettings>;
const pinDataSchema = z.any() as z.ZodType<IPinData>;
const scopeSchema = z.string() as z.ZodType<Scope>;
export const projectSharingDataSchema = z.any() as z.ZodType<ProjectSharingData>;
export const workflowMetadataSchema = z.any() as z.ZodType<WorkflowMetadata>;
export const usedCredentialSchema = z.any() as z.ZodType<IUsedCredential>;

export const parentFolderSchema = z.object({
	id: z.string(),
	name: z.string(),
	parentFolderId: z.string().nullable(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});

export const workflowResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	active: z.boolean(),
	isArchived: z.boolean(),
	createdAt: z.union([z.number(), z.string()]),
	updatedAt: z.union([z.number(), z.string()]),
	nodes: z.array(nodeUiSchema),
	connections: connectionsSchema,
	settings: workflowSettingsSchema.optional(),
	tags: z.union([z.array(tagSchema), z.array(z.string())]).optional(),
	pinData: pinDataSchema.optional(),
	sharedWithProjects: z.array(projectSharingDataSchema).optional(),
	homeProject: projectSharingDataSchema.optional(),
	scopes: z.array(scopeSchema).optional(),
	versionId: z.string(),
	usedCredentials: z.array(usedCredentialSchema).optional(),
	meta: workflowMetadataSchema.optional(),
	parentFolder: parentFolderSchema.optional(),
});

export type IWorkflowDb = z.infer<typeof workflowResponseSchema>;
