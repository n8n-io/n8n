import { z } from 'zod';

export const metricOutputTypeSchema = z.enum(['numeric', 'boolean']);

export const expressionMetricConfigSchema = z.object({
	expression: z.string().min(1),
	outputType: metricOutputTypeSchema,
});

export const llmJudgeMetricPresetSchema = z.enum(['correctness', 'helpfulness']);

export const llmJudgeMetricInputsSchema = z.object({
	actualAnswer: z.string().min(1),
	userQuery: z.string().optional(),
	expectedAnswer: z.string().optional(),
});

export const llmJudgeMetricConfigSchema = z
	.object({
		preset: llmJudgeMetricPresetSchema,
		prompt: z.string().min(1),
		provider: z.string().min(1),
		credentialId: z.string().min(1),
		model: z.string().min(1),
		outputType: metricOutputTypeSchema,
		inputs: llmJudgeMetricInputsSchema,
	})
	.superRefine((config, ctx) => {
		if (config.preset === 'correctness' && !config.inputs.expectedAnswer) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['inputs', 'expectedAnswer'],
				message: 'Expected answer is required for the correctness preset',
			});
		}
		if (config.preset === 'helpfulness' && !config.inputs.userQuery) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['inputs', 'userQuery'],
				message: 'User query is required for the helpfulness preset',
			});
		}
	});

export type LlmJudgeMetricPreset = z.infer<typeof llmJudgeMetricPresetSchema>;
export type LlmJudgeMetricInputs = z.infer<typeof llmJudgeMetricInputsSchema>;

export const evaluationMetricSchema = z.discriminatedUnion('type', [
	z.object({
		id: z.string().min(1),
		name: z.string().min(1),
		type: z.literal('expression'),
		config: expressionMetricConfigSchema,
	}),
	z.object({
		id: z.string().min(1),
		name: z.string().min(1),
		type: z.literal('llm_judge'),
		config: llmJudgeMetricConfigSchema,
	}),
]);

export type EvaluationMetric = z.infer<typeof evaluationMetricSchema>;
export type MetricOutputType = z.infer<typeof metricOutputTypeSchema>;

export const dataTableDatasetRefSchema = z.object({
	dataTableId: z.string().min(1),
});

export const googleSheetsDatasetRefSchema = z.object({
	credentialId: z.string().min(1),
	spreadsheetId: z.string().min(1),
	sheetName: z.string().min(1),
	headerRow: z.number().int().positive().optional(),
});

export type DataTableDatasetRef = z.infer<typeof dataTableDatasetRefSchema>;
export type GoogleSheetsDatasetRef = z.infer<typeof googleSheetsDatasetRefSchema>;

export const datasetRefSchema = z.discriminatedUnion('datasetSource', [
	z.object({
		datasetSource: z.literal('data_table'),
		datasetRef: dataTableDatasetRefSchema,
	}),
	z.object({
		datasetSource: z.literal('google_sheets'),
		datasetRef: googleSheetsDatasetRefSchema,
	}),
]);

export type DatasetRef = z.infer<typeof datasetRefSchema>;

export const evaluationConfigStatusSchema = z.enum(['valid', 'invalid']);
export type EvaluationConfigStatus = z.infer<typeof evaluationConfigStatusSchema>;

export const evaluationConfigSchema = z
	.object({
		id: z.string().min(1),
		workflowId: z.string().min(1),
		name: z.string().min(1).max(128),
		status: evaluationConfigStatusSchema,
		invalidReason: z.string().nullable(),
		startNodeName: z.string().min(1),
		endNodeName: z.string().min(1),
		metrics: z.array(evaluationMetricSchema).min(1),
	})
	.and(datasetRefSchema);

export type EvaluationConfigDto = z.infer<typeof evaluationConfigSchema>;

export const upsertEvaluationConfigSchema = z
	.object({
		name: z.string().min(1).max(128),
		startNodeName: z.string().min(1),
		endNodeName: z.string().min(1),
		metrics: z.array(evaluationMetricSchema).min(1),
	})
	.and(datasetRefSchema);

export type UpsertEvaluationConfigDto = z.infer<typeof upsertEvaluationConfigSchema>;
