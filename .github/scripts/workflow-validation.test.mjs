import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
 * conditions below use: the status functions, `&&`/`||`, unary `!`,
 * parenthesized grouping, `==`/`!=`, string/boolean literals, `inputs.*`, and
 * `env.*`. Anything outside that subset throws, so a condition this evaluator
 * cannot model fails the test instead of passing silently.
 *
 * @param {string} condition - the raw value of a step's `if:` key
 * @param {{ inputs?: Record<string, unknown>, env?: Record<string, string>, jobStatus?: 'success' | 'failure' | 'cancelled' }} context
 * @returns {boolean} true when the step runs, false when the runner skips it
 */
const evaluateStepCondition = (
	condition,
	{ inputs = {}, env = {}, jobStatus = 'success' } = {},
) => {
	const expression = String(condition)
		.trim()
		.replace(/^\$\{\{(.*)\}\}$/s, '$1')
		.trim();

	const tokenPattern =
		/\s*(?:(\|\||&&|==|!=|[!()])|('(?:[^']|'')*')|([A-Za-z_][\w.-]*(?:\(\))?))/gy;
	const tokens = [];
	let cursor = 0;
	while (cursor < expression.length) {
		tokenPattern.lastIndex = cursor;
		const match = tokenPattern.exec(expression);
		assert.ok(
			match && match.index === cursor,
			`unsupported term in step condition: "${expression.slice(cursor).trim()}"`,
		);
		const [, op, str, ident] = match;
		if (op) tokens.push({ type: 'op', value: op });
		else if (str !== undefined)
			tokens.push({ type: 'str', value: str.slice(1, -1).replaceAll("''", "'") });
		else if (ident) tokens.push({ type: 'ident', value: ident });
		cursor = tokenPattern.lastIndex;
	}

	let pos = 0;
	const peek = () => tokens[pos];
	const consume = () => tokens[pos++];

	const parsePrimary = () => {
		const token = consume();
		assert.ok(token, `unexpected end of step condition: "${expression}"`);

		if (token.type === 'op' && token.value === '(') {
			const inner = parseOr();
			const closing = consume();
			assert.ok(
				closing?.type === 'op' && closing.value === ')',
				`unclosed "(" in step condition: "${expression}"`,
			);
			return inner;
		}

		if (token.type === 'str') return token.value;

		if (token.type === 'ident') {
			switch (token.value) {
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

			const input = token.value.match(/^inputs\.([\w-]+)$/);
			if (input) {
				assert.ok(input[1] in inputs, `condition reads an unknown input "${input[1]}"`);
				return inputs[input[1]];
			}

			const envVar = token.value.match(/^env\.([\w-]+)$/);
			if (envVar) {
				return env[envVar[1]] ?? '';
			}
		}

		assert.fail(`unsupported term in step condition: "${token.value}"`);
	};

	const parseUnary = () => {
		if (peek()?.type === 'op' && peek().value === '!') {
			consume();
			return !Boolean(parseUnary());
		}
		return parsePrimary();
	};

	const parseComparison = () => {
		const left = parseUnary();
		if (peek()?.type === 'op' && (peek().value === '==' || peek().value === '!=')) {
			const operator = consume().value;
			const right = parseUnary();
			const equal = String(left) === String(right);
			return operator === '==' ? equal : !equal;
		}
		return left;
	};

	const parseAnd = () => {
		let result = Boolean(parseComparison());
		while (peek()?.type === 'op' && peek().value === '&&') {
			consume();
			const right = Boolean(parseComparison());
			result = result && right;
		}
		return result;
	};

	const parseOr = () => {
		let result = parseAnd();
		while (peek()?.type === 'op' && peek().value === '||') {
			consume();
			const right = parseAnd();
			result = result || right;
		}
		return result;
	};

	const result = parseOr();
	assert.equal(pos, tokens.length, `unexpected token in step condition: "${peek()?.value}"`);
	return result;
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

	it('supports unary negation, parentheses, and env lookups', () => {
		const condition = "${{ always() && (!inputs.skip || env.KEY == '') }}";
		assert.equal(
			evaluateStepCondition(condition, { inputs: { skip: false }, env: { KEY: 'k' } }),
			true,
		);
		assert.equal(evaluateStepCondition(condition, { inputs: { skip: true }, env: {} }), true);
		assert.equal(
			evaluateStepCondition(condition, { inputs: { skip: true }, env: { KEY: 'k' } }),
			false,
		);
	});

	it('rejects a term it cannot model', () => {
		assert.throws(() => evaluateStepCondition('github.event_name'), /unsupported term/);
	});
});

describe('ownership workflow routing', () => {
	const reviews = workflowFile('ci-owners-required-reviews.yml');
	const dispatch = stepNamed(
		reviews,
		'dispatch-review',
		'Evaluate reviews with the caller on master',
	);

	const runDispatch = (t, { owner = 'n8n-io', numbers = '123\n', failure = '' } = {}) => {
		const directory = mkdtempSync(join(tmpdir(), 'ownership-dispatch-'));
		t.after(() => rmSync(directory, { recursive: true, force: true }));
		const log = join(directory, 'calls.jsonl');
		writeFileSync(log, '');
		writeFileSync(
			join(directory, 'gh'),
			`#!/usr/bin/env node
const { appendFileSync } = require('node:fs');
const args = process.argv.slice(2);
appendFileSync(process.env.MOCK_LOG, JSON.stringify(args) + '\\n');
if (args.includes(process.env.MOCK_FAILURE)) process.exit(1);
if (args.includes('GET')) process.stdout.write(process.env.MOCK_NUMBERS);
`,
			{ mode: 0o755 },
		);
		execFileSync('bash', ['-c', dispatch.run], {
			env: {
				...process.env,
				PATH: `${directory}:${process.env.PATH}`,
				GH_TOKEN: 'test-token',
				GITHUB_REPOSITORY: 'n8n-io/n8n',
				RUN_HEAD_OWNER: owner,
				RUN_HEAD_BRANCH: 'feature/"$(exit 1)',
				MOCK_LOG: log,
				MOCK_NUMBERS: numbers,
				MOCK_FAILURE: failure,
			},
		});
		return readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
	};

	it('uses base-branch callers and keeps the external pins in sync', () => {
		assert.ok(triggersOf(reviews).pull_request_target);
		assert.equal(triggersOf(reviews).pull_request_review, undefined);
		assert.deepEqual(triggersOf(reviews).workflow_run, {
			workflows: ['Util: Notify PR Status'],
			types: ['completed'],
		});
		assert.equal(
			reviews.jobs['dispatch-review'].if,
			"github.event_name == 'workflow_run' && github.event.workflow_run.event == 'pull_request_review'",
		);
		assert.equal(reviews.jobs['required-reviews'].if, "github.event_name != 'workflow_run'");
		assert.match(reviews.jobs['required-reviews'].uses, /ownership-checks\.yml@[a-f0-9]{40}$/);
		assert.equal(reviews.jobs['required-reviews'].with['ownership-comment'], true);
		assert.ok(reviews.jobs['dispatch-review'].steps.every((step) => !step.uses));
	});

	for (const owner of ['n8n-io', 'contributor']) {
		it(`dispatches each open PR from ${owner} on master`, (t) => {
			const [lookup, ...calls] = runDispatch(t, { owner, numbers: '123\n456\n' });
			assert.ok(lookup.includes('--paginate'));
			assert.ok(lookup.includes('state=open'));
			assert.ok(lookup.includes(`head=${owner}:feature/"$(exit 1)`));
			assert.deepEqual(
				calls,
				['123', '456'].map((number) => [
					'api',
					'-X',
					'POST',
					'repos/n8n-io/n8n/actions/workflows/ci-owners-required-reviews.yml/dispatches',
					'-f',
					'ref=master',
					'-f',
					`inputs[pr_number]=${number}`,
				]),
			);
		});
	}

	it('does not dispatch when no open PR matches', (t) => {
		assert.equal(runDispatch(t, { numbers: '' }).length, 1);
	});

	for (const failure of ['GET', 'POST']) {
		it(`fails when the ${failure} request fails`, (t) => {
			assert.throws(() => runDispatch(t, { failure }));
		});
	}
});

describe('automated release PR CI bypass', () => {
	const releasePrConjunction = [
		"github.event.pull_request.user.login == 'n8n-assistant[bot]'",
		"startsWith(github.event.pull_request.head.ref, 'release-pr/')",
		"startsWith(github.event.pull_request.base.ref, 'release/')",
	].join(' && ');
	const compact = (condition) =>
		condition
			.trim()
			.replace(/^\$\{\{(.*)\}\}$/s, '$1')
			.replaceAll(/\s/g, '');

	const assertSkipsReleasePr = (condition) => {
		assert.ok(compact(condition).includes(`!(${compact(releasePrConjunction)})`));
	};
	const assertPassesReleasePr = (condition) => {
		assert.equal(
			compact(condition),
			compact(`github.event_name == 'pull_request' && ${releasePrConjunction}`),
		);
	};
	const assertNeedsPrPolicy = (job) => {
		assert.ok(job.needs === 'pr-policy' || job.needs.includes('pr-policy'));
	};
	const assertUsesPrPolicy = (job) => {
		assertNeedsPrPolicy(job);
		assert.match(job.if, /needs\.pr-policy\.outputs\.skip-ci != 'true'/);
	};

	it('skips the expensive PR jobs and keeps the aggregate checks', () => {
		const policy = workflowFile('ci-pr-policy-reusable.yml');
		assert.equal(policy.jobs.classify.outputs['skip-ci'], '${{ steps.policy.outputs.skip-ci }}');
		assertPassesReleasePr(stepNamed(policy, 'classify', 'Evaluate PR policy').env.SKIP_CI);

		const ci = workflowFile('ci-pull-requests.yml');
		assert.equal(ci.jobs['pr-policy'].uses, './.github/workflows/ci-pr-policy-reusable.yml');
		assertUsesPrPolicy(ci.jobs['install-and-build']);
		assertUsesPrPolicy(ci.jobs['format-check']);
		assert.equal(ci.jobs['required-checks'].if, 'always()');
		assertNeedsPrPolicy(ci.jobs['required-checks']);
		assert.equal(
			stepNamed(ci, 'required-checks', 'Validate required checks').if,
			"needs.pr-policy.outputs.skip-ci != 'true'",
		);
		assert.equal(
			stepNamed(ci, 'required-checks', 'Pass automated release PR').if,
			"needs.pr-policy.outputs.skip-ci == 'true'",
		);

		const quality = workflowFile('ci-pr-quality.yml');
		assert.equal(quality.jobs['pr-policy'].uses, './.github/workflows/ci-pr-policy-reusable.yml');
		assertUsesPrPolicy(quality.jobs.changes);
		assertUsesPrPolicy(quality.jobs['check-knip']);
		assertUsesPrPolicy(quality.jobs['check-do-not-merge']);
		assert.equal(quality.jobs['required-pr-quality-checks'].if, 'always()');
		assertNeedsPrPolicy(quality.jobs['required-pr-quality-checks']);
		assert.equal(
			stepNamed(quality, 'required-pr-quality-checks', 'Validate required checks').if,
			"needs.pr-policy.outputs.skip-ci != 'true'",
		);
		assert.equal(
			stepNamed(quality, 'required-pr-quality-checks', 'Pass automated release PR').if,
			"needs.pr-policy.outputs.skip-ci == 'true'",
		);
	});

	it('skips standalone workflows for automated release PRs', () => {
		assertSkipsReleasePr(workflowFile('docker-build-smoke.yml').jobs.gate.if);
		assertSkipsReleasePr(workflowFile('ci-owners-validation.yml').jobs.validate.if);
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

	it('validates the full SHA before checking out the SBOM source without persisted credentials', () => {
		const validator = workflowFile('sbom-validation-callable.yml');
		const steps = validator.jobs['validate-sbom'].steps;
		const validation = stepNamed(validator, 'validate-sbom', 'Validate SBOM source SHA');
		const checkout = stepNamed(validator, 'validate-sbom', 'Checkout SBOM source');

		assert.ok(steps.indexOf(validation) < steps.indexOf(checkout));
		assert.match(validation.run, /\^\[0-9a-f\]\{40\}\$/);
		assert.doesNotMatch(validation.run, /git (fetch|checkout)/);
		assert.equal(checkout.uses, 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1');
		assert.equal(checkout.with.ref, '${{ inputs.sha }}');
		assert.equal(checkout.with['persist-credentials'], false);
	});
});

describe('release PR verification gate', () => {
	const workflow = workflowFile('release-create-pr.yml');

	it('requires successful verification before creating the PR', () => {
		const create = workflow.jobs['create-release-pr'];
		assert.ok(create.needs.includes('verify-single-instance-npm-full'));
		assert.equal(create.if ?? 'success()', 'success()');
		assert.ok(workflow.jobs['approve-and-automerge'].needs.includes('create-release-pr'));
	});

	it('fails release preparation on findings from all packages on the release base', () => {
		const verify = workflow.jobs['verify-single-instance-npm-full'];
		assert.equal(verify.uses, './.github/workflows/test-single-instance-npm.yml');
		assert.equal(verify.with.scope, 'all');
		assert.equal(verify.with.blocking, true);
		assert.equal(verify.with['base-branch'], '${{ needs.resolve-release-base.outputs.sha }}');
		assert.equal(verify['continue-on-error'] ?? false, false);
	});

	it('uses one resolved commit for verification and release preparation', () => {
		const resolve = workflow.jobs['resolve-release-base'];
		const verify = workflow.jobs['verify-single-instance-npm-full'];
		const create = workflow.jobs['create-release-pr'];
		assert.equal(resolve.outputs.sha, '${{ steps.resolve.outputs.sha }}');
		assert.equal(
			resolve.steps.find((step) => step.uses?.startsWith('actions/checkout@')).with.ref,
			'${{ inputs.base-branch }}',
		);
		assert.ok(verify.needs.includes('resolve-release-base'));
		assert.ok(create.needs.includes('resolve-release-base'));
		for (const name of ['Switch to base commit', 'Push the base branch']) {
			assert.equal(
				stepNamed(workflow, 'create-release-pr', name).env.BASE_SHA,
				verify.with['base-branch'],
			);
		}
	});

	it('keeps the verified commit when the selected branch advances', (t) => {
		const directory = mkdtempSync(join(tmpdir(), 'release-base-'));
		t.after(() => rmSync(directory, { recursive: true, force: true }));
		const env = {
			...process.env,
			GIT_AUTHOR_NAME: 'Test User',
			GIT_AUTHOR_EMAIL: 'test@example.com',
			GIT_COMMITTER_NAME: 'Test User',
			GIT_COMMITTER_EMAIL: 'test@example.com',
			GITHUB_OUTPUT: join(directory, 'output'),
			NEXT_RELEASE: '1.0.1',
		};
		const git = (...args) =>
			execFileSync('git', args, {
				cwd: directory,
				env,
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'pipe'],
			}).trim();
		const runStep = (step) =>
			execFileSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', step.run], {
				cwd: directory,
				env,
				stdio: 'pipe',
			});
		git('init', '--initial-branch=selected-base');
		git('commit', '--allow-empty', '-m', 'Verified base');
		const verifiedSha = git('rev-parse', 'HEAD');
		runStep(stepNamed(workflow, 'resolve-release-base', 'Resolve base commit'));
		env.BASE_SHA = readFileSync(env.GITHUB_OUTPUT, 'utf8').trim().replace(/^sha=/, '');
		assert.equal(env.BASE_SHA, verifiedSha);

		git('commit', '--allow-empty', '-m', 'Later base');
		assert.notEqual(git('rev-parse', 'selected-base'), verifiedSha);
		runStep(stepNamed(workflow, 'create-release-pr', 'Switch to base commit'));
		assert.equal(git('rev-parse', 'HEAD'), verifiedSha);

		const remote = join(directory, 'remote.git');
		git('init', '--bare', remote);
		git('remote', 'add', 'origin', remote);
		git('update-ref', 'refs/remotes/origin/selected-base', git('rev-parse', 'selected-base'));
		writeFileSync(join(directory, 'version.txt'), '1.0.1');
		runStep(stepNamed(workflow, 'create-release-pr', 'Push the base branch'));
		assert.equal(git('--git-dir', remote, 'rev-parse', 'refs/heads/release/1.0.1'), verifiedSha);
	});
});

describe('test-e2e-reusable.yml', () => {
	const workflow = workflowFile('test-e2e-reusable.yml');
	const steps = workflow.jobs.test.steps;
	const mintStep = stepNamed(workflow, 'test', 'Mint Currents record key');
	const runTests = stepNamed(workflow, 'test', 'Run Tests');
	const shardUpload = stepNamed(workflow, 'test', 'Upload Shard Artifacts');
	const a11yUpload = stepNamed(workflow, 'test', 'Upload Accessibility Report');
	const cancelStep = stepNamed(workflow, 'test', 'Cancel Currents run if workflow is cancelled');
	const revokeStep = stepNamed(workflow, 'test', 'Revoke Currents OIDC record key');

	describe('skip-shard-upload-when-recording input', () => {
		it('replaces currents-record-key with an optional boolean defaulting to false', () => {
			const declaredInputs = triggersOf(workflow).workflow_call.inputs;
			const skipInput = declaredInputs['skip-shard-upload-when-recording'];

			assert.equal(declaredInputs['currents-record-key'], undefined);
			assert.ok(skipInput, 'workflow does not declare skip-shard-upload-when-recording');
			assert.equal(skipInput.type, 'boolean');
			assert.equal(skipInput.required ?? false, false);
			assert.equal(skipInput.default, false);
		});
	});

	describe('shard artifact upload', () => {
		it('runs for default callers even when Currents records', () => {
			const inputs = resolveInputs(workflow);

			for (const jobStatus of ['success', 'failure']) {
				for (const env of [{}, { CURRENTS_RECORD_KEY: 'crnts_ci_live' }]) {
					assert.equal(
						evaluateStepCondition(shardUpload.if, { inputs, env, jobStatus }),
						true,
						`shard upload must run on a ${jobStatus} job for nightly callers`,
					);
				}
			}
		});

		it('runs when skip-shard-upload-when-recording is true and no record key is exported (fork PRs)', () => {
			const inputs = resolveInputs(workflow, { 'skip-shard-upload-when-recording': true });

			for (const jobStatus of ['success', 'failure']) {
				for (const env of [{}, { CURRENTS_RECORD_KEY: '' }]) {
					assert.equal(
						evaluateStepCondition(shardUpload.if, { inputs, env, jobStatus }),
						true,
						`shard upload must run on a ${jobStatus} fork job when no record key is exported`,
					);
				}
			}
		});

		it('is skipped when skip-shard-upload-when-recording is true and Currents records', () => {
			const inputs = resolveInputs(workflow, { 'skip-shard-upload-when-recording': true });

			for (const jobStatus of ['success', 'failure']) {
				assert.equal(
					evaluateStepCondition(shardUpload.if, {
						inputs,
						env: { CURRENTS_RECORD_KEY: 'crnts_ci_live' },
						jobStatus,
					}),
					false,
					`shard upload must be skipped on a ${jobStatus} job when recording with skip enabled`,
				);
			}
		});
	});

	describe('accessibility report upload', () => {
		it('is not gated on Currents recording', () => {
			assert.doesNotMatch(String(a11yUpload.if), /CURRENTS_RECORD_KEY|skip-shard-upload/);
		});

		it('runs on a failed job whether or not Currents records', () => {
			for (const callerInputs of [{}, { 'skip-shard-upload-when-recording': true }]) {
				const inputs = resolveInputs(workflow, callerInputs);
				for (const env of [{}, { CURRENTS_RECORD_KEY: 'crnts_ci_live' }]) {
					assert.equal(
						evaluateStepCondition(a11yUpload.if, { inputs, env, jobStatus: 'failure' }),
						true,
					);
				}
			}
		});
	});

	describe('Currents OIDC lifecycle and permissions', () => {
		it('mints before Run Tests, cancels via OIDC helper without CURRENTS_API_KEY, and revokes last', () => {
			assert.equal(workflow.jobs.test.permissions.contents, 'read');
			assert.equal(workflow.jobs.test.permissions['id-token'], 'write');
			assert.ok(steps.indexOf(mintStep) < steps.indexOf(runTests));
			assert.ok(steps.indexOf(cancelStep) < steps.indexOf(revokeStep));
			assert.equal(steps.indexOf(revokeStep), steps.length - 1);
			assert.equal(runTests.env.CURRENTS_RECORD_KEY, undefined);
			assert.equal(mintStep.env.CURRENTS_OIDC_POLICY_ID, '${{ vars.CURRENTS_OIDC_POLICY_ID }}');
			assert.equal(mintStep.env.FALLBACK_CURRENTS_RECORD_KEY, '${{ secrets.CURRENTS_RECORD_KEY }}');
			assert.match(mintStep.run, /currents-oidc\.mjs mint/);
			assert.match(cancelStep.run, /currents-oidc\.mjs cancel/);
			assert.equal(cancelStep.env?.CURRENTS_API_KEY, undefined);
			assert.equal(
				evaluateStepCondition(cancelStep.if, {
					env: { CURRENTS_RECORD_KEY: 'crnts_ci_live' },
					jobStatus: 'cancelled',
				}),
				true,
			);
			assert.equal(
				evaluateStepCondition(cancelStep.if, { env: {}, jobStatus: 'cancelled' }),
				false,
			);
			assert.match(revokeStep.run, /currents-oidc\.mjs revoke/);
			assert.equal(revokeStep['continue-on-error'], true);
			assert.equal(
				evaluateStepCondition(revokeStep.if, {
					env: { CURRENTS_RECORD_KEY: 'crnts_ci_live' },
					jobStatus: 'failure',
				}),
				true,
			);
			assert.equal(evaluateStepCondition(revokeStep.if, { env: {}, jobStatus: 'success' }), false);
		});

		it('wires ci-pull-requests.yml and all OIDC callers with id-token: write', () => {
			const prCi = workflowFile('ci-pull-requests.yml');
			assert.equal(prCi.jobs['install-and-build'].outputs.currents_record_key, undefined);
			assert.equal(prCi.jobs.e2e.with['currents-record-key'], undefined);
			assert.equal(prCi.jobs.e2e.with['skip-shard-upload-when-recording'], true);

			const oidcCallerJobs = [
				['ci-pull-requests.yml', 'e2e'],
				['ci-pull-requests.yml', 'e2e-engine'],
				['ci-pull-requests.yml', 'e2e-performance'],
				['test-e2e-performance-reusable.yml', 'build-and-test-performance'],
				['test-e2e-performance-reusable.yml', 'idle-memory-baselines'],
				['test-e2e-pc-nightly.yml', 'e2e'],
				['test-e2e-coverage-nightly.yml', 'e2e'],
				['test-e2e-infrastructure-reusable.yml', 'benchmark'],
				['test-image-efficiency.yml', 'image-efficiency'],
				['test-workflows-callable.yml', 'run_workflow_tests'],
				['test-workflows-nightly.yml', 'run_workflow_tests'],
			];
			for (const [file, jobName] of oidcCallerJobs) {
				const caller = workflowFile(file);
				const permissions = caller.jobs[jobName].permissions;
				assert.equal(
					permissions?.contents,
					'read',
					`${file} job ${jobName} must grant contents: read`,
				);
				assert.equal(
					permissions?.['id-token'],
					'write',
					`${file} job ${jobName} must grant id-token: write`,
				);
			}

			const imageEff = workflowFile('test-image-efficiency.yml');
			const imageJob = imageEff.jobs['image-efficiency'];
			assert.equal(imageJob.env.CURRENTS_RECORD_KEY, undefined);
			assert.ok(
				imageJob.steps.indexOf(
					stepNamed(imageEff, 'image-efficiency', 'Mint Currents record key'),
				) <
					imageJob.steps.indexOf(
						stepNamed(imageEff, 'image-efficiency', 'Measure image layer efficiency'),
					),
			);
			assert.equal(
				imageJob.steps.indexOf(
					stepNamed(imageEff, 'image-efficiency', 'Revoke Currents OIDC record key'),
				),
				imageJob.steps.length - 1,
			);

			const wfCallable = workflowFile('test-workflows-callable.yml');
			const wfJob = wfCallable.jobs.run_workflow_tests;
			const wfCheckout = stepNamed(wfCallable, 'run_workflow_tests', 'Checkout repository');
			const wfHelperCheckout = stepNamed(
				wfCallable,
				'run_workflow_tests',
				'Checkout Currents OIDC helper',
			);
			const wfMint = stepNamed(wfCallable, 'run_workflow_tests', 'Mint Currents record key');
			const wfRun = stepNamed(wfCallable, 'run_workflow_tests', 'Run Workflow Tests');
			const wfSchema = stepNamed(wfCallable, 'run_workflow_tests', 'Run Workflow Schema Tests');
			const wfRevoke = stepNamed(
				wfCallable,
				'run_workflow_tests',
				'Revoke Currents OIDC record key',
			);
			assert.ok(wfJob.steps.indexOf(wfCheckout) < wfJob.steps.indexOf(wfHelperCheckout));
			assert.ok(wfJob.steps.indexOf(wfHelperCheckout) < wfJob.steps.indexOf(wfMint));
			assert.equal(wfHelperCheckout.with.ref, '${{ github.sha }}');
			assert.equal(wfHelperCheckout.with['sparse-checkout'], '.github/scripts/currents-oidc.mjs');
			assert.equal(wfHelperCheckout.with['sparse-checkout-cone-mode'], false);
			assert.equal(wfHelperCheckout.with['persist-credentials'], false);
			const helperPath = `${wfHelperCheckout.with.path}/.github/scripts/currents-oidc.mjs`;
			assert.ok(wfHelperCheckout.with.path, 'OIDC helper must check out into a separate path');
			assert.equal(wfMint.run, `node ${helperPath} mint`);
			assert.equal(wfRevoke.run, `node ${helperPath} revoke`);
			assert.ok(wfJob.steps.indexOf(wfMint) < wfJob.steps.indexOf(wfRun));
			assert.equal(wfRun.env.CURRENTS_RECORD_KEY, undefined);
			assert.equal(wfSchema.env.CURRENTS_RECORD_KEY, undefined);
			assert.equal(wfJob.steps.indexOf(wfRevoke), wfJob.steps.length - 1);
		});
	});
});

describe('unpublished package handling', () => {
	const scheduledCheck = workflowFile('ci-detect-new-packages.yml');
	const releasePublish = workflowFile('release-publish.yml');

	it('checks unpublished packages every two hours on Mondays and Tuesdays', () => {
		const check = stepNamed(scheduledCheck, 'detect-new-packages', 'Check unpublished packages');
		const notify = stepNamed(
			scheduledCheck,
			'detect-new-packages',
			'Notify Developer Platform alerts channel',
		);

		assert.deepEqual(triggersOf(scheduledCheck).schedule, [{ cron: '15 */2 * * 1' }]);
		assert.match(check.run, /detect-new-packages\.mjs --report-only --strict/);
		assert.equal(notify.if, "steps.detect.outputs.packages != '[]'");
		assert.match(notify.run, /--channel '#alerts-developer-platforms'/);
		assert.ok(notify.run.includes(String.raw`\(.name)`));
		assert.ok(notify.run.includes(String.raw`\(.path)`));
		assert.match(notify.run, /\/actions\/workflows\/release-publish-new-package\.yml\|/);
		assert.match(notify.run, /\/actions\/runs\/.*\|View the check>/);
	});

	it('uses a setup-only dist-tag for the initial publish', () => {
		const setup = workflowFile('release-publish-new-package.yml');
		const publish = stepNamed(setup, 'publish-to-npm', 'Publish throwaway package version');

		assert.equal(publish.if, "steps.registry.outputs.exists == 'false'");
		assert.equal(publish['working-directory'], '${{ inputs.package-path }}');
		assert.match(publish.run, /pnpm publish --access public --tag tp-setup --no-git-checks/);
	});

	it('keeps unpublished package setup out of the release workflow', () => {
		const publish = releasePublish.jobs['publish-to-npm'];

		assert.equal(releasePublish.jobs['setup-trusted-publishing'], undefined);
		assert.deepEqual(publish.needs, ['determine-version-info']);
		assert.equal(publish.if, 'github.event.pull_request.merged == true');
		assert.equal(
			publish.steps.some((step) => step.run?.includes('detect-new-packages.mjs')),
			false,
		);
	});
});
