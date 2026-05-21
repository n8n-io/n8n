// ---------------------------------------------------------------------------
// Zod schemas for workflow test case fixtures.
//
// Fixtures are JSON files under `data/workflows/*.json`. Before this schema,
// they were parsed with `JSON.parse() as WorkflowTestCase`, which silently
// accepted malformed shapes (missing fields, wrong types) and only crashed
// far downstream in the harness. Validating at load time surfaces typos and
// shape mistakes with the exact file path before any container spins up.
// ---------------------------------------------------------------------------

import { z } from 'zod';

const ConversationTurnSchema = z.object({
	role: z.enum(['user', 'assistant']),
	text: z.string(),
});

const ExecutionScenarioSchema = z.object({
	name: z.string().min(1),
	description: z.string(),
	dataSetup: z.string(),
	successCriteria: z.string(),
	// `requires: "mock-server"` appears in some fixtures as an informational
	// hint. Nothing reads it today; accept it so fixtures keep parsing.
	requires: z.string().optional(),
});

export const WorkflowTestCaseSchema = z.object({
	conversation: z.array(ConversationTurnSchema).min(1),
	complexity: z.enum(['simple', 'medium', 'complex']),
	tags: z.array(z.string()),
	triggerType: z.enum(['manual', 'webhook', 'schedule', 'form']).optional(),
	executionScenarios: z.array(ExecutionScenarioSchema).min(1),
	messageBudget: z.number().int().positive().optional(),
});

export type WorkflowTestCaseInput = z.infer<typeof WorkflowTestCaseSchema>;
