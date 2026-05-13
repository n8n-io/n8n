// ---------------------------------------------------------------------------
// Discovery check — assert the orchestrator reached for the expected tool(s).
//
// Reads the captured event outcome (`toolCalls` + `agentActivities`) and
// compares against a `DiscoveryTestCase.expectedToolInvocations` rule.
//
// "Invoked" means either:
//   - a top-level `tool-call` event with that tool name, OR
//   - an `agent-spawned` event whose payload `tools` array contains that name
//     (the sub-agent had access — even if it has not yet called it), OR
//   - the rule names `spawn_sub_agent:<role>` and a sub-agent with that role
//     was spawned.
//
// The asymmetry (sub-agent existence counts as discovery) matches the way
// Instance AI dispatches browser-credential-setup: the orchestrator hands off
// to a sub-agent and discovery has already happened by the time that
// sub-agent has tools attached.
// ---------------------------------------------------------------------------

import type { EventOutcome } from '../types';
import type { DiscoveryCheckResult, DiscoveryTestCase, ExpectedToolInvocations } from './types';

const SPAWN_PREFIX = 'spawn_sub_agent:';

function collectInvokedTools(outcome: EventOutcome): string[] {
	const tools = new Set<string>();
	for (const tc of outcome.toolCalls) {
		if (tc.toolName) tools.add(tc.toolName);
	}
	for (const agent of outcome.agentActivities) {
		for (const t of agent.tools) tools.add(t);
		for (const tc of agent.toolCalls) {
			if (tc.toolName) tools.add(tc.toolName);
		}
	}
	return [...tools];
}

function collectSpawnedAgents(outcome: EventOutcome): string[] {
	return outcome.agentActivities
		.filter((a) => a.role.length > 0)
		.map((a) => `${SPAWN_PREFIX}${a.role}`);
}

function matches(name: string, invokedTools: string[], spawnedAgents: string[]): boolean {
	if (name.startsWith(SPAWN_PREFIX)) {
		return spawnedAgents.includes(name);
	}
	return invokedTools.includes(name);
}

function validateRule(rule: ExpectedToolInvocations): void {
	const hasAnyOf = Array.isArray(rule.anyOf) && rule.anyOf.length > 0;
	const hasNoneOf = Array.isArray(rule.noneOf) && rule.noneOf.length > 0;
	if (!hasAnyOf && !hasNoneOf) {
		throw new Error('expectedToolInvocations must specify a non-empty `anyOf` or `noneOf` list');
	}
}

export function runExpectedToolsInvokedCheck(
	scenario: DiscoveryTestCase,
	outcome: EventOutcome,
): DiscoveryCheckResult {
	validateRule(scenario.expectedToolInvocations);

	const invokedTools = collectInvokedTools(outcome);
	const spawnedAgents = collectSpawnedAgents(outcome);

	const { anyOf, noneOf } = scenario.expectedToolInvocations;

	if (anyOf && anyOf.length > 0) {
		const matched = anyOf.find((name) => matches(name, invokedTools, spawnedAgents));
		if (!matched) {
			return {
				pass: false,
				comment: `Expected at least one of [${anyOf.join(', ')}] to be invoked. Invoked: [${invokedTools.join(', ') || '∅'}]; spawned: [${spawnedAgents.join(', ') || '∅'}].`,
				invokedTools,
				spawnedAgents,
			};
		}
	}

	if (noneOf && noneOf.length > 0) {
		const violated = noneOf.find((name) => matches(name, invokedTools, spawnedAgents));
		if (violated) {
			return {
				pass: false,
				comment: `Expected none of [${noneOf.join(', ')}] to be invoked, but [${violated}] was reached.`,
				invokedTools,
				spawnedAgents,
			};
		}
	}

	return {
		pass: true,
		comment: 'Discovery expectation satisfied.',
		invokedTools,
		spawnedAgents,
	};
}
