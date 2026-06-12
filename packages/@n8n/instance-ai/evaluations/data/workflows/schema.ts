import { z } from 'zod';

const ConversationTurnSchema = z.object({
	role: z.enum(['user', 'assistant']),
	// A string, or an array of lines joined with newlines. The array form lets
	// long stage directions be authored readably (one line per element) in the
	// JSON file; every consumer still receives a single string.
	text: z
		.union([z.string(), z.array(z.string())])
		.transform((t) => (Array.isArray(t) ? t.join('\n') : t)),
});

const ExecutionScenarioSchema = z.object({
	name: z.string().min(1),
	description: z.string(),
	dataSetup: z.string(),
	successCriteria: z.string(),
	requires: z.string().optional(),
});

export const WorkflowTestCaseSchema = z.object({
	/** Optional human-readable note on what this case is testing (esp. for behaviour cases). */
	description: z.string().optional(),
	conversation: z.array(ConversationTurnSchema).min(1),
	complexity: z.enum(['simple', 'medium', 'complex']),
	tags: z.array(z.string()),
	triggerType: z.enum(['manual', 'webhook', 'schedule', 'form']).optional(),
	executionScenarios: z.array(ExecutionScenarioSchema).min(1),
	messageBudget: z.number().int().positive().optional(),
	/** Optional NL assertions about the build conversation; LLM-judged, counted as units in the pass rate. */
	buildExpectations: z.array(z.string().min(1)).optional(),
	/**
	 * Logical groupings this case belongs to (e.g. `['pr', 'full']`). Used by
	 * the eval CLI's `--tier` flag and propagated to LangSmith as example
	 * splits, so subsets can be evaluated and compared independently. Defaults
	 * to `['full']` — cases without this field run in the full suite only.
	 */
	datasets: z.array(z.string()).min(1).default(['full']),
});

export type WorkflowTestCaseInput = z.infer<typeof WorkflowTestCaseSchema>;
