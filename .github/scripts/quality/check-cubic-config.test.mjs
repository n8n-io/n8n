import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { after, before, describe, it } from 'node:test';

/**
 * Run with:
 * node --test .github/scripts/quality/check-cubic-config.test.mjs
 */

let checkConfig, fileCharacters, schemaErrors, MAX_CUBIC_AGENTS, MAX_RULE_CHARS, WARN_RATIO;
let schema;
before(async () => {
	({ checkConfig, fileCharacters, schemaErrors, MAX_CUBIC_AGENTS, MAX_RULE_CHARS, WARN_RATIO } =
		await import('./check-cubic-config.mjs'));
	schema = JSON.parse(readFileSync(new URL('./cubic-config.schema.json', import.meta.url), 'utf8'));
});

/** Violations only, for the cases that assert nothing about warnings. */
const violationsOf = (...args) => checkConfig(...args).violations;

/** @param {Array<object>} rules @param {string} [customInstructions] */
const config = (rules, customInstructions) => ({
	version: 1,
	reviews: { custom_rules: rules, ...(customInstructions && { custom_instructions: customInstructions }) },
});

/** @param {string} name */
const rule = (name) => ({ name, description: 'x' });

const noFiles = () => -1;
const emptyFiles = () => 0;

describe('limits', () => {
	it('caps agents at 5', () => {
		assert.equal(MAX_CUBIC_AGENTS, 5);
	});

	it('caps rule size at 10000', () => {
		assert.equal(MAX_RULE_CHARS, 10_000);
	});

	it('warns at 80% of the ceiling', () => {
		assert.equal(WARN_RATIO, 0.8);
	});
});

describe('checkConfig', () => {
	it('accepts a config at the agent cap', () => {
		const rules = Array.from({ length: MAX_CUBIC_AGENTS }, (_, i) => rule(`r${i}`));
		assert.deepEqual(violationsOf(config(rules), emptyFiles), []);
	});

	it('names every rule that will never run when the cap is exceeded', () => {
		const rules = Array.from({ length: MAX_CUBIC_AGENTS + 2 }, (_, i) => rule(`r${i}`));
		const [violation, ...rest] = violationsOf(config(rules), emptyFiles);

		assert.deepEqual(rest, []);
		assert.match(violation, /only the first 5 take effect/);
		assert.match(violation, /r5, r6/);
	});

	it('flags a linked file that does not exist', () => {
		const rules = [{ name: 'Frontend', description: '', file_paths: ['.agents/gone.md'] }];
		const violations = violationsOf(config(rules), noFiles);

		assert.equal(violations.length, 1);
		assert.match(violations[0], /"Frontend" links `\.agents\/gone\.md`, which does not exist/);
	});

	it('counts linked file length toward the character ceiling', () => {
		const rules = [{ name: 'Big', description: 'a'.repeat(9_000), file_paths: ['doc.md'] }];

		assert.deepEqual(
			violationsOf(config(rules), () => 500),
			[],
		);

		const violations = violationsOf(config(rules), () => 2_000);
		assert.equal(violations.length, 1);
		assert.match(violations[0], /"Big" is 11,000 characters/);
	});

	it('measures a description in characters, not UTF-8 bytes', () => {
		// Each em dash is 3 bytes but one character. By bytes this is 12,000 and
		// would fail; by characters it is 4,000 and fits.
		const rules = [{ name: 'Dashes', description: '—'.repeat(4_000) }];

		assert.deepEqual(violationsOf(config(rules), emptyFiles), []);
	});

	it('flags a rule with neither a description nor linked files', () => {
		const violations = violationsOf(config([{ name: 'Empty' }]), emptyFiles);

		assert.equal(violations.length, 1);
		assert.match(violations[0], /needs a `description`, `file_paths`, or both/);
	});

	it('flags an unnamed rule', () => {
		const violations = violationsOf(config([{ description: 'x' }]), emptyFiles);

		assert.equal(violations.length, 1);
		assert.match(violations[0], /rule #1 has no `name`/);
	});

	it('flags a wrong schema version', () => {
		const violations = violationsOf({ version: 2, reviews: { custom_rules: [] } }, emptyFiles);

		assert.equal(violations.length, 1);
		assert.match(violations[0], /`version` must be 1, found 2/);
	});

	it('accepts a config with no custom rules at all', () => {
		assert.deepEqual(violationsOf({ version: 1 }, emptyFiles), []);
	});

	it('flags a rule file that no agent links', () => {
		const rules = [{ name: 'Backend', description: '', file_paths: ['rules/linked.md'] }];
		const onDisk = ['rules/linked.md', 'rules/orphan.md'];
		const { violations } = checkConfig(config(rules), emptyFiles, onDisk);

		assert.equal(violations.length, 1);
		assert.match(violations[0], /`rules\/orphan\.md` is not linked by any agent/);
	});

	it('accepts rule files that are all linked', () => {
		const rules = [
			{ name: 'A', description: '', file_paths: ['rules/a.md'] },
			{ name: 'B', description: '', file_paths: ['rules/b.md'] },
		];
		const { violations } = checkConfig(config(rules), emptyFiles, ['rules/a.md', 'rules/b.md']);

		assert.deepEqual(violations, []);
	});
});

describe('shared custom_instructions', () => {
	it('charges the shared block against every agent, not once overall', () => {
		const rules = [{ name: 'A', description: 'a'.repeat(100) }, { name: 'B', description: 'b'.repeat(200) }];
		const { ruleLengths, sharedChars } = checkConfig(config(rules, 'i'.repeat(1_000)), emptyFiles);

		assert.equal(sharedChars, 1_000);
		assert.equal(ruleLengths['"A"'], 1_100);
		assert.equal(ruleLengths['"B"'], 1_200);
	});

	it('fails an agent that only busts the ceiling once the shared block is added', () => {
		const rules = [{ name: 'Security', description: 'a'.repeat(9_500) }];

		assert.deepEqual(violationsOf(config(rules), emptyFiles), []);

		const violations = violationsOf(config(rules, 'i'.repeat(1_000)), emptyFiles);
		assert.equal(violations.length, 1);
		assert.match(violations[0], /"Security" is 10,500 characters/);
	});

	it('splits own and shared characters so the fix is obvious', () => {
		const rules = [{ name: 'Security', description: 'a'.repeat(9_500) }];
		const [violation] = violationsOf(config(rules, 'i'.repeat(1_000)), emptyFiles);

		assert.match(violation, /9,500 its own \+ 1,000 shared `custom_instructions`/);
	});

	it('splits own and shared characters in the warning too', () => {
		const rules = [{ name: 'Security', description: 'a'.repeat(7_500) }];
		const { violations, warnings } = checkConfig(config(rules, 'i'.repeat(1_000)), emptyFiles);

		assert.deepEqual(violations, []);
		assert.equal(warnings.length, 1);
		assert.match(warnings[0], /at 85% of the 10,000-character ceiling/);
		assert.match(warnings[0], /7,500 its own \+ 1,000 shared `custom_instructions`/);
	});

	it('omits the split when there is no shared block', () => {
		const rules = [{ name: 'Security', description: 'a'.repeat(10_001) }];
		const [violation] = violationsOf(config(rules), emptyFiles);

		assert.doesNotMatch(violation, /its own/);
	});

	it('flags a shared block that fills the ceiling on its own', () => {
		const rules = [{ name: 'A', description: 'x' }];
		const violations = violationsOf(config(rules, 'i'.repeat(MAX_RULE_CHARS)), emptyFiles);

		assert.match(violations[0], /`reviews\.custom_instructions` is 10,000 characters/);
		assert.match(violations[0], /No agent's own rules would survive/);
	});

	it('reports sharedChars as 0 when the block is absent', () => {
		assert.equal(checkConfig(config([rule('A')]), emptyFiles).sharedChars, 0);
	});

	it('measures the shared block in characters, not UTF-8 bytes', () => {
		const rules = [{ name: 'A', description: '' , file_paths: ['doc.md'] }];
		// 4,000 em dashes: 12,000 bytes, 4,000 characters. By bytes this would fail.
		const { violations, sharedChars } = checkConfig(config(rules, '—'.repeat(4_000)), () => 5_000);

		assert.equal(sharedChars, 4_000);
		assert.deepEqual(violations, []);
	});
});

describe('ceiling warnings', () => {
	it('warns without failing once a rule passes 80%', () => {
		const rules = [{ name: 'Security', description: 'a'.repeat(8_500) }];
		const { violations, warnings } = checkConfig(config(rules), emptyFiles);

		assert.deepEqual(violations, []);
		assert.equal(warnings.length, 1);
		assert.match(warnings[0], /"Security" is at 85% of the 10,000-character ceiling/);
	});

	it('stays quiet below the warning threshold', () => {
		const rules = [{ name: 'Security', description: 'a'.repeat(7_000) }];
		const { violations, warnings } = checkConfig(config(rules), emptyFiles);

		assert.deepEqual(violations, []);
		assert.deepEqual(warnings, []);
	});

	it('reports a violation rather than a warning once over the ceiling', () => {
		const rules = [{ name: 'Security', description: 'a'.repeat(10_001) }];
		const { violations, warnings } = checkConfig(config(rules), emptyFiles);

		assert.equal(violations.length, 1);
		assert.deepEqual(warnings, []);
	});
});

describe('schemaErrors', () => {
	/** @param {object} reviews */
	const cfg = (reviews) => ({ version: 1, reviews });

	it('accepts the settings we actually use', () => {
		const errors = schemaErrors(
			cfg({ enabled: true, sensitivity: 'medium', incremental_commits: true, check_drafts: true }),
			schema,
		);
		assert.deepEqual(errors, []);
	});

	it('rejects a sensitivity outside the enum and lists the allowed values', () => {
		const [error, ...rest] = schemaErrors(cfg({ sensitivity: 'strict' }), schema);

		assert.deepEqual(rest, []);
		assert.match(error, /\/reviews\/sensitivity must be equal to one of the allowed values/);
		assert.match(error, /allowed: low, medium, high/);
	});

	it('names a mistyped key rather than saying "additional properties"', () => {
		const [error, ...rest] = schemaErrors(cfg({ check_draft: true }), schema);

		assert.deepEqual(rest, []);
		assert.equal(error, '/reviews has an unknown key `check_draft`.');
	});

	it('rejects a wrong type', () => {
		const [error] = schemaErrors(cfg({ incremental_commits: 'sometimes' }), schema);
		assert.match(error, /\/reviews\/incremental_commits must be boolean/);
	});

	it('rejects a per-rule field cubic does not support', () => {
		const config = cfg({ custom_rules: [{ name: 'A', description: 'x', severity: 'high' }] });
		const [error] = schemaErrors(config, schema);

		assert.equal(error, '/reviews/custom_rules/0 has an unknown key `severity`.');
	});

	it('requires a version', () => {
		const errors = schemaErrors({ reviews: {} }, schema);
		assert.ok(errors.some((e) => e.includes('version')));
	});
});

describe('fileCharacters', () => {
	const REPO_ROOT = new URL('../../..', import.meta.url).pathname;
	let dir;

	before(() => {
		dir = mkdtempSync(join(tmpdir(), 'cubic-chars-'));
	});
	after(() => rmSync(dir, { recursive: true, force: true }));

	/** @param {string} name @param {string} content */
	const write = (name, content) => {
		const abs = join(dir, name);
		writeFileSync(abs, content, 'utf8');
		return relative(REPO_ROOT, abs);
	};

	it('counts characters, not UTF-8 bytes', () => {
		// 100 em dashes: 300 bytes, 100 characters. statSync().size would say 300.
		const path = write('dashes.md', '—'.repeat(100));
		assert.equal(fileCharacters(path), 100);
	});

	it('counts ASCII unchanged, where bytes and characters agree', () => {
		const path = write('ascii.md', 'a'.repeat(100));
		assert.equal(fileCharacters(path), 100);
	});

	it('returns -1 for a path that does not resolve', () => {
		assert.equal(fileCharacters('.agents/review-rules/does-not-exist.md'), -1);
	});
});
