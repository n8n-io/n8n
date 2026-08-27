import { allFailVerdicts } from './assertion-judge';
import { collectExpectations } from './collect';
import type { EvalLogger } from '../harness/logger';
import type { BuildExpectationResult, TranscriptTurn, WorkflowTestCase } from '../types';
import { conversationUserTurnsAsText } from '../utils/conversation-text';

/** Recorded on expectations we refuse to judge, so the reason reaches the report. */
const NO_AGENT_OUTPUT_REASON =
	'not judged — the build produced no agent output, so there was nothing to grade';

export interface SelectAuthorExpectationsArgs {
	testCase: Pick<
		WorkflowTestCase,
		'processExpectations' | 'outcomeExpectations' | 'conversation' | 'seed'
	>;
	/** Captured build transcript, if any. Empty/absent for prebuilt/MCP builds. */
	transcript: TranscriptTurn[] | undefined;
	buildSucceeded: boolean;
	/** True only on the `--prebuilt-workflows` path. Lets us distinguish an
	 *  expected no-transcript (prebuilt) build from an unexpected one (a full
	 *  build whose event capture failed). */
	isPrebuilt: boolean;
	logger: EvalLogger;
}

/**
 * Decide which author expectations to judge for a build, and the transcript to
 * feed the judge.
 *
 * - Full build with a transcript → judge the process + outcome union against the
 *   real transcript.
 * - No transcript but the build succeeded → judge only `outcomeExpectations`
 *   against the workflow, with the authored conversation as request context.
 *   This is the prebuilt/MCP path.
 * - Build failed with no transcript → judge nothing.
 *
 * "No transcript" means no AGENT OUTPUT, not an empty array. A run that dies
 * before the agent does anything (a provider outage, a crashed sandbox) still
 * produces one turn per user message, each with zero steps. Judging those turns
 * yields a full set of confidently-wrong verdicts describing a transcript the
 * agent never got to write — 538 of them in nightly sweep #57 (TRUST-374). They
 * come back as `unjudged` instead: recorded, but marked incomplete.
 *
 * A successful full (non-prebuilt) build should always carry a transcript; if it
 * doesn't, `processExpectations` can't be judged. We still skip them (judging
 * them against no transcript would only produce false failures), but warn so the
 * lost signal — likely an event-capture bug — isn't silently swallowed.
 */
export function selectAuthorExpectations(args: SelectAuthorExpectationsArgs): {
	expectations: string[];
	transcript: TranscriptTurn[];
	/** Expectations deliberately left ungraded, already shaped as `incomplete`
	 *  verdicts. Recording them keeps the case's unit count stable across runs (so
	 *  baselines stay comparable) while contributing nothing to any pass rate —
	 *  this repo's scoring and LangTracer's both skip `incomplete` rows. */
	unjudged: BuildExpectationResult[];
} {
	const { testCase, buildSucceeded, isPrebuilt, logger } = args;
	const hasAgentOutput = (args.transcript ?? []).some((turn) => turn.steps.length > 0);
	const processCount = testCase.processExpectations?.length ?? 0;

	if (!isPrebuilt && !hasAgentOutput && buildSucceeded && processCount > 0) {
		logger.warn(
			`  Full build produced no transcript — skipping ${String(processCount)} process expectation(s); only outcome expectations will be judged (possible event-capture issue)`,
		);
	}

	const transcript: TranscriptTurn[] = hasAgentOutput
		? args.transcript!
		: [
				{
					userMessage: conversationUserTurnsAsText(testCase.conversation, testCase.seed),
					steps: [],
				},
			];

	// A failed build that produced nothing at all: record every expectation as
	// ungraded rather than handing the judge an empty conversation to describe.
	if (!hasAgentOutput && !buildSucceeded) {
		const authored = collectExpectations(testCase);
		if (authored.length > 0) {
			logger.warn(
				`  Build produced no agent output — leaving all ${String(authored.length)} expectation(s) ungraded; judging them would score an empty transcript`,
			);
		}
		return {
			expectations: [],
			transcript,
			unjudged: allFailVerdicts(authored, NO_AGENT_OUTPUT_REASON),
		};
	}

	const expectations = hasAgentOutput
		? collectExpectations(testCase)
		: (testCase.outcomeExpectations ?? []);

	return { expectations, transcript, unjudged: [] };
}
