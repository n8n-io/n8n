import { z } from 'zod';
import { Z } from 'zod-class';

export const instanceMigrationExportRequestSchema = z.object({
	includeWorkflows: z.boolean().default(true),
	includeCredentials: z.boolean().default(true),
	includeCredentialData: z.boolean().default(false),
	includeUsers: z.boolean().default(false),
	includeSettings: z.boolean().default(false),
	projectIds: z.array(z.string()).optional(),
	encryptionKey: z.string().optional(),
	compressionLevel: z.number().min(0).max(9).default(6),
});

export const instanceMigrationExportResponseSchema = z.object({
	exportId: z.string(),
	status: z.enum(['pending', 'running', 'completed', 'failed']),
	filePath: z.string().optional(),
	downloadUrl: z.string().optional(),
	totalSize: z.number(),
	createdAt: z.date(),
	expiresAt: z.date().optional(),
	summary: z.object({
		workflows: z.number(),
		credentials: z.number(),
		users: z.number(),
		settings: z.number(),
		projects: z.number(),
		tags: z.number(),
		variables: z.number(),
	}),
});

export class InstanceMigrationExportRequestDto extends Z.class({
	includeWorkflows: z.boolean().default(true),
	includeCredentials: z.boolean().default(true),
	includeCredentialData: z.boolean().default(false),
	includeUsers: z.boolean().default(false),
	includeSettings: z.boolean().default(false),
	projectIds: z.array(z.string()).optional(),
	encryptionKey: z.string().optional(),
	compressionLevel: z.number().min(0).max(9).default(6),
}) {}

export class InstanceMigrationExportResponseDto extends Z.class({
	exportId: z.string(),
	status: z.enum(['pending', 'running', 'completed', 'failed']),
	filePath: z.string().optional(),
	downloadUrl: z.string().optional(),
	totalSize: z.number(),
	createdAt: z.date(),
	expiresAt: z.date().optional(),
	summary: z.object({
		workflows: z.number(),
		credentials: z.number(),
		users: z.number(),
		settings: z.number(),
		projects: z.number(),
		tags: z.number(),
		variables: z.number(),
	}),
}) {}

export type InstanceMigrationExportRequest = z.infer<typeof instanceMigrationExportRequestSchema>;
export type InstanceMigrationExportResponse = z.infer<typeof instanceMigrationExportResponseSchema>;
