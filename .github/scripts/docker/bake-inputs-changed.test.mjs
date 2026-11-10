import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bakeInputs, changedTargets } from './bake-inputs-changed.mjs';

const plan = (args, extra = {}) => ({
	target: {
		base: {
			context: '.',
			dockerfile: 'docker/images/n8n-base/Dockerfile',
			args,
			tags: ['n8nio/base:26'],
			...extra,
		},
	},
});

describe('changedTargets', () => {
	it('ignores tags and context, and the order of args', () => {
		const before = bakeInputs(plan({ A: '1', B: '2' }), ['base']);
		const after = bakeInputs(plan({ B: '2', A: '1' }, { tags: ['other'], context: 'x' }), ['base']);
		assert.deepEqual(changedTargets(before, after), []);
	});

	it('reports a changed build arg', () => {
		const before = bakeInputs(plan({ DHI_REF: 'dhi.io/node:26.13.0@sha256:a' }), ['base']);
		const after = bakeInputs(plan({ DHI_REF: 'dhi.io/node:26.13.0@sha256:b' }), ['base']);
		assert.deepEqual(changedTargets(before, after), ['base']);
	});

	it('reports a changed Dockerfile', () => {
		const before = bakeInputs(plan({}), ['base']);
		const after = bakeInputs(plan({}, { dockerfile: 'docker/images/n8n-base/Dockerfile.debian' }), [
			'base',
		]);
		assert.deepEqual(changedTargets(before, after), ['base']);
	});

	it('reports a changed stage', () => {
		const before = bakeInputs(plan({}, { target: 'runtime' }), ['base']);
		const after = bakeInputs(plan({}, { target: 'dev' }), ['base']);
		assert.deepEqual(changedTargets(before, after), ['base']);
	});

	it('reports a target that the base commit does not have', () => {
		const before = bakeInputs({ target: {} }, ['base']);
		const after = bakeInputs(plan({}), ['base']);
		assert.deepEqual(changedTargets(before, after), ['base']);
	});
});
