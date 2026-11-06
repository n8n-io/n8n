import '../../openapi-extend';

import { z } from 'zod';

import {
	llmUsageCallFieldDocs as docs,
	llmUsageCallsQueryFieldDocs,
} from './llm-usage-public.openapi';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

const dateTimeQuerySchema = z
	.string()
	.datetime({ offset: true })
	.refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid datetime');

export class ListLlmUsageCallsQueryPublicDto extends Z.class(
	{
		startDate: dateTimeQuerySchema.optional().openapi(llmUsageCallsQueryFieldDocs.startDate),
		endDate: dateTimeQuerySchema.optional().openapi(llmUsageCallsQueryFieldDocs.endDate),
		limit: publicApiPaginationSchema.limit,
		cursor: z.string().optional(),
	},
	{ strict: true },
) {}

const llmUsageCallPublicSchema = z.object({
	callId: z.string().openapi(docs.callId),
	startedAt: z.string().datetime().nullable().openapi(docs.startedAt),
	finishedAt: z.string().datetime().openapi(docs.finishedAt),
	durationMs: z.number().nullable().openapi(docs.durationMs),
	callerType: z.string().openapi(docs.callerType),
	workflowId: z.string().nullable().openapi(docs.workflowId),
	executionId: z.string().nullable().openapi(docs.executionId),
	executionMode: z.string().nullable().openapi(docs.executionMode),
	nodeName: z.string().nullable().openapi(docs.nodeName),
	nodeType: z.string().nullable().openapi(docs.nodeType),
	agentId: z.string().nullable().openapi(docs.agentId),
	threadId: z.string().nullable().openapi(docs.threadId),
	projectId: z.string().nullable().openapi(docs.projectId),
	userId: z.string().nullable().openapi(docs.userId),
	credentialId: z.string().nullable().openapi(docs.credentialId),
	managedBy: z.enum(['aiGateway', 'assistant']).nullable().openapi(docs.managedBy),
	provider: z.string().openapi(docs.provider),
	model: z.string().openapi(docs.model),
	inputTokens: z.number().openapi(docs.inputTokens),
	outputTokens: z.number().openapi(docs.outputTokens),
	cacheReadTokens: z.number().openapi(docs.cacheReadTokens),
	cacheWriteTokens: z.number().openapi(docs.cacheWriteTokens),
	estimatedCostUsd: z.number().nullable().openapi(docs.estimatedCostUsd),
});

export class LlmUsageCallPublicDto extends Z.class(llmUsageCallPublicSchema.shape) {}

export class LlmUsageCallListPublicDto extends Z.class({
	data: z.array(llmUsageCallPublicSchema),
	nextCursor: z.string().nullable(),
}) {}
