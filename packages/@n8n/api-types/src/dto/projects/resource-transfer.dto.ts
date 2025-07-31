import { z } from 'zod';
import { Z } from 'zod-class';

// Multi-resource transfer for projects
export class ProjectResourceTransferRequestDto extends Z.class({
	destinationProjectId: z.string().uuid(),
	workflowIds: z.array(z.string().uuid()).optional(),
	credentialIds: z.array(z.string().uuid()).optional(),
	folderIds: z.array(z.string().uuid()).optional(),
	shareCredentials: z.array(z.string().uuid()).optional(),
	destinationParentFolderId: z.string().uuid().optional(),
}) {}

export class ProjectResourceTransferResponseDto extends Z.class({
	workflows: z.object({
		success: z.array(
			z.object({
				workflowId: z.string().uuid(),
				name: z.string(),
				message: z.string(),
			}),
		),
		errors: z.array(
			z.object({
				workflowId: z.string().uuid(),
				name: z.string().optional(),
				error: z.string(),
			}),
		),
	}),
	credentials: z.object({
		success: z.array(
			z.object({
				credentialId: z.string().uuid(),
				name: z.string(),
				message: z.string(),
			}),
		),
		errors: z.array(
			z.object({
				credentialId: z.string().uuid(),
				name: z.string().optional(),
				error: z.string(),
			}),
		),
	}),
	folders: z.object({
		success: z.array(
			z.object({
				folderId: z.string().uuid(),
				name: z.string(),
				message: z.string(),
			}),
		),
		errors: z.array(
			z.object({
				folderId: z.string().uuid(),
				name: z.string().optional(),
				error: z.string(),
			}),
		),
	}),
	summary: z.object({
		totalProcessed: z.number(),
		totalSuccess: z.number(),
		totalErrors: z.number(),
	}),
}) {}

// Transfer dependency analysis
export class TransferDependencyAnalysisDto extends Z.class({
	resourceId: z.string().uuid(),
	resourceType: z.enum(['workflow', 'credential', 'folder']),
	projectId: z.string().uuid(),
}) {}

export class TransferDependencyResponseDto extends Z.class({
	resourceId: z.string().uuid(),
	resourceType: z.enum(['workflow', 'credential', 'folder']),
	resourceName: z.string(),
	currentProjectId: z.string().uuid(),
	currentProjectName: z.string(),
	dependencies: z.object({
		requiredCredentials: z.array(
			z.object({
				id: z.string().uuid(),
				name: z.string(),
				type: z.string(),
				currentProjectId: z.string().uuid(),
				currentProjectName: z.string(),
				accessInDestination: z.boolean(),
			}),
		),
		containedWorkflows: z
			.array(
				z.object({
					id: z.string().uuid(),
					name: z.string(),
					currentProjectId: z.string().uuid(),
					currentProjectName: z.string(),
				}),
			)
			.optional(),
		containedFolders: z
			.array(
				z.object({
					id: z.string().uuid(),
					name: z.string(),
					currentProjectId: z.string().uuid(),
					currentProjectName: z.string(),
				}),
			)
			.optional(),
	}),
	transferImpact: z.object({
		canTransfer: z.boolean(),
		reasons: z.array(z.string()),
		recommendations: z.array(z.string()),
	}),
}) {}

// Transfer preview
export class TransferPreviewRequestDto extends Z.class({
	destinationProjectId: z.string().uuid(),
	workflowIds: z.array(z.string().uuid()).optional(),
	credentialIds: z.array(z.string().uuid()).optional(),
	folderIds: z.array(z.string().uuid()).optional(),
}) {}

export class TransferPreviewResponseDto extends Z.class({
	canTransfer: z.boolean(),
	totalResources: z.number(),
	summary: z.object({
		workflows: z.number(),
		credentials: z.number(),
		folders: z.number(),
	}),
	warnings: z.array(
		z.object({
			type: z.enum(['permission', 'dependency', 'conflict']),
			message: z.string(),
			resourceType: z.enum(['workflow', 'credential', 'folder']).optional(),
			resourceId: z.string().uuid().optional(),
		}),
	),
	recommendations: z.array(z.string()),
	requiredPermissions: z.array(
		z.object({
			projectId: z.string().uuid(),
			projectName: z.string(),
			permissions: z.array(z.string()),
		}),
	),
}) {}
