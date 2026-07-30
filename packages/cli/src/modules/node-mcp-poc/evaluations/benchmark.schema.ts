import { z } from 'zod';

const jsonRecordSchema = z.record(z.string(), z.unknown());

export const benchmarkTaskSchema = z
	.object({
		id: z.string().min(1),
		title: z.string().min(1),
		prompt: z.string().min(1),
		categories: z.array(z.string().min(1)).min(1),
		variants: z.array(z.string().min(1)).min(1),
		timeoutMs: z.number().int().positive().default(120_000),
		oracle: z
			.object({
				allowedActionIds: z.array(z.string().min(1)).min(1),
				requiredInput: jsonRecordSchema,
				alternativeInputs: z.array(jsonRecordSchema).default([]),
				forbiddenInputPaths: z.array(z.string().min(1)).default([]),
				finalAnswerIncludes: z.array(z.string().min(1)).default([]),
			})
			.strict(),
		fixtures: z
			.object({
				document: z.object({ name: z.string(), id: z.string() }).strict().optional(),
				sheets: z
					.array(z.object({ name: z.string(), id: z.union([z.string(), z.number()]) }))
					.default([]),
				columns: z
					.array(
						z
							.object({
								name: z.string(),
								type: z.enum([
									'boolean',
									'number',
									'string',
									'string-alphanumeric',
									'dateTime',
									'time',
									'array',
									'object',
									'options',
									'url',
									'jwt',
									'form-fields',
									'binary',
								]),
							})
							.strict(),
					)
					.default([]),
				executionOutput: jsonRecordSchema.default({}),
				executionItems: z.array(jsonRecordSchema).optional(),
				operationOutputs: z.record(z.string(), z.array(jsonRecordSchema)).default({}),
				resolutionOptions: z
					.record(
						z.string(),
						z.array(
							z
								.object({
									name: z.string(),
									value: z.union([z.string(), z.number(), z.boolean()]),
								})
								.strict(),
						),
					)
					.default({}),
			})
			.strict(),
		source: z
			.object({
				kind: z.literal('recorded-conversation'),
				threadId: z.string(),
				relatedThreadIds: z.array(z.string()).default([]),
				agentName: z.string(),
				catalogVersion: z.string(),
				model: z.string(),
				observedDurationMs: z.number().nonnegative(),
				observedPromptTokens: z.number().nonnegative(),
				observedCompletionTokens: z.number().nonnegative(),
				observedCostUsd: z.number().nonnegative(),
			})
			.strict(),
	})
	.strict();

export type BenchmarkTask = z.infer<typeof benchmarkTaskSchema>;

export const toolCallCategorySchema = z.enum([
	'discovery',
	'contract',
	'resolution',
	'execution',
	'other',
]);

export const toolCallOutcomeSchema = z.enum([
	'succeeded',
	'protocol_invalid',
	'semantic_invalid',
	'execution_error',
]);

export type ToolCallOutcome = z.infer<typeof toolCallOutcomeSchema>;

export const toolCallRecordSchema = z
	.object({
		toolCallId: z.string(),
		toolName: z.string(),
		category: toolCallCategorySchema,
		input: z.unknown(),
		output: z.unknown().optional(),
		outcome: toolCallOutcomeSchema.optional(),
		startedAt: z.number(),
		finishedAt: z.number().optional(),
		durationMs: z.number().nonnegative().optional(),
	})
	.strict();

export type ToolCallRecord = z.infer<typeof toolCallRecordSchema>;

export const benchmarkJudgeSchema = z
	.object({
		model: z.string(),
		version: z.string(),
		validExecution: z.boolean(),
		matchingToolCallId: z.string().nullable(),
		reason: z.string(),
		usage: z
			.object({
				promptTokens: z.number().nonnegative(),
				completionTokens: z.number().nonnegative(),
				totalTokens: z.number().nonnegative(),
				cost: z.number().nonnegative().optional(),
			})
			.optional(),
	})
	.strict();

export type BenchmarkJudge = z.infer<typeof benchmarkJudgeSchema>;

export const benchmarkRunSchema = z
	.object({
		runId: z.string(),
		taskId: z.string(),
		model: z.string(),
		variant: z.string(),
		repetition: z.number().int().positive(),
		startedAt: z.string(),
		durationMs: z.number().nonnegative(),
		finishReason: z.string().optional(),
		finalAnswer: z.string(),
		success: z.boolean(),
		verdictReasons: z.array(z.string()),
		usage: z
			.object({
				promptTokens: z.number().nonnegative(),
				completionTokens: z.number().nonnegative(),
				totalTokens: z.number().nonnegative(),
				cost: z.number().nonnegative().optional(),
				cacheReadTokens: z.number().nonnegative().optional(),
				cacheWriteTokens: z.number().nonnegative().optional(),
			})
			.optional(),
		judge: benchmarkJudgeSchema.optional(),
		toolCalls: z.array(toolCallRecordSchema),
	})
	.strict();

export type BenchmarkRun = z.infer<typeof benchmarkRunSchema>;
