import { describe, it, before, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Run with:
 * node --test --experimental-test-module-mocks .github/scripts/quality/check-baseline-growth.test.mjs
 */

mock.module('../github-helpers.mjs', {
	namedExports: {
		initGithub: () => {},
		getEventFromGithubEventPath: () => {},
		readPrLabels: () => [],
	},
});

let parseTotalViolations, shouldFail, OPT_IN_LABEL;
before(async () => {
	({ parseTotalViolations, shouldFail, OPT_IN_LABEL } = await import(
		'./check-baseline-growth.mjs'
	));
});

describe('parseTotalViolations', () => {
	it('reads totalViolations from a valid baseline', () => {
		assert.equal(parseTotalViolations(JSON.stringify({ totalViolations: 84 })), 84);
	});

	it('returns 0 for missing contents', () => {
		assert.equal(parseTotalViolations(null), 0);
		assert.equal(parseTotalViolations(undefined), 0);
		assert.equal(parseTotalViolations(''), 0);
	});

	it('returns 0 for unparseable or shapeless contents', () => {
		assert.equal(parseTotalViolations('not json'), 0);
		assert.equal(parseTotalViolations(JSON.stringify({ totalViolations: 'many' })), 0);
		assert.equal(parseTotalViolations(JSON.stringify({})), 0);
	});
});

describe('shouldFail', () => {
	it('fails when the baseline grew without the opt-in label', () => {
		assert.equal(shouldFail({ baseTotal: 84, headTotal: 85, hasOptInLabel: false }), true);
	});

	it('passes when growth is opted into via the label', () => {
		assert.equal(shouldFail({ baseTotal: 84, headTotal: 85, hasOptInLabel: true }), false);
	});

	it('passes when the baseline is unchanged', () => {
		assert.equal(shouldFail({ baseTotal: 84, headTotal: 84, hasOptInLabel: false }), false);
	});

	it('passes when the baseline shrank', () => {
		assert.equal(shouldFail({ baseTotal: 84, headTotal: 80, hasOptInLabel: false }), false);
	});
});

describe('OPT_IN_LABEL', () => {
	it('is allow-baseline-growth', () => {
		assert.equal(OPT_IN_LABEL, 'allow-baseline-growth');
	});
});
