// ---------------------------------------------------------------------------
// Tool-discovery scenario types — guards browser/computer-use discoverability.
//
// Discovery scenarios run the orchestrator against a user message that should
// (or should not) cause a specific tool / sub-agent to be reached for, and
// assert the captured events match the expectation. Workflow-build scenarios
// in evaluations/data/workflows/ assert the *output workflow*; discovery
// scenarios assert the *agent's tool/dispatch behavior*.
// ---------------------------------------------------------------------------

import type { LocalGatewayStatus } from '../../src/types';

/**
 * Pass condition for tool invocations.
 *
 * - `anyOf` — pass if at least one of the listed tool names was invoked
 *   (top-level orchestrator call, or via a spawned sub-agent's tool list).
 * - `noneOf` — pass only if NONE of the listed tool names was invoked.
 *   Used for negative scenarios that guard against over-eager invocation.
 *
 * Both forms accept a sub-agent role prefix `spawn_sub_agent:<role>` to match
 * an `agent-spawned` event whose role equals `<role>`.
 */
export interface ExpectedToolInvocations {
	anyOf?: string[];
	noneOf?: string[];
}

/**
 * Optional instance configuration overrides for a discovery scenario.
 * Mirrors a subset of `SystemPromptOptions` so a scenario can pin the gateway
 * status (e.g. `disabledGlobally` to test the "explain how to enable" branch).
 */
export interface DiscoveryInstanceState {
	localGateway?: LocalGatewayStatus;
	browserAvailable?: boolean;
}

export interface DiscoveryTestCase {
	/** Unique scenario identifier — also used as the scenario filename (without .json). */
	id: string;
	/** The user message sent to the orchestrator. */
	userMessage: string;
	/** Optional instance state overrides applied when constructing the agent. */
	instanceState?: DiscoveryInstanceState;
	/** Pass condition. Exactly one of the form keys (`anyOf` / `noneOf`) is required. */
	expectedToolInvocations: ExpectedToolInvocations;
	/** Free-form note explaining what regression this scenario protects against. */
	rationale?: string;
}

export interface DiscoveryCheckResult {
	pass: boolean;
	/** Human-readable reason — included in failure reports. */
	comment: string;
	/** Tool names actually invoked during the run (top-level + via sub-agents). */
	invokedTools: string[];
	/** `spawn_sub_agent:<role>` markers for every spawned sub-agent. */
	spawnedAgents: string[];
}
