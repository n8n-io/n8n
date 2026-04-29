// ---------------------------------------------------------------------------
// Public API for the instance-ai workflow evaluation framework
//
// This module exports the domain logic used by the CLI (evaluations/cli/)
// and available for custom orchestration (e.g. LangSmith evaluate).
// ---------------------------------------------------------------------------

// -- Client & Auth --
export { N8nClient } from './clients/n8n-client';
export type { WorkflowResponse, WorkflowNodeResponse, ExecutionDetail } from './clients/n8n-client';

// -- Test case data --
export { loadWorkflowTestCasesWithFiles } from './data/workflows';
export type { WorkflowTestCaseWithFile } from './data/workflows';

// -- Credentials --
export { seedCredentials, cleanupCredentials } from './credentials/seeder';
export type { SeedResult } from './credentials/seeder';

// -- Runner (all-in-one) --
export { runWorkflowTestCase, runWithConcurrency } from './harness/runner';

// -- Runner (split API: build once, run scenarios independently) --
export { buildWorkflow, executeScenario, cleanupBuild } from './harness/runner';
export type { BuildResult, BuildWorkflowConfig } from './harness/runner';

// -- Workflow discovery --
export { snapshotWorkflowIds } from './outcome/workflow-discovery';

// -- Logger --
export { type EvalLogger, createLogger } from './harness/logger';

// -- Types --
export type {
	WorkflowTestCase,
	TestScenario,
	WorkflowTestCaseResult,
	ScenarioResult,
	ChecklistItem,
	ChecklistResult,
} from './types';
