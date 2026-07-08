// Forward mapper: on-disk WorkflowTestCase (data/workflows/*.json) → the body the
// lang-tracer REST `POST /api/v1/cases` (create_test_case) expects. Split from the
// network call so the disk→API key-renaming contract is unit-testable without a server.

import type { EvalTestCaseInput } from '../harness/schema';

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
	conversation?: Array<{ role: 'user' | 'assistant'; text: string }>;
	evalComplexity: 'simple' | 'medium' | 'complex';
	evalTags: string[];
	evalTriggerType?: string;
	scenarios?: LangTracerScenario[];
	processExpectations?: string[];
	outcomeExpectations?: string[];
	datasets?: string[];
	messageBudget?: number;
	credentials?: Array<{ type: string; name?: string }>;
}

export interface ToLangTracerOptions {
	suiteId: number;
	setKind: 'regression' | 'capability_gap';
	synthetic: boolean;
}

/** Seeding modes the case-write API can't represent (no fields for them), so a case
 *  using any of them can't be pushed. Returns a human-readable reason, else null. */
export function unsupportedPushReason(testCase: EvalTestCaseInput): string | null {
	if (testCase.seedThread) return 'uses seedThread (not supported by the case-write API)';
	if (testCase.seedFile) return 'uses seedFile (not supported by the case-write API)';
	if (testCase.priorConversation) {
		return 'uses priorConversation (not supported by the case-write API)';
	}
	return null;
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
