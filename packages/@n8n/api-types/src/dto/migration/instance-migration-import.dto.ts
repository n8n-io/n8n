import { z } from 'zod';
import { Z } from 'zod-class';

export const instanceMigrationImportRequestSchema = z
	.object({
		exportId: z.string().optional(),
		exportData: z.any().optional(),
		conflictResolution: z.enum(['skip', 'overwrite', 'rename']).default('skip'),
		createMissingProjects: z.boolean().default(false),
		createMissingUsers: z.boolean().default(false),
		preserveIds: z.boolean().default(false),
		decryptionKey: z.string().optional(),
		targetProjectId: z.string().optional(),
	})
	.refine(
		(data) =>
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			data.exportId || data.exportData,
		{
			message: 'Either exportId or exportData must be provided',
			path: ['exportId'],
		},
	);

export const instanceMigrationImportResponseSchema = z.object({
	importId: z.string(),
	status: z.enum(['pending', 'running', 'completed', 'failed']),
	completedAt: z.date().optional(),
	summary: z.object({
		totalImported: z.number(),
		totalSkipped: z.number(),
		totalErrors: z.number(),
		workflows: z.object({
			imported: z.number(),
			skipped: z.number(),
			errors: z.number(),
		}),
		credentials: z.object({
			imported: z.number(),
			skipped: z.number(),
			errors: z.number(),
		}),
		users: z.object({
			imported: z.number(),
			skipped: z.number(),
			errors: z.number(),
		}),
		settings: z.object({
			imported: z.number(),
			skipped: z.number(),
			errors: z.number(),
		}),
		projects: z.object({
			imported: z.number(),
			skipped: z.number(),
			errors: z.number(),
		}),
	}),
	sourceMetadata: z
		.object({
			id: z.string(),
			version: z.string(),
			createdAt: z.date(),
			createdBy: z.object({
				id: z.string(),
				email: z.string(),
				firstName: z.string(),
				lastName: z.string(),
			}),
			source: z.object({
				instanceUrl: z.string(),
				instanceId: z.string(),
				n8nVersion: z.string(),
			}),
		})
		.optional(),
	errors: z
		.array(
			z.object({
				resourceType: z.string(),
				resourceId: z.string(),
				resourceName: z.string().optional(),
				error: z.string(),
				details: z.any().optional(),
			}),
		)
		.optional(),
	warnings: z
		.array(
			z.object({
				resourceType: z.string(),
				resourceId: z.string(),
				resourceName: z.string().optional(),
				message: z.string(),
				details: z.any().optional(),
			}),
		)
		.optional(),
});

export class InstanceMigrationImportRequestDto extends Z.class({
	exportId: z.string().optional(),
	exportData: z.any().optional(),
	conflictResolution: z.enum(['skip', 'overwrite', 'rename']).default('skip'),
	createMissingProjects: z.boolean().default(false),
	createMissingUsers: z.boolean().default(false),
	preserveIds: z.boolean().default(false),
	decryptionKey: z.string().optional(),
	targetProjectId: z.string().optional(),
}) {}

export class InstanceMigrationImportResponseDto extends Z.class({
	importId: z.string(),
	status: z.enum(['pending', 'running', 'completed', 'failed']),
	completedAt: z.date().optional(),
	summary: z.object({
		totalImported: z.number(),
		totalSkipped: z.number(),
		totalErrors: z.number(),
		workflows: z.object({
			imported: z.number(),
			skipped: z.number(),
			errors: z.number(),
		}),
		credentials: z.object({
			imported: z.number(),
			skipped: z.number(),
			errors: z.number(),
		}),
		users: z.object({
			imported: z.number(),
			skipped: z.number(),
			errors: z.number(),
		}),
		settings: z.object({
			imported: z.number(),
			skipped: z.number(),
			errors: z.number(),
		}),
		projects: z.object({
			imported: z.number(),
			skipped: z.number(),
			errors: z.number(),
		}),
	}),
	sourceMetadata: z
		.object({
			id: z.string(),
			version: z.string(),
			createdAt: z.date(),
			createdBy: z.object({
				id: z.string(),
				email: z.string(),
				firstName: z.string(),
				lastName: z.string(),
			}),
			source: z.object({
				instanceUrl: z.string(),
				instanceId: z.string(),
				n8nVersion: z.string(),
			}),
		})
		.optional(),
	errors: z
		.array(
			z.object({
				resourceType: z.string(),
				resourceId: z.string(),
				resourceName: z.string().optional(),
				error: z.string(),
				details: z.any().optional(),
			}),
		)
		.optional(),
	warnings: z
		.array(
			z.object({
				resourceType: z.string(),
				resourceId: z.string(),
				resourceName: z.string().optional(),
				message: z.string(),
				details: z.any().optional(),
			}),
		)
		.optional(),
}) {}

export type InstanceMigrationImportRequest = z.infer<typeof instanceMigrationImportRequestSchema>;
export type InstanceMigrationImportResponse = z.infer<typeof instanceMigrationImportResponseSchema>;
