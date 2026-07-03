import { collectExpectations } from './collect';
import type { EvalLogger } from '../harness/logger';
import type { TranscriptTurn, WorkflowTestCase } from '../types';
import { conversationUserTurnsAsText } from '../utils/conversation-text';

export interface SelectAuthorExpectationsArgs {
	testCase: Pick<WorkflowTestCase, 'processExpectations' | 'outcomeExpectations' | 'conversation'>;
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
 * A successful full (non-prebuilt) build should always carry a transcript; if it
 * doesn't, `processExpectations` can't be judged. We still skip them (judging
 * them against no transcript would only produce false failures), but warn so the
 * lost signal — likely an event-capture bug — isn't silently swallowed.
 */
export function selectAuthorExpectations(args: SelectAuthorExpectationsArgs): {
	expectations: string[];
	transcript: TranscriptTurn[];
} {
	const { testCase, buildSucceeded, isPrebuilt, logger } = args;
	const hasTranscript = (args.transcript?.length ?? 0) > 0;
	const processCount = testCase.processExpectations?.length ?? 0;

	if (!isPrebuilt && !hasTranscript && buildSucceeded && processCount > 0) {
		logger.warn(
			`  Full build produced no transcript — skipping ${String(processCount)} process expectation(s); only outcome expectations will be judged (possible event-capture issue)`,
		);
	}

	const expectations = hasTranscript
		? collectExpectations(testCase)
		: buildSucceeded
			? (testCase.outcomeExpectations ?? [])
			: [];

	const transcript: TranscriptTurn[] = hasTranscript
		? args.transcript!
		: [{ userMessage: conversationUserTurnsAsText(testCase.conversation), steps: [] }];

	return { expectations, transcript };
}
