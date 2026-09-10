import { selectAuthorExpectations } from '../build-expectations/select';
import type { EvalLogger } from '../harness/logger';
import type { ConversationTurn, TranscriptTurn, WorkflowTestCase } from '../types';

function makeLogger(): { logger: EvalLogger; warnings: string[] } {
	const warnings: string[] = [];
	const logger: EvalLogger = {
		info: () => {},
		verbose: () => {},
		success: () => {},
		warn: (msg: string) => warnings.push(msg),
		error: () => {},
		isVerbose: false,
	};
	return { logger, warnings };
}

const conversation: ConversationTurn[] = [{ role: 'user', text: 'build it' }];
const realTranscript: TranscriptTurn[] = [
	{ userMessage: 'build it', steps: [{ kind: 'agent-text', text: 'On it.' }] },
];
/** What a run that died before the agent acted leaves behind: one turn per user
 *  message, and no agent steps at all. */
const noOutputTranscript: TranscriptTurn[] = [{ userMessage: 'build it', steps: [] }];

function testCase(
	over: Partial<Pick<WorkflowTestCase, 'processExpectations' | 'outcomeExpectations'>> = {},
): Pick<WorkflowTestCase, 'processExpectations' | 'outcomeExpectations' | 'conversation'> {
	return { conversation, ...over };
}

describe('selectAuthorExpectations', () => {
	it('judges the process+outcome union against the real transcript for a full build', () => {
		const { logger, warnings } = makeLogger();
		const { expectations, transcript } = selectAuthorExpectations({
			testCase: testCase({ processExpectations: ['p1'], outcomeExpectations: ['o1'] }),
			transcript: realTranscript,
			buildSucceeded: true,
			isPrebuilt: false,
			logger,
		});
		expect(expectations).toEqual(['p1', 'o1']);
		expect(transcript).toBe(realTranscript);
		expect(warnings).toEqual([]);
	});

	it('judges only outcome expectations against a synthesized transcript for a prebuilt build', () => {
		const { logger, warnings } = makeLogger();
		const { expectations, transcript } = selectAuthorExpectations({
			testCase: testCase({ processExpectations: ['p1'], outcomeExpectations: ['o1'] }),
			transcript: undefined,
			buildSucceeded: true,
			isPrebuilt: true,
			logger,
		});
		expect(expectations).toEqual(['o1']);
		expect(transcript).toEqual([{ userMessage: 'build it', steps: [] }]);
		expect(warnings).toEqual([]);
	});

	it('synthesizes an empty-prompt transcript for a replay-seeded case with no authored conversation', () => {
		const { logger, warnings } = makeLogger();
		const { expectations, transcript } = selectAuthorExpectations({
			// A replay seed carries no authored `conversation`; on the prebuilt/no-transcript
			// path this must not crash (regression: conversationUserTurnsAsText(undefined)).
			testCase: { outcomeExpectations: ['o1'] },
			transcript: undefined,
			buildSucceeded: true,
			isPrebuilt: true,
			logger,
		});
		expect(expectations).toEqual(['o1']);
		expect(transcript).toEqual([{ userMessage: '', steps: [] }]);
		expect(warnings).toEqual([]);
	});

	it('warns when a full (non-prebuilt) build has no transcript but declares process expectations', () => {
		const { logger, warnings } = makeLogger();
		const { expectations } = selectAuthorExpectations({
			testCase: testCase({ processExpectations: ['p1', 'p2'], outcomeExpectations: ['o1'] }),
			transcript: undefined,
			buildSucceeded: true,
			isPrebuilt: false,
			logger,
		});
		expect(expectations).toEqual(['o1']);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('no transcript');
		expect(warnings[0]).toContain('2 process expectation');
	});

	it('does not warn for a full no-transcript build that declares no process expectations', () => {
		const { logger, warnings } = makeLogger();
		selectAuthorExpectations({
			testCase: testCase({ outcomeExpectations: ['o1'] }),
			transcript: undefined,
			buildSucceeded: true,
			isPrebuilt: false,
			logger,
		});
		expect(warnings).toEqual([]);
	});

	it('records expectations as ungraded when a build fails with no transcript', () => {
		const { logger, warnings } = makeLogger();
		const { expectations, unjudged } = selectAuthorExpectations({
			testCase: testCase({ processExpectations: ['p1'], outcomeExpectations: ['o1'] }),
			transcript: undefined,
			buildSucceeded: false,
			isPrebuilt: false,
			logger,
		});
		expect(expectations).toEqual([]);
		// Recorded, not dropped — incomplete keeps them out of every pass rate
		// while the case keeps its unit count.
		expect(unjudged.map((v) => [v.expectation, v.pass, v.incomplete])).toEqual([
			['p1', false, true],
			['o1', false, true],
		]);
		expect(unjudged[0].reason).toContain('nothing to grade');
		expect(warnings[0]).toContain('no agent output');
	});

	it('leaves expectations ungraded when a failed build produced turns but no agent output', () => {
		// TRUST-374: a provider outage still yields one turn per user message, so
		// the transcript array is non-empty while the agent never wrote a thing.
		// Judging it produced 538 confidently-wrong failures in sweep #57.
		const { logger } = makeLogger();
		const { expectations, unjudged } = selectAuthorExpectations({
			testCase: testCase({ processExpectations: ['p1', 'p2'], outcomeExpectations: ['o1'] }),
			transcript: noOutputTranscript,
			buildSucceeded: false,
			isPrebuilt: false,
			logger,
		});
		expect(expectations).toEqual([]);
		expect(unjudged).toHaveLength(3);
		expect(unjudged.every((v) => v.incomplete)).toBe(true);
	});

	it('still judges a genuine build failure that produced agent activity', () => {
		// The agent tried and got it wrong — that is a real product verdict.
		const { logger } = makeLogger();
		const { expectations, transcript, unjudged } = selectAuthorExpectations({
			testCase: testCase({ processExpectations: ['p1'], outcomeExpectations: ['o1'] }),
			transcript: realTranscript,
			buildSucceeded: false,
			isPrebuilt: false,
			logger,
		});
		expect(expectations).toEqual(['p1', 'o1']);
		expect(transcript).toBe(realTranscript);
		expect(unjudged).toEqual([]);
	});

	it('records nothing extra when a failed no-output build declares no expectations', () => {
		const { logger, warnings } = makeLogger();
		const { expectations, unjudged } = selectAuthorExpectations({
			testCase: testCase(),
			transcript: noOutputTranscript,
			buildSucceeded: false,
			isPrebuilt: false,
			logger,
		});
		expect(expectations).toEqual([]);
		expect(unjudged).toEqual([]);
		expect(warnings).toEqual([]);
	});
});
