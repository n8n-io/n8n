import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parse } from 'yaml';

/**
 * Validates the `.github/workflows` YAML that carries logic we cannot see in a
 * dry run. Each test parses the real workflow file, so it fails when someone
 * changes the step it describes.
 *
 * Run with:
 * node --test .github/scripts/workflow-validation.test.mjs
 */

const workflowFile = (name) =>
	parse(readFileSync(new URL(`../workflows/${name}`, import.meta.url), 'utf8'));

/** YAML 1.1 readers fold a bare `on:` key to `true`; the `yaml` package does not. */
const triggersOf = (workflow) => workflow.on ?? workflow[true];

const stepNamed = (workflow, job, name) => {
	const step = workflow.jobs[job].steps.find((candidate) => candidate.name === name);
	assert.ok(step, `workflow has no step named "${name}" in job "${job}"`);
	return step;
};

/**
 * Resolves the inputs a job sees: the caller's values on top of the defaults
 * the workflow declares. An input the caller omits falls back to its default,
 * which is how an absent input and an explicitly empty one become the same
 * value at evaluation time.
 */
const resolveInputs = (workflow, callerInputs = {}) => {
	const declared = triggersOf(workflow).workflow_call.inputs;
	const resolved = Object.fromEntries(
		Object.entries(declared).map(([name, spec]) => [name, spec.default]),
	);

	for (const [name, value] of Object.entries(callerInputs)) {
		assert.ok(name in declared, `workflow does not declare an input named "${name}"`);
		resolved[name] = value;
	}

	return resolved;
};

const resolveCallerInputs = (job, needs = {}) =>
	Object.fromEntries(
		Object.entries(job.with ?? {}).map(([name, value]) => {
			const output = String(value).match(/^\$\{\{\s*needs\.([\w-]+)\.outputs\.([\w-]+)\s*\}\}$/);
			return [name, output ? (needs[output[1]]?.[output[2]] ?? '') : value];
		}),
	);

/**
 * Evaluates the subset of the GitHub Actions expression syntax that the step
 * conditions below use: the status functions, `&&`/`||`, and `==`/`!=` against
 * a string literal. Anything outside that subset throws, so a condition this
 * evaluator cannot model fails the test instead of passing silently.
 *
 * @param {string} condition - the raw value of a step's `if:` key
 * @param {{ inputs?: Record<string, unknown>, jobStatus?: 'success' | 'failure' | 'cancelled' }} context
 * @returns {boolean} true when the step runs, false when the runner skips it
 */
const evaluateStepCondition = (condition, { inputs = {}, jobStatus = 'success' } = {}) => {
	const expression = String(condition)
		.trim()
		.replace(/^\$\{\{(.*)\}\}$/s, '$1')
		.trim();
	// The subset has no grouping, so only the zero-argument status calls may
	// carry parentheses. Anything else would need precedence rules this lacks.
	assert.doesNotMatch(
		expression.replace(/\w+\(\)/g, ''),
		/[()]/,
		`step condition uses grouping this evaluator cannot model: "${expression}"`,
	);

	const value = (token) => {
		const term = token.trim();
		switch (term) {
			case 'always()':
				return true;
			case 'success()':
				return jobStatus === 'success';
			case 'failure()':
				return jobStatus === 'failure';
			case 'cancelled()':
				return jobStatus === 'cancelled';
			case 'true':
				return true;
			case 'false':
				return false;
			default:
				break;
		}

		const literal = term.match(/^'(.*)'$/s);
		if (literal) return literal[1];

		const input = term.match(/^inputs\.([\w-]+)$/);
		if (input) {
			assert.ok(input[1] in inputs, `condition reads an unknown input "${input[1]}"`);
			return inputs[input[1]];
		}

		assert.fail(`unsupported term in step condition: "${term}"`);
	};

	const operand = (token) => {
		const comparison = token.match(/^(.+?)(==|!=)(.+)$/s);
		if (!comparison) return Boolean(value(token));

		const [, left, operator, right] = comparison;
		const equal = String(value(left)) === String(value(right));
		return operator === '==' ? equal : !equal;
	};

	// `&&` binds tighter than `||`, and the subset has no parentheses to nest.
	return expression
		.split('||')
		.some((disjunct) => disjunct.split('&&').every((conjunct) => operand(conjunct)));
};

describe('evaluateStepCondition', () => {
	it('runs an always() step whatever the job status', () => {
		for (const jobStatus of ['success', 'failure', 'cancelled']) {
			assert.equal(evaluateStepCondition('always()', { jobStatus }), true);
		}
	});

	it('runs a failure() step only after a failure', () => {
		assert.equal(evaluateStepCondition('failure()', { jobStatus: 'failure' }), true);
		assert.equal(evaluateStepCondition('failure()', { jobStatus: 'success' }), false);
	});

	it('compares an input against a string literal', () => {
		const inputs = { key: 'abc' };
		assert.equal(evaluateStepCondition("${{ inputs.key == 'abc' }}", { inputs }), true);
		assert.equal(evaluateStepCondition("${{ inputs.key != 'abc' }}", { inputs }), false);
	});

	it('rejects a term it cannot model', () => {
		assert.throws(() => evaluateStepCondition('github.event_name'), /unsupported term/);
	});
});

describe('test-e2e-reusable.yml', () => {
	const workflow = workflowFile('test-e2e-reusable.yml');
	const shardUpload = stepNamed(workflow, 'test', 'Upload Shard Artifacts');
	const a11yUpload = stepNamed(workflow, 'test', 'Upload Accessibility Report');

	describe('currents-record-key input', () => {
		it('is an optional string that defaults to an empty value', () => {
			const { 'currents-record-key': recordKey } = triggersOf(workflow).workflow_call.inputs;

			assert.ok(recordKey, 'workflow does not declare a currents-record-key input');
			assert.equal(recordKey.type, 'string');
			assert.equal(recordKey.required ?? false, false);
			assert.equal(recordKey.default, '');
		});
	});

	describe('shard artifact upload', () => {
		it('runs when the caller passes no record key', () => {
			const inputs = resolveInputs(workflow);

			for (const jobStatus of ['success', 'failure']) {
				assert.equal(
					evaluateStepCondition(shardUpload.if, { inputs, jobStatus }),
					true,
					`shard upload must run on a ${jobStatus} job when no record key is passed`,
				);
			}
		});

		it('runs when the caller passes an empty record key', () => {
			const inputs = resolveInputs(workflow, { 'currents-record-key': '' });

			assert.equal(evaluateStepCondition(shardUpload.if, { inputs }), true);
		});

		it('is skipped when the caller passes a record key', () => {
			const inputs = resolveInputs(workflow, { 'currents-record-key': 'record-key-value' });

			for (const jobStatus of ['success', 'failure']) {
				assert.equal(
					evaluateStepCondition(shardUpload.if, { inputs, jobStatus }),
					false,
					`shard upload must be skipped on a ${jobStatus} job when a record key is passed`,
				);
			}
		});
	});

	describe('accessibility report upload', () => {
		it('is not gated on the record key', () => {
			assert.doesNotMatch(String(a11yUpload.if), /currents-record-key/);
		});

		it('runs on a failed job whether or not a record key is passed', () => {
			for (const callerInputs of [{}, { 'currents-record-key': 'record-key-value' }]) {
				const inputs = resolveInputs(workflow, callerInputs);

				assert.equal(evaluateStepCondition(a11yUpload.if, { inputs, jobStatus: 'failure' }), true);
			}
		});
	});
});

describe('test-e2e-reusable.yml callers', () => {
	const reusableWorkflow = workflowFile('test-e2e-reusable.yml');
	const shardUpload = stepNamed(reusableWorkflow, 'test', 'Upload Shard Artifacts');

	describe('PR E2E caller', () => {
		const workflow = workflowFile('ci-pull-requests.yml');
		const caller = workflow.jobs.e2e;

		it('passes whether the Currents record key secret is available', () => {
			assert.equal(
				workflow.jobs['install-and-build'].outputs.currents_record_key,
				"${{ secrets.CURRENTS_RECORD_KEY != '' && 'present' || '' }}",
			);
			assert.equal(
				caller.with['currents-record-key'],
				'${{ needs.install-and-build.outputs.currents_record_key }}',
			);
		});

		it('runs the shard upload for fork PRs without the record key', () => {
			const callerInputs = resolveCallerInputs(caller);
			const inputs = resolveInputs(reusableWorkflow, callerInputs);

			assert.equal(callerInputs['currents-record-key'], '');
			assert.equal(evaluateStepCondition(shardUpload.if, { inputs }), true);
		});

		it('skips the shard upload for internal PRs with the record key', () => {
			const callerInputs = resolveCallerInputs(caller, {
				'install-and-build': { currents_record_key: 'present' },
			});
			const inputs = resolveInputs(reusableWorkflow, callerInputs);

			assert.equal(callerInputs['currents-record-key'], 'present');
			assert.equal(evaluateStepCondition(shardUpload.if, { inputs }), false);
		});
	});

	it('leaves coverage and performance shard uploads enabled', () => {
		const callers = [
			workflowFile('test-e2e-coverage-nightly.yml').jobs.e2e,
			workflowFile('test-e2e-performance-reusable.yml').jobs['build-and-test-performance'],
		];

		for (const caller of callers) {
			const callerInputs = resolveCallerInputs(caller);
			const inputs = resolveInputs(reusableWorkflow, callerInputs);

			assert.equal(callerInputs['currents-record-key'] ?? '', '');
			assert.equal(evaluateStepCondition(shardUpload.if, { inputs }), true);
		}
	});
});
