// Forward mapper: on-disk WorkflowTestCase (data/workflows/*.json) → the body the
// lang-tracer REST `POST /api/v1/cases` (create_test_case) expects. Split from the
// network call so the disk→API key-renaming contract is unit-testable without a server.

import type { CaseSeed, EvalTestCaseInput } from '../harness/schema';

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
	credentials?: Array<{ type: string; name?: string }>;
	/** Inline seed, forwarded verbatim — lang-tracer stores it at `metadata.seed`.
	 *  Only the authored arm: a replay seed is derived from a source thread by
	 *  promote/scrub over there, so pushing one would fabricate provenance. */
	seed?: Extract<CaseSeed, { mode: 'inline' }>;
}

export interface ToLangTracerOptions {
	suiteId: number;
	setKind: 'regression' | 'capability_gap';
	synthetic: boolean;
}

/** Seeding modes the case-write API can't take. An INLINE seed is pushable — it's a
 *  durable fixture, and the API stores it verbatim. A REPLAY seed isn't: it points at
 *  a LangSmith trace that expires, lang-tracer derives it from a source thread it
 *  already holds, and such a case is barred from suites anyway. Returns a
 *  human-readable reason, else null. */
export function unsupportedPushReason(testCase: EvalTestCaseInput): string | null {
	const seed = testCase.seed;
	switch (seed?.mode) {
		case undefined:
		case 'inline':
			return null;
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
