import { z } from 'zod';
import { Z } from 'zod-class';

export const instanceMigrationStatusSchema = z.object({
	id: z.string(),
	type: z.enum(['export', 'import']),
	status: z.enum(['pending', 'running', 'completed', 'failed']),
	progress: z.number().min(0).max(100),
	startedAt: z.date(),
	completedAt: z.date().optional(),
	error: z.string().optional(),
	currentStep: z.string().optional(),
	estimatedTimeRemaining: z.number().optional(),
	processedCount: z.number().optional(),
	totalCount: z.number().optional(),
});

export const instanceMigrationValidationSchema = z.object({
	isValid: z.boolean(),
	errors: z.array(
		z.object({
			code: z.string(),
			message: z.string(),
			details: z.any().optional(),
		}),
	),
	warnings: z.array(
		z.object({
			code: z.string(),
			message: z.string(),
			details: z.any().optional(),
		}),
	),
	recommendations: z.array(
		z.object({
			code: z.string(),
			message: z.string(),
			priority: z.enum(['low', 'medium', 'high']).optional(),
		}),
	),
	compatibility: z.object({
		version: z.enum(['compatible', 'warning', 'incompatible']),
		database: z.enum(['compatible', 'warning', 'incompatible']),
		features: z.enum(['compatible', 'warning', 'incompatible']),
	}),
	requirements: z
		.object({
			minimumN8nVersion: z.string().optional(),
			requiredFeatures: z.array(z.string()).optional(),
			databaseMigrations: z.boolean().optional(),
		})
		.optional(),
});

export class InstanceMigrationStatusDto extends Z.class({
	id: z.string(),
	type: z.enum(['export', 'import']),
	status: z.enum(['pending', 'running', 'completed', 'failed']),
	progress: z.number().min(0).max(100),
	startedAt: z.date(),
	completedAt: z.date().optional(),
	error: z.string().optional(),
	currentStep: z.string().optional(),
	estimatedTimeRemaining: z.number().optional(),
	processedCount: z.number().optional(),
	totalCount: z.number().optional(),
}) {}

export class InstanceMigrationValidationDto extends Z.class({
	isValid: z.boolean(),
	errors: z.array(
		z.object({
			code: z.string(),
			message: z.string(),
			details: z.any().optional(),
		}),
	),
	warnings: z.array(
		z.object({
			code: z.string(),
			message: z.string(),
			details: z.any().optional(),
		}),
	),
	recommendations: z.array(
		z.object({
			code: z.string(),
			message: z.string(),
			priority: z.enum(['low', 'medium', 'high']).optional(),
		}),
	),
	compatibility: z.object({
		version: z.enum(['compatible', 'warning', 'incompatible']),
		database: z.enum(['compatible', 'warning', 'incompatible']),
		features: z.enum(['compatible', 'warning', 'incompatible']),
	}),
	requirements: z
		.object({
			minimumN8nVersion: z.string().optional(),
			requiredFeatures: z.array(z.string()).optional(),
			databaseMigrations: z.boolean().optional(),
		})
		.optional(),
}) {}

export type InstanceMigrationStatus = z.infer<typeof instanceMigrationStatusSchema>;
export type InstanceMigrationValidation = z.infer<typeof instanceMigrationValidationSchema>;
