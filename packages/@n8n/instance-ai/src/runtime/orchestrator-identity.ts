/**
 * Per-run orchestrator agent id, derived from the run's cryptographic id.
 * Deterministic so every emitter and recovery path agrees without persisting a
 * separate field; unique across runs, stable within a run.
 */
export function orchestratorAgentId(runId: string): string {
	return `orchestrator-${runId}`;
}
