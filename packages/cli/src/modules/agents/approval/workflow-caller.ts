import { jsonParse, type RelatedExecution } from 'n8n-workflow';
import { z } from 'zod';

const CALLER_SCHEMA = z.object({ executionId: z.string(), workflowId: z.string() });

export function readWorkflowCaller(value: unknown): RelatedExecution | undefined {
	if (typeof value !== 'string') return undefined;
	const parsed = CALLER_SCHEMA.safeParse(jsonParse<unknown>(value, { fallbackValue: null }));
	return parsed.success ? parsed.data : undefined;
}
