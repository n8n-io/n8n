// ---------------------------------------------------------------------------
// Build cases
//
// Each virtual user runs one case as a multi-turn conversation: build, then
// tweak, then ask. Cases are assigned round-robin by user index.
//
// Two properties matter for the measurement:
//
//  1. Cases must differ from each other. Identical prompts across users hit
//     Anthropic's prompt cache, which understates both cost and the per-thread
//     history size — exactly the things we're trying to measure.
//  2. Each user's workflow name must be unique, or parallel users collide on
//     the same workflow and the builder starts reconciling instead of creating.
//
// The build prompts are adapted from BENCHMARK_PROMPTS in
// packages/testing/playwright/utils/benchmark/instance-ai-driver.ts — core
// nodes only, no credentials, and explicitly "don't ask questions" so a run
// isn't gated on HITL. (Copied rather than imported: the playwright package is
// not a dependency of this one.)
// ---------------------------------------------------------------------------

const NO_QUESTIONS = 'Build this without asking any questions, go straight to building.';

export interface BuildCase {
	name: string;
	description: string;
	/** False for the read-only control case, which never touches the builder. */
	builds: boolean;
	/** `{name}` is substituted with the per-user workflow name. */
	opening: string;
	/** Follow-up turns, in order. Consumed up to --max-turns. */
	followUps: string[];
	/** `{n}` is substituted with the user index. */
	workflowNameTemplate?: string;
}

export const BUILD_CASES: readonly BuildCase[] = [
	{
		name: 'hourly-ip-check',
		description: 'Schedule → HTTP Request → Set',
		builds: true,
		workflowNameTemplate: 'Load Hourly IP Check {n}',
		opening:
			`${NO_QUESTIONS} A Schedule Trigger that runs every hour, then an HTTP Request node ` +
			'that GETs httpbin.org/get, then a Set node that keeps only the origin field. ' +
			'Name the workflow "{name}".',
		followUps: [
			'Add a Set node at the end that adds a checkedAt field with the current timestamp.',
			'What happens to this workflow if the HTTP request times out?',
			'Rename the last Set node to "Stamp Time".',
		],
	},
	{
		name: 'webhook-sample-api',
		description: 'Webhook → Code → Respond to Webhook',
		builds: true,
		workflowNameTemplate: 'Load Sample API {n}',
		opening:
			`${NO_QUESTIONS} A Webhook trigger at path /load-sample-{n}, then a Code node that ` +
			'generates 5 sample records with name and email fields, then Respond to Webhook ' +
			'returning the records as JSON. Name the workflow "{name}".',
		followUps: [
			'Change the Code node to generate 20 records instead of 5, and add an id field.',
			'Does the webhook respond synchronously? Explain how the response is produced.',
			'Add a Filter node that drops records whose email does not contain an @.',
		],
	},
	{
		name: 'health-ping',
		description: 'Schedule → Code → Set',
		builds: true,
		workflowNameTemplate: 'Load Health Ping {n}',
		opening:
			`${NO_QUESTIONS} A Schedule Trigger every 5 minutes, then a Code node that returns ` +
			'the current timestamp and a status field set to ok, then a Set node that adds a ' +
			'version field with value 1. Name the workflow "{name}".',
		followUps: [
			'Add an If node after the Code node that routes non-ok statuses to a NoOp node.',
			'Bump the version field to 2 and explain what else would need to change.',
			'How often will this run per day?',
		],
	},
	{
		name: 'read-only',
		description: 'Control group — questions only, never builds',
		builds: false,
		opening:
			'List my current credentials and workflows. Just tell me what exists, do not build anything.',
		followUps: [
			'Which node types would you recommend for polling a REST API on a schedule?',
			'What is the difference between a Set node and a Code node?',
			'Summarise what you told me so far in two sentences.',
		],
	},
];

export interface RenderedCase {
	caseName: string;
	builds: boolean;
	/** Undefined for non-building cases. */
	workflowName?: string;
	opening: string;
	followUps: string[];
}

/**
 * Pick the cases to run. Unknown names are rejected loudly — a typo silently
 * narrowing the traffic mix would quietly invalidate the comparison.
 */
export function selectCases(names?: string[]): BuildCase[] {
	if (names === undefined || names.length === 0) return [...BUILD_CASES];

	const byName = new Map(BUILD_CASES.map((buildCase) => [buildCase.name, buildCase]));
	const unknown = names.filter((name) => !byName.has(name));
	if (unknown.length > 0) {
		throw new Error(
			`Unknown case(s): ${unknown.join(', ')}. Available: ${BUILD_CASES.map((c) => c.name).join(', ')}`,
		);
	}

	return names.map((name) => {
		const found = byName.get(name);
		if (!found) throw new Error(`Unknown case: ${name}`);
		return found;
	});
}

/** Round-robin, so N users spread evenly across the selected cases. */
export function caseFor(cases: readonly BuildCase[], userIndex: number): BuildCase {
	if (cases.length === 0) throw new Error('No cases selected');
	return cases[userIndex % cases.length];
}

/** Substitute the per-user workflow name and index into a case's prompts. */
export function renderCase(buildCase: BuildCase, userIndex: number): RenderedCase {
	const workflowName = buildCase.workflowNameTemplate?.replace('{n}', String(userIndex));
	const substitute = (text: string): string =>
		text.replaceAll('{n}', String(userIndex)).replaceAll('{name}', workflowName ?? '');

	return {
		caseName: buildCase.name,
		builds: buildCase.builds,
		workflowName,
		opening: substitute(buildCase.opening),
		followUps: buildCase.followUps.map(substitute),
	};
}

export type NextMessageDecision = { kind: 'followUp'; message: string } | { kind: 'done' };

/**
 * A deterministic replacement for the eval harness's LLM user-proxy.
 *
 * A load test wants free, low-variance traffic: an LLM deciding each follow-up
 * would add cost and make per-user memory numbers noisy for reasons unrelated
 * to concurrency. `maxTurns` counts the opening message, so it is the hard
 * ceiling on LLM calls per user and thus the primary cost lever.
 */
export function createScriptedDecider(
	followUps: string[],
	maxTurns: number,
): () => Promise<NextMessageDecision> {
	// The opening message already consumed turn 1.
	let turnsSent = 1;
	let nextIndex = 0;

	// chat-loop's nextMessageDecider contract is async — the eval harness awaits
	// an LLM there. Our decision is purely local, so there is nothing to await.
	// eslint-disable-next-line @typescript-eslint/require-await
	return async () => {
		if (turnsSent >= maxTurns || nextIndex >= followUps.length) {
			return { kind: 'done' };
		}
		const message = followUps[nextIndex];
		nextIndex++;
		turnsSent++;
		return { kind: 'followUp', message };
	};
}
