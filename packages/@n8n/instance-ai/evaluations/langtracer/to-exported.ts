// Forward mapper: on-disk WorkflowTestCase (data/workflows/*.json) → the body the
// lang-tracer REST `POST /api/v1/cases` (create_test_case) expects. Split from the
// network call so the disk→API key-renaming contract is unit-testable without a server.

import type { CaseSeed, EvalTestCaseInput } from '../harness/schema';
import type { TestCaseCredential } from '../types';

/** One scenario in the create-case payload (`executionScenarios` renamed to `scenarios`). */
export interface LangTracerScenario {
	name: string;
	description?: string;
	dataSetup?: string;
	successCriteria?: string;
	requires?: string;
}

/** Body for `POST /api/v1/cases`. Disk keys are renamed (`complexity`→`evalComplexity`,
 *  `tags`→`evalTags`, `triggerType`→`evalTriggerType`, `executionScenarios`→`scenarios`). */
export interface LangTracerCreateCaseBody {
	name: string;
	setKind: 'regression' | 'capability_gap';
	synthetic: boolean;
	suiteId: number;
	description?: string;
	/** `attach` is declared, not just tolerated: the turn shape is the push contract,
	 *  and leaving it off let a hand-off case type-check while losing its attachment.
	 *  Carrying it end-to-end needs lang-tracer #119 deployed. */
	conversation?: Array<{
		role: 'user' | 'assistant';
		text: string;
		attach?: { workflow: string };
	}>;
	evalComplexity: 'simple' | 'medium' | 'complex';
	evalTags: string[];
	evalTriggerType?: string;
	scenarios?: LangTracerScenario[];
	processExpectations?: string[];
	outcomeExpectations?: string[];
	datasets?: string[];
	messageBudget?: number;
	/** Forwarded verbatim, so the declared shape has to carry every authored
	 *  field — an understated type silently drops `valid`/`blank` from review. */
	credentials?: TestCaseCredential[];
	/** Inline seed, forwarded verbatim — lang-tracer stores it at `metadata.seed`.
	 *  Only the authored arm: a replay seed is derived from a source thread by
	 *  promote/scrub over there, so pushing one would fabricate provenance. */
	seed?: Extract<CaseSeed, { mode: 'inline' }>;
	credentialFixture?: string;
}

export interface ToLangTracerOptions {
	suiteId: number;
	setKind: 'regression' | 'capability_gap';
	synthetic: boolean;
}

/** Case content the case-write API can't take. An INLINE seed is pushable — it's a
 *  durable fixture, and the API stores it verbatim. A REPLAY seed isn't: it points at
 *  a LangSmith trace that expires, lang-tracer derives it from a source thread it
 *  already holds, and such a case is barred from suites anyway. Returns a
 *  human-readable reason, else null. */
export function unsupportedPushReason(testCase: EvalTestCaseInput): string | null {
	const seed = testCase.seed;
	switch (seed?.mode) {
		case undefined:
			return null;
		case 'inline':
			// The write API validates `metadata.seed` against a fixed key set
			// (`additionalProperties: false`), so it does NOT store `projects` — a push
			// would either 400 or land the case with the fixture stripped. A stripped
			// project-scope case is the worst outcome available: it still runs, the seeded
			// project never exists, and the agent's refusal is graded against a project
			// list it never saw. Refuse until lang-tracer carries the key.
			return seed.projects.length > 0
				? 'seeds projects, which the case-write API does not store yet — pushing it would ' +
						'land the case without its seeded project and grade the agent against a project ' +
						'list it never saw. Keep it on disk until lang-tracer carries `seed.projects`.'
				: null;
		case 'replay':
			return (
				'uses a replay seed — reconstructed from a LangSmith trace at run time, so it has no ' +
				'durable home in a suite. Derive a synthetic case from it instead.'
			);
		default: {
			// A new arm must decide its own push-ability here. Approving by default
			// would push the case while `diskCaseToLangTracerCreate` forwards only
			// `inline` — landing it in the suite stripped of its seed.
			const unhandled: never = seed;
			throw new Error(`Unhandled seed mode: ${JSON.stringify(unhandled)}`);
		}
	}
}

/** Map a schema-parsed disk case to a create-case body. `conversation.text` is already
 *  collapsed to a string by the loader schema, so no further normalization is needed. */
export function diskCaseToLangTracerCreate(
	testCase: EvalTestCaseInput,
	fileSlug: string,
	opts: ToLangTracerOptions,
): LangTracerCreateCaseBody {
	const body: LangTracerCreateCaseBody = {
		name: fileSlug,
		setKind: opts.setKind,
		synthetic: opts.synthetic,
		suiteId: opts.suiteId,
		evalComplexity: testCase.complexity,
		evalTags: testCase.tags,
	};

	if (testCase.description !== undefined) body.description = testCase.description;
	if (testCase.conversation !== undefined) body.conversation = testCase.conversation;
	if (testCase.triggerType !== undefined) body.evalTriggerType = testCase.triggerType;
	if (testCase.executionScenarios !== undefined) {
		body.scenarios = testCase.executionScenarios.map(mapScenario);
	}
	if (testCase.processExpectations !== undefined) {
		body.processExpectations = testCase.processExpectations;
	}
	if (testCase.outcomeExpectations !== undefined) {
		body.outcomeExpectations = testCase.outcomeExpectations;
	}
	if (testCase.datasets !== undefined) body.datasets = testCase.datasets;
	if (testCase.messageBudget !== undefined) body.messageBudget = testCase.messageBudget;
	if (testCase.credentials !== undefined) body.credentials = testCase.credentials;
	// Replay never reaches here — `unsupportedPushReason` skips those cases upstream.
	if (testCase.seed?.mode === 'inline') body.seed = testCase.seed;
	if (testCase.credentialFixture !== undefined) body.credentialFixture = testCase.credentialFixture;

	return body;
}

function mapScenario(scenario: {
	name: string;
	description?: string;
	dataSetup?: string;
	successCriteria?: string;
	requires?: string;
}): LangTracerScenario {
	const mapped: LangTracerScenario = { name: scenario.name };
	if (scenario.description !== undefined) mapped.description = scenario.description;
	if (scenario.dataSetup !== undefined) mapped.dataSetup = scenario.dataSetup;
	if (scenario.successCriteria !== undefined) mapped.successCriteria = scenario.successCriteria;
	if (scenario.requires !== undefined) mapped.requires = scenario.requires;
	return mapped;
}
