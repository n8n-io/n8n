import { z } from 'zod';

import { SUPPORTED_CREDENTIAL_TYPES } from '../../credentials/seeder';

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
	 * Credentials visible to this case's build. Created for real before the
	 * build and pinned as the thread's entire credential view; omitted → the
	 * build sees no credentials.
	 */
	credentials: z
		.array(
			z.object({
				// Validated against the seeder's templates so an authoring typo fails
				// at case-load time instead of per-build as an agent failure.
				type: z
					.string()
					.min(1)
					.refine((t) => SUPPORTED_CREDENTIAL_TYPES.has(t), {
						message: `unknown credential type — add a template to evaluations/credentials/seeder.ts (supported: ${[...SUPPORTED_CREDENTIAL_TYPES].join(', ')})`,
					}),
				name: z.string().min(1).optional(),
			}),
		)
		.optional(),
	/**
	 * Logical groupings this case belongs to (e.g. `['pr', 'full']`). Used by
	 * the eval CLI's `--tier` flag and propagated to LangSmith as example
	 * splits, so subsets can be evaluated and compared independently. Defaults
	 * to `['full']` — cases without this field run in the full suite only.
	 */
	datasets: z.array(z.string()).min(1).default(['full']),
});

export type WorkflowTestCaseInput = z.infer<typeof WorkflowTestCaseSchema>;
