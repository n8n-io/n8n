import { z } from 'zod';

import { Z } from '../zod-class';

export const instanceAiLearningKindSchema = z.enum([
	'preference',
	'environment_fact',
	'hypothesis',
]);
export type InstanceAiLearningKind = z.infer<typeof instanceAiLearningKindSchema>;

export const instanceAiLearningSensitivitySchema = z.enum(['internal', 'public', 'sensitive']);
export type InstanceAiLearningSensitivity = z.infer<typeof instanceAiLearningSensitivitySchema>;

export const instanceAiLearningReviewStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type InstanceAiLearningReviewStatus = z.infer<typeof instanceAiLearningReviewStatusSchema>;

export const instanceAiLearningRunStatusSchema = z.enum([
	'queued',
	'running',
	'completed',
	'error',
]);
export type InstanceAiLearningRunStatus = z.infer<typeof instanceAiLearningRunStatusSchema>;

export const instanceAiLearningRunStageSchema = z.enum(['observe', 'reduce', 'completed']);
export type InstanceAiLearningRunStage = z.infer<typeof instanceAiLearningRunStageSchema>;

export const instanceAiWorkflowObservationSchema = z
	.object({
		id: z.string(),
		lens: z.enum([
			'architecture',
			'systems_of_record',
			'error_handling',
			'notifications',
			'naming',
			'credentials',
			'prompts',
			'data_transform',
			'other',
		]),
		observation: z.string(),
		nodeIds: z.array(z.string()),
		nodeNames: z.array(z.string()),
	})
	.strict();

export const instanceAiWorkflowObservationDocumentSchema = z
	.object({
		workflowId: z.string(),
		workflowName: z.string(),
		observations: z.array(instanceAiWorkflowObservationSchema),
	})
	.strict();
export type InstanceAiWorkflowObservationDocument = z.infer<
	typeof instanceAiWorkflowObservationDocumentSchema
>;

export const instanceAiGeneratedLearningSchema = z
	.object({
		statement: z.string(),
		kind: instanceAiLearningKindSchema,
		appliesWhen: z.string(),
		supportingWorkflowIds: z.array(z.string()),
		supportingObservationIds: z.array(z.string()),
		supportingWorkflowCount: z.number().int(),
		counterexampleWorkflowIds: z.array(z.string()),
		counterexampleCount: z.number().int(),
		confidence: z.number(),
		sensitivity: instanceAiLearningSensitivitySchema,
		transferability: z.string(),
		rejectedAlternatives: z.array(z.string()),
	})
	.strict();
export type InstanceAiGeneratedLearning = z.infer<typeof instanceAiGeneratedLearningSchema>;

export const instanceAiLearningReductionSchema = z
	.object({
		learnings: z.array(instanceAiGeneratedLearningSchema),
		rejected: z.array(
			z
				.object({
					candidate: z.string(),
					reason: z.string(),
				})
				.strict(),
		),
		methodNotes: z.string(),
	})
	.strict();
export type InstanceAiLearningReduction = z.infer<typeof instanceAiLearningReductionSchema>;

export const instanceAiLearningEvidenceSchema = instanceAiGeneratedLearningSchema.pick({
	supportingWorkflowIds: true,
	supportingObservationIds: true,
	supportingWorkflowCount: true,
	counterexampleWorkflowIds: true,
	counterexampleCount: true,
	rejectedAlternatives: true,
});
export type InstanceAiLearningEvidence = z.infer<typeof instanceAiLearningEvidenceSchema>;

export const instanceAiLearningRunSchema = z
	.object({
		id: z.string(),
		projectId: z.string(),
		status: instanceAiLearningRunStatusSchema,
		stage: instanceAiLearningRunStageSchema,
		workflowIds: z.array(z.string()),
		totalWorkflows: z.number().int(),
		completedWorkflows: z.number().int(),
		error: z.string().nullable(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.strict();
export type InstanceAiLearningRun = z.infer<typeof instanceAiLearningRunSchema>;

export const instanceAiLearningSchema = z
	.object({
		id: z.string(),
		projectId: z.string(),
		runId: z.string(),
		statement: z.string(),
		kind: instanceAiLearningKindSchema,
		appliesWhen: z.string(),
		confidence: z.number(),
		sensitivity: instanceAiLearningSensitivitySchema,
		transferability: z.string(),
		evidence: instanceAiLearningEvidenceSchema,
		reviewStatus: instanceAiLearningReviewStatusSchema,
		enabled: z.boolean(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.strict();
export type InstanceAiLearning = z.infer<typeof instanceAiLearningSchema>;

const startInstanceAiLearningRunShape = {
	workflowIds: z.array(z.string()).min(1),
	publishedOnly: z.boolean().optional().default(true),
};
export class StartInstanceAiLearningRunDto extends Z.class(startInstanceAiLearningRunShape) {}

const listInstanceAiLearningsShape = {
	query: z.string().optional(),
	reviewStatus: instanceAiLearningReviewStatusSchema.optional(),
};
export class ListInstanceAiLearningsQueryDto extends Z.class(listInstanceAiLearningsShape) {}

const updateInstanceAiLearningShape = {
	reviewStatus: instanceAiLearningReviewStatusSchema.optional(),
	enabled: z.boolean().optional(),
	statement: z.string().min(1).optional(),
	appliesWhen: z.string().min(1).optional(),
};
export class UpdateInstanceAiLearningDto extends Z.class(updateInstanceAiLearningShape) {}
