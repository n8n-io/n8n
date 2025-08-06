import { z } from 'zod';
import { Z } from 'zod-class';

export const crossInstanceTransferRequestSchema = z
	.object({
		targetInstanceUrl: z.string().url(),
		targetApiKey: z.string().optional(),
		targetAuthToken: z.string().optional(),
		targetUsername: z.string().optional(),
		targetPassword: z.string().optional(),
		includeWorkflows: z.boolean().default(true),
		includeCredentials: z.boolean().default(true),
		includeCredentialData: z.boolean().default(false),
		includeUsers: z.boolean().default(false),
		includeSettings: z.boolean().default(false),
		projectIds: z.array(z.string()).optional(),
		conflictResolution: z.enum(['skip', 'overwrite', 'rename']).default('skip'),
		createMissingProjects: z.boolean().default(false),
		verifyTarget: z.boolean().default(true),
		timeout: z.number().min(30000).max(1800000).default(300000), // 30s to 30min, default 5min
	})
	.refine(
		(data) =>
			data.targetApiKey || data.targetAuthToken || (data.targetUsername && data.targetPassword),
		{
			message:
				'Target instance authentication is required (apiKey, authToken, or username/password)',
			path: ['targetApiKey'],
		},
	);

export const crossInstanceTransferResponseSchema = z.object({
	transferId: z.string(),
	status: z.enum([
		'pending',
		'authenticating',
		'exporting',
		'uploading',
		'importing',
		'completed',
		'failed',
	]),
	targetInstanceUrl: z.string(),
	startedAt: z.date().optional(),
	completedAt: z.date().optional(),
	error: z.string().optional(),
	summary: z.object({
		totalResources: z.number(),
		transferred: z.number(),
		failed: z.number(),
		skipped: z.number().optional(),
	}),
	exportMetadata: z
		.object({
			exportId: z.string(),
			size: z.number(),
			summary: z.object({
				workflows: z.number(),
				credentials: z.number(),
				users: z.number(),
				settings: z.number(),
				projects: z.number(),
				tags: z.number(),
				variables: z.number(),
			}),
		})
		.optional(),
	targetInstanceInfo: z
		.object({
			instanceId: z.string(),
			version: z.string(),
			healthy: z.boolean(),
			features: z.array(z.string()),
		})
		.optional(),
});

export const crossInstanceConnectionTestSchema = z
	.object({
		targetInstanceUrl: z.string().url(),
		targetApiKey: z.string().optional(),
		targetAuthToken: z.string().optional(),
		targetUsername: z.string().optional(),
		targetPassword: z.string().optional(),
	})
	.refine(
		(data) =>
			data.targetApiKey || data.targetAuthToken || (data.targetUsername && data.targetPassword),
		{
			message: 'Target instance authentication is required',
			path: ['targetApiKey'],
		},
	);

export const crossInstanceConnectionTestResponseSchema = z.object({
	success: z.boolean(),
	instanceInfo: z
		.object({
			instanceId: z.string(),
			version: z.string(),
			healthy: z.boolean(),
			features: z.array(z.string()),
			supportsMigration: z.boolean(),
		})
		.optional(),
	error: z.string().optional(),
	recommendations: z.array(z.string()).optional(),
});

export class CrossInstanceTransferRequestDto extends Z.class({
	targetInstanceUrl: z.string().url(),
	targetApiKey: z.string().optional(),
	targetAuthToken: z.string().optional(),
	targetUsername: z.string().optional(),
	targetPassword: z.string().optional(),
	includeWorkflows: z.boolean().default(true),
	includeCredentials: z.boolean().default(true),
	includeCredentialData: z.boolean().default(false),
	includeUsers: z.boolean().default(false),
	includeSettings: z.boolean().default(false),
	projectIds: z.array(z.string()).optional(),
	conflictResolution: z.enum(['skip', 'overwrite', 'rename']).default('skip'),
	createMissingProjects: z.boolean().default(false),
	verifyTarget: z.boolean().default(true),
	timeout: z.number().min(30000).max(1800000).default(300000),
}) {}

export class CrossInstanceTransferResponseDto extends Z.class({
	transferId: z.string(),
	status: z.enum([
		'pending',
		'authenticating',
		'exporting',
		'uploading',
		'importing',
		'completed',
		'failed',
	]),
	targetInstanceUrl: z.string(),
	startedAt: z.date().optional(),
	completedAt: z.date().optional(),
	error: z.string().optional(),
	summary: z.object({
		totalResources: z.number(),
		transferred: z.number(),
		failed: z.number(),
		skipped: z.number().optional(),
	}),
	exportMetadata: z
		.object({
			exportId: z.string(),
			size: z.number(),
			summary: z.object({
				workflows: z.number(),
				credentials: z.number(),
				users: z.number(),
				settings: z.number(),
				projects: z.number(),
				tags: z.number(),
				variables: z.number(),
			}),
		})
		.optional(),
	targetInstanceInfo: z
		.object({
			instanceId: z.string(),
			version: z.string(),
			healthy: z.boolean(),
			features: z.array(z.string()),
		})
		.optional(),
}) {}

export class CrossInstanceConnectionTestRequestDto extends Z.class({
	targetInstanceUrl: z.string().url(),
	targetApiKey: z.string().optional(),
	targetAuthToken: z.string().optional(),
	targetUsername: z.string().optional(),
	targetPassword: z.string().optional(),
}) {}

export class CrossInstanceConnectionTestResponseDto extends Z.class({
	success: z.boolean(),
	instanceInfo: z
		.object({
			instanceId: z.string(),
			version: z.string(),
			healthy: z.boolean(),
			features: z.array(z.string()),
			supportsMigration: z.boolean(),
		})
		.optional(),
	error: z.string().optional(),
	recommendations: z.array(z.string()).optional(),
}) {}

export type CrossInstanceTransferRequest = z.infer<typeof crossInstanceTransferRequestSchema>;
export type CrossInstanceTransferResponse = z.infer<typeof crossInstanceTransferResponseSchema>;
export type CrossInstanceConnectionTestRequest = z.infer<typeof crossInstanceConnectionTestSchema>;
export type CrossInstanceConnectionTestResponse = z.infer<
	typeof crossInstanceConnectionTestResponseSchema
>;
