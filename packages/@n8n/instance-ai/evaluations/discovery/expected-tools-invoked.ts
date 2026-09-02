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
// The asymmetry (sub-agent existence counts as discovery) lets dispatch checks
// assert that a specialized background agent was reached even before it emits
// its own tool calls.
// ---------------------------------------------------------------------------

import { isRecord } from '@n8n/utils/is-record';

import type { EventOutcome } from '../types';
import type {
	DiscoveryCheckResult,
	DiscoveryTestCase,
	DiscoveryTrialFacts,
	ExpectedToolInvocations,
	ForbiddenToolCall,
} from './types';

const SPAWN_PREFIX = 'spawn_sub_agent:';

function collectInvokedTools(outcome: EventOutcome): string[] {
	const tools = new Set<string>();
	for (const tc of outcome.toolCalls) {
		if (tc.toolName && !wasDeclined(tc)) tools.add(tc.toolName);
	}
	for (const agent of outcome.agentActivities) {
		for (const t of agent.tools) tools.add(t);
		for (const tc of agent.toolCalls) {
			if (tc.toolName && !wasDeclined(tc)) tools.add(tc.toolName);
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
	const hasAnyOfToolCalls = Array.isArray(rule.anyOfToolCalls) && rule.anyOfToolCalls.length > 0;
	const hasAllOfToolCalls = Array.isArray(rule.allOfToolCalls) && rule.allOfToolCalls.length > 0;
	const hasNoneOfToolCalls = Array.isArray(rule.noneOfToolCalls) && rule.noneOfToolCalls.length > 0;
	if (!hasAnyOf && !hasNoneOf && !hasAnyOfToolCalls && !hasAllOfToolCalls && !hasNoneOfToolCalls) {
		throw new Error(
			'expectedToolInvocations must specify a non-empty `anyOf`, `noneOf`, `anyOfToolCalls`, `allOfToolCalls`, or `noneOfToolCalls` list',
		);
	}
}

function wasDeclined(toolCall: EventOutcome['toolCalls'][number]): boolean {
	return isRecord(toolCall.result) && toolCall.result.declined === true;
}

function toolCallMatchesExpectation(
	toolCall: EventOutcome['toolCalls'][number],
	expectation: ForbiddenToolCall,
): boolean {
	if (wasDeclined(toolCall) !== (expectation.declined ?? false)) return false;
	if (toolCall.toolName !== expectation.toolName) return false;
	if (expectation.args && !matchesArgPattern(expectation.args, toolCall.args)) return false;

	const argsContainAny = expectation.argsContainAny ?? [];
	if (argsContainAny.length === 0) return true;

	const argsText = JSON.stringify(toolCall.args).toLowerCase();
	return argsContainAny.some((term) => argsText.includes(term.toLowerCase()));
}

function matchesArgPattern(pattern: unknown, actual: unknown): boolean {
	if (Array.isArray(pattern)) {
		return (
			Array.isArray(actual) &&
			pattern.every((item) => actual.some((candidate) => matchesArgPattern(item, candidate)))
		);
	}
	if (isRecord(pattern)) {
		return (
			isRecord(actual) &&
			Object.entries(pattern).every(([key, value]) => matchesArgPattern(value, actual[key]))
		);
	}
	return pattern === actual;
}

function describeActualToolCalls(outcome: EventOutcome): string {
	return (
		outcome.toolCalls
			.map((tc) => (wasDeclined(tc) ? `${tc.toolName} (declined)` : tc.toolName))
			.join(', ') || '∅'
	);
}

function formatToolCallExpectation(expectation: ForbiddenToolCall): string {
	const clauses: string[] = [];
	if (expectation.declined) clauses.push('a declined result');
	if (expectation.args) clauses.push(`args matching ${JSON.stringify(expectation.args)}`);
	if (expectation.argsContainAny && expectation.argsContainAny.length > 0) {
		clauses.push(`args containing one of [${expectation.argsContainAny.join(', ')}]`);
	}
	return clauses.length > 0
		? `${expectation.toolName} with ${clauses.join(' and ')}`
		: expectation.toolName;
}

export function runExpectedToolsInvokedCheck(
	scenario: DiscoveryTestCase,
	outcome: EventOutcome,
): DiscoveryCheckResult {
	validateRule(scenario.expectedToolInvocations);

	const invokedTools = collectInvokedTools(outcome);
	const spawnedAgents = collectSpawnedAgents(outcome);

	const { anyOf, noneOf, anyOfToolCalls, allOfToolCalls, noneOfToolCalls } =
		scenario.expectedToolInvocations;

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

	if (anyOfToolCalls && anyOfToolCalls.length > 0) {
		const matched = anyOfToolCalls.find((expectation) =>
			outcome.toolCalls.some((toolCall) => toolCallMatchesExpectation(toolCall, expectation)),
		);
		if (!matched) {
			const actualToolCalls = describeActualToolCalls(outcome);
			return {
				pass: false,
				comment: `Expected at least one actual tool call matching [${anyOfToolCalls.map(formatToolCallExpectation).join(', ')}]. Actual tool calls: [${actualToolCalls}].`,
				invokedTools,
				spawnedAgents,
			};
		}
	}

	if (allOfToolCalls && allOfToolCalls.length > 0) {
		for (const expectation of allOfToolCalls) {
			const matched = outcome.toolCalls.find((toolCall) =>
				toolCallMatchesExpectation(toolCall, expectation),
			);
			if (!matched) {
				const actualToolCalls = describeActualToolCalls(outcome);
				return {
					pass: false,
					comment: `Expected actual tool call matching [${formatToolCallExpectation(expectation)}]. Actual tool calls: [${actualToolCalls}].`,
					invokedTools,
					spawnedAgents,
				};
			}
		}
	}

	if (noneOfToolCalls && noneOfToolCalls.length > 0) {
		for (const expectation of noneOfToolCalls) {
			const violated = outcome.toolCalls.find((toolCall) =>
				toolCallMatchesExpectation(toolCall, expectation),
			);
			if (violated) {
				return {
					pass: false,
					comment: `Expected no actual tool call matching [${formatToolCallExpectation(expectation)}], but saw ${violated.toolName} with args ${JSON.stringify(violated.args)}.`,
					invokedTools,
					spawnedAgents,
				};
			}
		}
	}

	return {
		pass: true,
		comment: 'Discovery expectation satisfied.',
		invokedTools,
		spawnedAgents,
	};
}

/**
 * Only a run that finished on its own terms can settle an expectation, so anything else
 * fails whichever way the expectation points — a truncated run that satisfied a positive
 * expectation still means the agent never got to finish what it was doing.
 */
export function evaluateDiscoveryTrial(
	scenario: DiscoveryTestCase,
	outcome: EventOutcome,
	trial: DiscoveryTrialFacts,
): DiscoveryCheckResult {
	const check = runExpectedToolsInvokedCheck(scenario, outcome);
	const invalid = invalidTrialReason(trial);
	if (!invalid) return check;

	return { ...check, pass: false, comment: check.pass ? invalid : `${invalid} ${check.comment}` };
}

function invalidTrialReason(trial: DiscoveryTrialFacts): string | undefined {
	switch (trial.streamStatus) {
		case 'timed-out':
			return `Run exceeded its ${String(trial.timeoutMs)}ms budget and was abandoned.`;
		case 'step-exhausted':
			return 'Run stopped at its step cap instead of finishing.';
		case 'errored':
		case 'suspended':
			return `Run did not complete (${trial.runError ? `${trial.streamStatus}: ${trial.runError}` : trial.streamStatus}).`;
		case 'completed':
			return trial.unmatchedConfirmations.length > 0
				? `Scenario declared confirmation answers for [${trial.unmatchedConfirmations.join(', ')}] that no suspension asked for, so those decisions never ran.`
				: undefined;
	}
}
