/**
 * Run these tests with:
 *
 * node --test ./.github/scripts/bump-versions.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	generateExperimentalVersion,
	getOverrides,
	parseWorkspaceYaml,
	getCatalogs,
	computeChangedOverrides,
	computeChangedCatalogEntries,
	markDirtyByRootChanges,
	propagateDirtyTransitively,
	computeNewVersion,
} from './bump-versions.mjs';

describe('generateExperimentalVersion', () => {
	it('creates -exp.0 from a stable version', () => {
		assert.equal(generateExperimentalVersion('1.2.3'), '1.2.3-exp.0');
	});

	it('increments exp minor when already at exp.0', () => {
		assert.equal(generateExperimentalVersion('1.2.3-exp.0'), '1.2.3-exp.1');
	});

	it('increments exp minor when already at exp.5', () => {
		assert.equal(generateExperimentalVersion('1.2.3-exp.5'), '1.2.3-exp.6');
	});

	it('creates -exp.0 from a version with a different pre-release tag', () => {
		assert.equal(generateExperimentalVersion('1.2.3-beta.1'), '1.2.3-exp.0');
	});

	it('handles multi-digit version numbers', () => {
		assert.equal(generateExperimentalVersion('10.20.30'), '10.20.30-exp.0');
	});

	it('throws on an invalid version string', () => {
		assert.throws(() => generateExperimentalVersion('not-a-version'), /Invalid version/);
	});
});

describe('getOverrides', () => {
	it('returns empty object when no overrides exist', () => {
		assert.deepEqual(getOverrides({}), {});
	});

	it('returns pnpm.overrides when only pnpm.overrides is set', () => {
		assert.deepEqual(getOverrides({ pnpm: { overrides: { lodash: '^4.0.0' } } }), {
			lodash: '^4.0.0',
		});
	});

	it('returns overrides when only top-level overrides is set', () => {
		assert.deepEqual(getOverrides({ overrides: { lodash: '^4.0.0' } }), { lodash: '^4.0.0' });
	});

	it('merges both fields with top-level overrides taking precedence for the same key', () => {
		assert.deepEqual(
			getOverrides({
				pnpm: { overrides: { lodash: '^3.0.0', underscore: '^1.0.0' } },
				overrides: { lodash: '^4.0.0' },
			}),
			{ lodash: '^4.0.0', underscore: '^1.0.0' },
		);
	});
});

describe('parseWorkspaceYaml', () => {
	it('parses valid YAML into an object', () => {
		assert.deepEqual(parseWorkspaceYaml('catalog:\n  lodash: "^4.0.0"'), {
			catalog: { lodash: '^4.0.0' },
		});
	});

	it('returns empty object for an empty string', () => {
		assert.deepEqual(parseWorkspaceYaml(''), {});
	});

	it('returns empty object for invalid YAML', () => {
		assert.deepEqual(parseWorkspaceYaml(': - invalid: [yaml}'), {});
	});
});

describe('getCatalogs', () => {
	it('returns empty map when no catalog or catalogs field exists', () => {
		assert.equal(getCatalogs({}).size, 0);
	});

	it('returns a "default" entry for the top-level catalog field', () => {
		const result = getCatalogs({ catalog: { lodash: '^4.0.0' } });
		assert.equal(result.size, 1);
		assert.deepEqual(result.get('default'), { lodash: '^4.0.0' });
	});

	it('returns named entries from the catalogs field', () => {
		const result = getCatalogs({ catalogs: { react18: { react: '^18.0.0' } } });
		assert.equal(result.size, 1);
		assert.deepEqual(result.get('react18'), { react: '^18.0.0' });
	});

	it('returns both default and named catalog entries when both fields are present', () => {
		const result = getCatalogs({
			catalog: { lodash: '^4.0.0' },
			catalogs: { react18: { react: '^18.0.0' } },
		});
		assert.equal(result.size, 2);
		assert.deepEqual(result.get('default'), { lodash: '^4.0.0' });
		assert.deepEqual(result.get('react18'), { react: '^18.0.0' });
	});
});

describe('computeChangedOverrides', () => {
	it('returns empty set when nothing changed', () => {
		assert.equal(computeChangedOverrides({ lodash: '^4' }, { lodash: '^4' }).size, 0);
	});

	it('detects an added override', () => {
		const result = computeChangedOverrides({ lodash: '^4' }, {});
		assert.ok(result.has('lodash'));
	});

	it('detects a removed override', () => {
		const result = computeChangedOverrides({}, { lodash: '^4' });
		assert.ok(result.has('lodash'));
	});

	it('detects a changed override value', () => {
		const result = computeChangedOverrides({ lodash: '^4' }, { lodash: '^3' });
		assert.ok(result.has('lodash'));
	});

	it('does not include unchanged overrides', () => {
		const result = computeChangedOverrides(
			{ lodash: '^4', underscore: '^1' },
			{ lodash: '^4', underscore: '^1' },
		);
		assert.equal(result.size, 0);
	});

	it('handles mixed changed and unchanged overrides', () => {
		const result = computeChangedOverrides(
			{ lodash: '^4', underscore: '^2' },
			{ lodash: '^4', underscore: '^1' },
		);
		assert.equal(result.size, 1);
		assert.ok(result.has('underscore'));
		assert.ok(!result.has('lodash'));
	});
});

describe('computeChangedCatalogEntries', () => {
	it('returns empty map when nothing changed', () => {
		const current = new Map([['default', { lodash: '^4' }]]);
		const previous = new Map([['default', { lodash: '^4' }]]);
		assert.equal(computeChangedCatalogEntries(current, previous).size, 0);
	});

	it('detects an added dep in a catalog', () => {
		const current = new Map([['default', { lodash: '^4' }]]);
		const previous = new Map([['default', {}]]);
		const result = computeChangedCatalogEntries(current, previous);
		assert.ok(result.get('default')?.has('lodash'));
	});

	it('detects a removed dep from a catalog', () => {
		const current = new Map([['default', {}]]);
		const previous = new Map([['default', { lodash: '^4' }]]);
		const result = computeChangedCatalogEntries(current, previous);
		assert.ok(result.get('default')?.has('lodash'));
	});

	it('detects a changed dep version in a catalog', () => {
		const current = new Map([['default', { lodash: '^4' }]]);
		const previous = new Map([['default', { lodash: '^3' }]]);
		const result = computeChangedCatalogEntries(current, previous);
		assert.ok(result.get('default')?.has('lodash'));
	});

	it('detects changes in a named catalog', () => {
		const current = new Map([['react18', { react: '^18' }]]);
		const previous = new Map([['react18', { react: '^17' }]]);
		const result = computeChangedCatalogEntries(current, previous);
		assert.ok(result.get('react18')?.has('react'));
	});

	it('detects a newly added catalog', () => {
		const current = new Map([['newCatalog', { lodash: '^4' }]]);
		const previous = new Map();
		const result = computeChangedCatalogEntries(current, previous);
		assert.ok(result.get('newCatalog')?.has('lodash'));
	});

	it('detects a removed catalog', () => {
		const current = new Map();
		const previous = new Map([['oldCatalog', { lodash: '^4' }]]);
		const result = computeChangedCatalogEntries(current, previous);
		assert.ok(result.get('oldCatalog')?.has('lodash'));
	});

	it('does not include a catalog that has no changed entries', () => {
		const current = new Map([
			['default', { lodash: '^4' }],
			['react18', { react: '^18' }],
		]);
		const previous = new Map([
			['default', { lodash: '^3' }],
			['react18', { react: '^18' }],
		]);
		const result = computeChangedCatalogEntries(current, previous);
		assert.ok(result.has('default'));
		assert.ok(!result.has('react18'));
	});
});

describe('markDirtyByRootChanges', () => {
	it('marks a package dirty when its dep appears in changedOverrides', () => {
		const packageMap = { 'pkg-a': { isDirty: false } };
		const depsByPackage = { 'pkg-a': { lodash: '^4' } };
		markDirtyByRootChanges(packageMap, depsByPackage, new Set(['lodash']), new Map());
		assert.ok(packageMap['pkg-a'].isDirty);
	});

	it('skips already-dirty packages', () => {
		const packageMap = { 'pkg-a': { isDirty: true } };
		// No deps, but package is already dirty — should not throw or change state
		const depsByPackage = { 'pkg-a': {} };
		markDirtyByRootChanges(packageMap, depsByPackage, new Set(['lodash']), new Map());
		assert.ok(packageMap['pkg-a'].isDirty);
	});

	it('marks a package dirty when its dep uses "catalog:" (default catalog) and that entry changed', () => {
		const packageMap = { 'pkg-a': { isDirty: false } };
		const depsByPackage = { 'pkg-a': { lodash: 'catalog:' } };
		const changedCatalogEntries = new Map([['default', new Set(['lodash'])]]);
		markDirtyByRootChanges(packageMap, depsByPackage, new Set(), changedCatalogEntries);
		assert.ok(packageMap['pkg-a'].isDirty);
	});

	it('marks a package dirty when its dep uses "catalog:<name>" and that named catalog entry changed', () => {
		const packageMap = { 'pkg-a': { isDirty: false } };
		const depsByPackage = { 'pkg-a': { react: 'catalog:react18' } };
		const changedCatalogEntries = new Map([['react18', new Set(['react'])]]);
		markDirtyByRootChanges(packageMap, depsByPackage, new Set(), changedCatalogEntries);
		assert.ok(packageMap['pkg-a'].isDirty);
	});

	it('does not mark a package dirty when none of its deps changed', () => {
		const packageMap = { 'pkg-a': { isDirty: false } };
		const depsByPackage = { 'pkg-a': { lodash: '^4' } };
		markDirtyByRootChanges(packageMap, depsByPackage, new Set(['underscore']), new Map());
		assert.ok(!packageMap['pkg-a'].isDirty);
	});

	it('does not mark a package dirty when a catalog: dep is in a catalog with no changes', () => {
		const packageMap = { 'pkg-a': { isDirty: false } };
		const depsByPackage = { 'pkg-a': { lodash: 'catalog:' } };
		const changedCatalogEntries = new Map([['default', new Set(['underscore'])]]);
		markDirtyByRootChanges(packageMap, depsByPackage, new Set(), changedCatalogEntries);
		assert.ok(!packageMap['pkg-a'].isDirty);
	});

	it('does not mark a package dirty when a catalog: dep is in a different catalog than the one that changed', () => {
		const packageMap = { 'pkg-a': { isDirty: false } };
		const depsByPackage = { 'pkg-a': { react: 'catalog:react18' } };
		const changedCatalogEntries = new Map([['default', new Set(['react'])]]);
		markDirtyByRootChanges(packageMap, depsByPackage, new Set(), changedCatalogEntries);
		assert.ok(!packageMap['pkg-a'].isDirty);
	});
});

describe('propagateDirtyTransitively', () => {
	it('does nothing when no packages are dirty', () => {
		const packageMap = {
			'pkg-a': { isDirty: false },
			'pkg-b': { isDirty: false },
		};
		const depsByPackage = {
			'pkg-a': { 'pkg-b': 'workspace:*' },
			'pkg-b': {},
		};
		propagateDirtyTransitively(packageMap, depsByPackage);
		assert.ok(!packageMap['pkg-a'].isDirty);
		assert.ok(!packageMap['pkg-b'].isDirty);
	});

	it('propagates dirty state one level up the dependency chain', () => {
		const packageMap = {
			'pkg-a': { isDirty: false },
			'pkg-b': { isDirty: true },
		};
		const depsByPackage = {
			'pkg-a': { 'pkg-b': 'workspace:*' },
			'pkg-b': {},
		};
		propagateDirtyTransitively(packageMap, depsByPackage);
		assert.ok(packageMap['pkg-a'].isDirty);
	});

	it('propagates dirty state through multiple levels', () => {
		const packageMap = {
			'pkg-a': { isDirty: false },
			'pkg-b': { isDirty: false },
			'pkg-c': { isDirty: true },
		};
		const depsByPackage = {
			'pkg-a': { 'pkg-b': 'workspace:*' },
			'pkg-b': { 'pkg-c': 'workspace:*' },
			'pkg-c': {},
		};
		propagateDirtyTransitively(packageMap, depsByPackage);
		assert.ok(packageMap['pkg-b'].isDirty, 'pkg-b should be dirty (depends on dirty pkg-c)');
		assert.ok(packageMap['pkg-a'].isDirty, 'pkg-a should be dirty (depends on dirty pkg-b)');
	});

	it('does not mark packages dirty when their deps are external (not in packageMap)', () => {
		const packageMap = { 'pkg-a': { isDirty: false } };
		const depsByPackage = { 'pkg-a': { lodash: '^4' } };
		propagateDirtyTransitively(packageMap, depsByPackage);
		assert.ok(!packageMap['pkg-a'].isDirty);
	});

	it('handles diamond dependency graphs without infinite loops', () => {
		// pkg-a depends on pkg-b and pkg-c; both depend on pkg-d (dirty)
		const packageMap = {
			'pkg-a': { isDirty: false },
			'pkg-b': { isDirty: false },
			'pkg-c': { isDirty: false },
			'pkg-d': { isDirty: true },
		};
		const depsByPackage = {
			'pkg-a': { 'pkg-b': 'workspace:*', 'pkg-c': 'workspace:*' },
			'pkg-b': { 'pkg-d': 'workspace:*' },
			'pkg-c': { 'pkg-d': 'workspace:*' },
			'pkg-d': {},
		};
		propagateDirtyTransitively(packageMap, depsByPackage);
		assert.ok(packageMap['pkg-b'].isDirty);
		assert.ok(packageMap['pkg-c'].isDirty);
		assert.ok(packageMap['pkg-a'].isDirty);
	});
});

describe('computeNewVersion', () => {
	it('increments patch version', () => {
		assert.equal(computeNewVersion('1.2.3', 'patch'), '1.2.4');
	});

	it('increments minor version (resets patch)', () => {
		assert.equal(computeNewVersion('1.2.3', 'minor'), '1.3.0');
	});

	it('increments major version (resets minor and patch)', () => {
		assert.equal(computeNewVersion('1.2.3', 'major'), '2.0.0');
	});

	it('creates -exp.0 from a stable version for experimental', () => {
		assert.equal(computeNewVersion('1.2.3', 'experimental'), '1.2.3-exp.0');
	});

	it('increments exp minor for experimental when already an exp version', () => {
		assert.equal(computeNewVersion('1.2.3-exp.0', 'experimental'), '1.2.3-exp.1');
	});

	it('creates a premajor rc version from a stable version', () => {
		assert.equal(computeNewVersion('1.2.3', 'premajor'), '2.0.0-rc.0');
	});

	it('increments the rc prerelease number for premajor when already an rc version', () => {
		assert.equal(computeNewVersion('2.0.0-rc.0', 'premajor'), '2.0.0-rc.1');
	});

	it('increments rc correctly across multiple premajor calls', () => {
		assert.equal(computeNewVersion('2.0.0-rc.4', 'premajor'), '2.0.0-rc.5');
	});
});
