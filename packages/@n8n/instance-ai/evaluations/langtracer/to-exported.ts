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
	conversation?: NonNullable<EvalTestCaseInput['conversation']>;
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
	/** Inline seed, forwarded as authored — lang-tracer stores it at `metadata.seed`.
	 *  Only the authored arm: a replay seed is derived from a source thread by
	 *  promote/scrub over there, so pushing one would fabricate provenance. */
	seed?: PushableSeed;
	credentialFixture?: string;
}

type InlineSeed = Extract<CaseSeed, { mode: 'inline' }>;

/** The seed as the case-write API takes it: without `folders`. The API's `seed`
 *  is `additionalProperties: false` and has no such key, so the schema default
 *  `[]` alone would fail EVERY seeded push, folder case or not. A non-empty
 *  `folders` never reaches here: `unsupportedPushReason` refuses it. */
export type PushableSeed = Omit<InlineSeed, 'folders'>;

function pushableSeed({ folders: _notStored, ...seed }: InlineSeed): PushableSeed {
	return seed;
}

export interface ToLangTracerOptions {
	suiteId: number;
	setKind: 'regression' | 'capability_gap';
	synthetic: boolean;
}

/** Case content the case-write API can't take. An INLINE seed is pushable — it's a
 *  durable fixture, and the API stores it verbatim — unless it carries a slot the
 *  API's fixed key set lacks (folders, today). A REPLAY seed isn't: it points at
 *  a LangSmith trace that expires, lang-tracer derives it from a source thread it
 *  already holds, and such a case is barred from suites anyway. Returns a
 *  human-readable reason, else null. */
export function unsupportedPushReason(testCase: EvalTestCaseInput): string | null {
	if (testCase.credentials?.some((credential) => credential.description !== undefined)) {
		return 'seeds credential descriptions, which the current LangTracer case-write schema does not store. Keep the case on disk until that contract supports descriptions.';
	}
	if (testCase.promptVersion !== undefined) {
		return 'pins promptVersion, which the current case-write contract does not carry. Keep the case on disk.';
	}
	if (testCase.buildMode !== undefined) {
		return 'pins buildMode, which the current LangTracer write/export contract does not carry. Keep the case on disk until that contract supports the mode.';
	}
	if (testCase.allowUserExecution) {
		return 'enables user execution, which the current LangTracer write/export contract does not carry.';
	}
	const seed = testCase.seed;
	switch (seed?.mode) {
		case undefined:
			return null;
		case 'inline':
			// The write API validates `metadata.seed` against a fixed key set
			// (`additionalProperties: false`). It has no `folders` key, and its
			// `workflows[]` items declare no `parentFolderId`, so a push would either
			// 400 or land the case with the folder stripped and every workflow at the
			// root. A stripped folder case is the worst outcome available: it still
			// runs, the folder never exists, and the agent is graded on finding it.
			// Refuse until lang-tracer carries both.
			if (
				seed.folders.length > 0 ||
				seed.workflows.some((workflow) => workflow.parentFolderId !== undefined)
			) {
				return (
					'seeds folders, which the case-write API does not store yet — pushing it would ' +
					'land the case without its folder (and with every workflow at the project root) ' +
					'and grade the agent on finding a folder that does not exist. Keep it on disk ' +
					'until lang-tracer carries `seed.folders` and `seed.workflows[].parentFolderId`.'
				);
			}
			// `projects` IS stored: the case-write contract (the `create_test_case` tool
			// and `POST /api/v1/cases` share it) declares `seed.projects` with the same
			// rules this schema enforces — unique, trimmed, at most 255 characters, at
			// most 5. The push's own read-back check still catches a deployment that
			// predates it.
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
	if (testCase.seed?.mode === 'inline') body.seed = pushableSeed(testCase.seed);
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
