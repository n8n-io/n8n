// ---------------------------------------------------------------------------
// Temporary re-export façade (TRUST-342)
//
// harness/runner.ts was split into domain modules: build-workflow.ts,
// scenario-execution.ts, agent-execution.ts, seed-tables.ts and cleanup.ts.
// This façade keeps every `harness/runner` import stable while importers are
// repointed to the domain modules; it is deleted at the end of the split.
// ---------------------------------------------------------------------------

export {
	buildAgentVerificationArtifact,
	executeAgentScenario,
	fetchAgentScenarioContext,
	findAgentArtifactRef,
} from './agent-execution';
export { buildWorkflow, workflowExpectedForCase } from './build-workflow';
export type { BuildResult, BuildWorkflowConfig } from './build-workflow';
export {
	abortedWorkflowTestCaseResult,
	cleanupBuild,
	effectiveTimeoutMs,
	runWithConcurrency,
	runWorkflowChecks,
	summarizeMissingWorkflowError,
} from './cleanup';
export {
	buildVerificationArtifact,
	executeScenario,
	selectScenarioWorkflowId,
} from './scenario-execution';
export type { VerificationArtifact } from './scenario-execution';
export {
	buildSeededTablesNote,
	dedupeScenarioSeedTables,
	reseedScenarioTables,
	scenariosRequireSerialSeeding,
	warnAgentSeedDataTablesIgnored,
} from './seed-tables';
export type { ScenarioSeedContext } from './seed-tables';
