import { z } from 'zod';
import { Z } from 'zod-class';

// Bulk Activation DTOs
export class BulkActivateWorkflowsRequestDto extends Z.class({
	workflowIds: z.array(z.string().uuid()).min(1).max(100),
	forceActivation: z.boolean().optional().default(false),
}) {}

export class BulkActivateWorkflowsResponseDto extends Z.class({
	success: z.array(
		z.object({
			workflowId: z.string().uuid(),
			name: z.string(),
			activated: z.boolean(),
			message: z.string(),
			activatedAt: z.string().datetime().optional(),
		}),
	),
	errors: z.array(
		z.object({
			workflowId: z.string().uuid(),
			name: z.string().optional(),
			error: z.string(),
			code: z.enum(['NOT_FOUND', 'PERMISSION_DENIED', 'ALREADY_ACTIVE', 'ACTIVATION_FAILED']),
		}),
	),
	totalProcessed: z.number(),
	successCount: z.number(),
	errorCount: z.number(),
	metadata: z.object({
		processedAt: z.string().datetime(),
		forceActivation: z.boolean(),
		processingTimeMs: z.number(),
	}),
}) {}

// Bulk Deactivation DTOs
export class BulkDeactivateWorkflowsRequestDto extends Z.class({
	workflowIds: z.array(z.string().uuid()).min(1).max(100),
	forceDeactivation: z.boolean().optional().default(false),
}) {}

export class BulkDeactivateWorkflowsResponseDto extends Z.class({
	success: z.array(
		z.object({
			workflowId: z.string().uuid(),
			name: z.string(),
			deactivated: z.boolean(),
			message: z.string(),
			deactivatedAt: z.string().datetime().optional(),
		}),
	),
	errors: z.array(
		z.object({
			workflowId: z.string().uuid(),
			name: z.string().optional(),
			error: z.string(),
			code: z.enum(['NOT_FOUND', 'PERMISSION_DENIED', 'ALREADY_INACTIVE', 'DEACTIVATION_FAILED']),
		}),
	),
	totalProcessed: z.number(),
	successCount: z.number(),
	errorCount: z.number(),
	metadata: z.object({
		processedAt: z.string().datetime(),
		forceDeactivation: z.boolean(),
		processingTimeMs: z.number(),
	}),
}) {}

// Bulk Update DTOs
export class BulkUpdateWorkflowsRequestDto extends Z.class({
	workflowIds: z.array(z.string().uuid()).min(1).max(50),
	updates: z.object({
		name: z.string().optional(),
		active: z.boolean().optional(),
		tags: z.array(z.string().uuid()).optional(),
		settings: z.record(z.any()).optional(),
		projectId: z.string().uuid().optional(),
		parentFolderId: z.string().uuid().optional(),
	}),
	updateMode: z.enum(['merge', 'replace']).optional().default('merge'),
}) {}

export class BulkUpdateWorkflowsResponseDto extends Z.class({
	success: z.array(
		z.object({
			workflowId: z.string().uuid(),
			name: z.string(),
			updated: z.boolean(),
			message: z.string(),
			updatedAt: z.string().datetime().optional(),
			changes: z.array(z.string()).optional(),
		}),
	),
	errors: z.array(
		z.object({
			workflowId: z.string().uuid(),
			name: z.string().optional(),
			error: z.string(),
			code: z.enum(['NOT_FOUND', 'PERMISSION_DENIED', 'VALIDATION_FAILED', 'UPDATE_FAILED']),
		}),
	),
	totalProcessed: z.number(),
	successCount: z.number(),
	errorCount: z.number(),
	metadata: z.object({
		processedAt: z.string().datetime(),
		updateMode: z.enum(['merge', 'replace']),
		processingTimeMs: z.number(),
		appliedUpdates: z.record(z.any()),
	}),
}) {}

// Batch Processing Status DTOs
export class BatchOperationStatusDto extends Z.class({
	batchId: z.string().uuid(),
	operation: z.enum(['activate', 'deactivate', 'update', 'transfer']),
	status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
	progress: z.object({
		processed: z.number(),
		total: z.number(),
		percentage: z.number(),
	}),
	results: z
		.object({
			successCount: z.number(),
			errorCount: z.number(),
			errors: z
				.array(
					z.object({
						workflowId: z.string().uuid(),
						error: z.string(),
						code: z.string(),
					}),
				)
				.optional(),
		})
		.optional(),
	metadata: z.object({
		startedAt: z.string().datetime(),
		completedAt: z.string().datetime().optional(),
		estimatedCompletion: z.string().datetime().optional(),
		processingTimeMs: z.number().optional(),
	}),
}) {}

// Workflow Operation Summary DTO
export class WorkflowOperationSummaryDto extends Z.class({
	workflowId: z.string().uuid(),
	name: z.string(),
	operation: z.enum(['activate', 'deactivate', 'update', 'transfer']),
	status: z.enum(['success', 'error', 'skipped']),
	message: z.string(),
	timestamp: z.string().datetime(),
	metadata: z.record(z.any()).optional(),
	error: z
		.object({
			code: z.string(),
			message: z.string(),
			details: z.any().optional(),
		})
		.optional(),
}) {}

// Enterprise Batch Processing Request DTO
export class EnterpriseBatchProcessingRequestDto extends Z.class({
	operations: z
		.array(
			z.object({
				type: z.enum(['activate', 'deactivate', 'update', 'transfer']),
				workflowIds: z.array(z.string().uuid()),
				parameters: z.record(z.any()).optional(),
			}),
		)
		.min(1)
		.max(20),
	priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
	scheduledFor: z.string().datetime().optional(),
	webhook: z
		.object({
			url: z.string().url(),
			method: z.enum(['POST', 'PUT']).optional().default('POST'),
			headers: z.record(z.string()).optional(),
		})
		.optional(),
}) {}

export class EnterpriseBatchProcessingResponseDto extends Z.class({
	batchId: z.string().uuid(),
	operations: z.array(
		z.object({
			operationId: z.string().uuid(),
			type: z.enum(['activate', 'deactivate', 'update', 'transfer']),
			workflowCount: z.number(),
			status: z.enum(['queued', 'processing', 'completed', 'failed']),
		}),
	),
	status: z.enum(['queued', 'processing', 'completed', 'failed']),
	estimatedCompletion: z.string().datetime().optional(),
	metadata: z.object({
		priority: z.enum(['low', 'normal', 'high']),
		queuedAt: z.string().datetime(),
		totalOperations: z.number(),
		totalWorkflows: z.number(),
	}),
}) {}
