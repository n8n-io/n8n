// ---------------------------------------------------------------------------
// Zod schemas for workflow test case fixtures.
//
// Fixtures are JSON files under `data/workflows/*.json`. Until now they were
// parsed with `JSON.parse() as WorkflowTestCase`, which silently accepts
// malformed shapes. The schema catches typos and missing fields at load time,
// before the harness spends time on builds or container setup.
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const TestScenarioSchema = z.object({
	name: z.string().min(1),
	description: z.string(),
	dataSetup: z.string(),
	successCriteria: z.string(),
	binaryChecks: z.array(z.string()).optional(),
	annotations: z.record(z.unknown()).optional(),
	// `requires: "mock-server"` appears in some fixtures as an informational hint.
	// Nothing reads it today; accept it so fixtures keep parsing.
	requires: z.string().optional(),
});

export const WorkflowTestCaseSchema = z.object({
	prompt: z.string().min(1),
	complexity: z.enum(['simple', 'medium', 'complex']),
	tags: z.array(z.string()),
	triggerType: z.enum(['manual', 'webhook', 'schedule', 'form']).optional(),
	scenarios: z.array(TestScenarioSchema).min(1),
});

export type TestScenarioInput = z.infer<typeof TestScenarioSchema>;
export type WorkflowTestCaseInput = z.infer<typeof WorkflowTestCaseSchema>;
