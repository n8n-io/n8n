import {
	attributionForExpectation,
	attributionForScenario,
	attributionFromVerifierCategory,
	EVAL_ATTRIBUTIONS,
	VERIFIER_CATEGORIES,
} from '../harness/attribution';
import { buildFailedOnInfra, type BuildResult } from '../harness/build-workflow';
import { classifyScenarioExecutionError } from '../harness/transient-error';
import { sentinelOutcomeFromVerdicts } from '../run/reshape';
import { MOCK_EXECUTION_VERIFY_PROMPT } from '../system-prompts/mock-execution-verify';

function build(overrides: Partial<BuildResult>): BuildResult {
	return {
		success: false,
		workflowJsons: [],
		createdWorkflowIds: [],
		createdDataTableIds: [],
		...overrides,
	};
}

describe('attributionFromVerifierCategory', () => {
	it('is an identity map over the categories the verifier prompt defines', () => {
		// The verifier's enum IS the attribution vocabulary — nothing to translate,
		// which is the point of TRUST-375.
		for (const category of VERIFIER_CATEGORIES) {
			expect(attributionFromVerifierCategory(category)).toBe(category);
		}
	});

	it('treats an uncategorised or unknown verdict as the builder’s', () => {
		// The verifier prompt is explicit that there is no "legitimate failure"
		// bucket — a decided failure with no category is still the builder's.
		expect(attributionFromVerifierCategory(undefined)).toBe('builder_issue');
		expect(attributionFromVerifierCategory('verification_failure')).toBe('builder_issue');
		expect(attributionFromVerifierCategory('brand_new_category')).toBe('builder_issue');
	});

	it('stays in step with the enum the verifier prompt actually defines', () => {
		// The prompt is the verifier's only spec. If someone adds a category there
		// without adding it here it silently falls through to builder_issue —
		// exactly the drift this contract exists to stop.
		for (const category of VERIFIER_CATEGORIES) {
			expect(MOCK_EXECUTION_VERIFY_PROMPT).toContain(`**${category}**`);
		}
	});
});

describe('attributionForScenario', () => {
	it('leaves a passing scenario unattributed', () => {
		expect(
			attributionForScenario({ passed: true, incomplete: false, failureCategory: undefined }),
		).toBeUndefined();
	});

	it('marks a scenario the verifier never decided as a verification gap', () => {
		// The harness excludes this run from scoring; recording it as a product
		// failure is what TRUST-375 set out to stop.
		expect(
			attributionForScenario({
				passed: false,
				incomplete: true,
				failureCategory: 'verification_failure',
			}),
		).toBe('verification_gap');
	});

	it('otherwise defers to the verifier', () => {
		expect(
			attributionForScenario({ passed: false, incomplete: false, failureCategory: 'mock_issue' }),
		).toBe('mock_issue');
	});
});

describe('attributionForExpectation', () => {
	it('leaves a passing expectation unattributed', () => {
		expect(attributionForExpectation({ pass: true })).toBeUndefined();
		expect(attributionForExpectation({ pass: true }, true)).toBeUndefined();
	});

	it('treats a missed expectation as a builder miss', () => {
		expect(attributionForExpectation({ pass: false })).toBe('builder_issue');
	});

	it('treats an ungraded expectation as unmeasured', () => {
		expect(attributionForExpectation({ pass: false, incomplete: true })).toBe('verification_gap');
	});

	it('attributes every expectation of an infra-failed build to infra', () => {
		expect(attributionForExpectation({ pass: false, incomplete: true }, true)).toBe(
			'framework_issue',
		);
		expect(attributionForExpectation({ pass: false }, true)).toBe('framework_issue');
	});
});

describe('buildFailedOnInfra', () => {
	it('is false for a successful build', () => {
		expect(buildFailedOnInfra(build({ success: true, transportFailure: true }))).toBe(false);
	});

	it('is false for a genuine agent build failure', () => {
		expect(buildFailedOnInfra(build({ error: 'agent produced no workflow' }))).toBe(false);
	});

	it('covers seeding, transport and provider outages', () => {
		expect(buildFailedOnInfra(build({ seedingFailed: true }))).toBe(true);
		expect(buildFailedOnInfra(build({ transportFailure: true }))).toBe(true);
		expect(buildFailedOnInfra(build({ providerOutage: 'provider HTTP 529' }))).toBe(true);
	});
});

describe('harness-code producers', () => {
	it('classifies anything thrown out of scenario execution as infra', () => {
		expect(classifyScenarioExecutionError('socket hang up').attribution).toBe('framework_issue');
		expect(
			classifyScenarioExecutionError('The operation was aborted due to timeout').attribution,
		).toBe('framework_issue');
	});

	it('attributes the build-only sentinel row from its expectation verdicts', () => {
		expect(sentinelOutcomeFromVerdicts(undefined).attribution).toBe('verification_gap');
		expect(
			sentinelOutcomeFromVerdicts([{ expectation: 'a', pass: false, reason: '', incomplete: true }])
				.attribution,
		).toBe('verification_gap');
		expect(
			sentinelOutcomeFromVerdicts([{ expectation: 'a', pass: false, reason: 'missed' }])
				.attribution,
		).toBe('builder_issue');
		expect(
			sentinelOutcomeFromVerdicts([{ expectation: 'a', pass: true, reason: 'ok' }]).attribution,
		).toBeUndefined();
	});

	it('only ever emits one of the four buckets', () => {
		const emitted = [
			attributionFromVerifierCategory('anything'),
			attributionForExpectation({ pass: false }),
			attributionForExpectation({ pass: false }, true),
			classifyScenarioExecutionError('boom').attribution,
			sentinelOutcomeFromVerdicts(undefined).attribution,
		];
		for (const attribution of emitted) {
			expect(EVAL_ATTRIBUTIONS).toContain(attribution);
		}
	});
});
