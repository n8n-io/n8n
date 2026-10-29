import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parse } from 'yaml';
import { evaluateFilter, parseFilters } from '../actions/ci-filter/ci-filter.mjs';

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

describe('release SBOM validation in PR CI', () => {
	const workflow = workflowFile('ci-pull-requests.yml');
	const filterStep = stepNamed(workflow, 'install-and-build', 'Check for relevant changes');
	const filters = parseFilters(filterStep.with.filters);

	it('runs live generation when the generator or license pipeline changes', () => {
		const patterns = filters.get('sbom');
		assert.ok(patterns, 'PR CI has no SBOM path filter');
		for (const file of [
			'.github/scripts/package.json',
			'.github/scripts/pnpm-lock.yaml',
			'scripts/licenses/enrich-sbom.mjs',
			'scripts/build-n8n.mjs',
			'.github/actions/setup-nodejs/action.yml',
			'.github/workflows/ci-pull-requests.yml',
			'.github/workflows/sbom-validation-callable.yml',
		]) {
			assert.equal(evaluateFilter([file], patterns), true, file);
		}
		for (const file of ['packages/cli/src/index.ts', '.github/scripts/retry.mjs', 'README.md']) {
			assert.equal(evaluateFilter([file], patterns), false, file);
		}
	});

	for (const file of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
		it(`runs live generation when ${file} changes`, () => {
			const patterns = filters.get('sbom');
			assert.ok(patterns, 'PR CI has no SBOM path filter');
			assert.equal(evaluateFilter([file], patterns), true, file);
		});
	}

	it('requires the SBOM check for the same merged commit as the other checks', () => {
		const job = workflow.jobs['validate-sbom'];
		assert.ok(job, 'PR CI has no live SBOM validation job');
		assert.ok(workflow.jobs['required-checks'].needs.includes('validate-sbom'));
		assert.equal(job['continue-on-error'] ?? false, false);
		assert.equal(job.uses, './.github/workflows/sbom-validation-callable.yml');
		assert.equal(job.with.sha, '${{ needs.install-and-build.outputs.commit_sha }}');
		assert.equal(job.if, "needs.install-and-build.outputs.sbom == 'true'");
		assert.equal(
			workflow.jobs['install-and-build'].outputs.sbom,
			'${{ fromJSON(steps.ci-filter.outputs.results).sbom == true }}',
		);
	});

	it('builds the production closure with live license generation and a strict gate', () => {
		const validator = workflowFile('sbom-validation-callable.yml');
		const build = stepNamed(validator, 'validate-sbom', 'Build production deployment artifact');
		assert.equal(build.with['build-command'], 'pnpm build:deploy');
		assert.equal(build.env.N8N_GENERATE_LICENSES, 'true');
		assert.equal(validator.permissions.contents, 'read');
		const gate = stepNamed(validator, 'validate-sbom', 'Gate SBOM on resolved SPDX licenses');
		assert.match(
			gate.run.replaceAll('\\\n', ' '),
			/check-sbom-licenses\.mjs\s+sbom-source\.cdx\.json/,
		);
		assert.equal(gate['continue-on-error'] ?? false, false);
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
