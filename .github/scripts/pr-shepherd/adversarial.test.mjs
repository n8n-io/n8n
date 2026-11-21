import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { checkLocalTeams, planRefs, validateTeams } from './pr-shepherd.mjs';

const team = '.agents/review-rules/teams/ai-agents/';
const initialPolicy = {
	OWNERS:
		'* @n8n-io/qa-dx\npackages/a/ @n8n-io/ai-agents required(2)\npackages/b/ @n8n-io/ai-assistant involved',
	'cubic.yaml':
		'version: 1\nreviews:\n  custom_rules:\n    - name: Backend\n      include: ["packages/**"]\n      exclude: ["**/test/**"]\n      file_paths: ["shared.md"]\n',
	[`${team}rule.md`]: 'Applies to: package a.\nCheck requests.',
	[`${team}profile.json`]: '{"lanes":[{"preset":"unit-tests","paths":["packages/a/"]}]}',
	'packages/a/original.ts': 'original content',
	'packages/a/deleted.ts': 'delete me',
};

function fixture(run) {
	const cwd = mkdtempSync(join(tmpdir(), 'shepherd-adversarial-'));
	const git = (...args) =>
		execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
	const write = (path, content) => {
		mkdirSync(dirname(join(cwd, path)), { recursive: true });
		writeFileSync(join(cwd, path), content);
	};
	const commit = () => {
		git('add', '--all');
		git(
			'-c',
			'user.name=Test',
			'-c',
			'user.email=test@example.invalid',
			'commit',
			'-qm',
			'fixture',
		);
		return git('rev-parse', 'HEAD');
	};
	try {
		git('init', '-q');
		for (const [path, content] of Object.entries(initialPolicy)) write(path, content);
		const policy = commit();
		run({
			cwd,
			git,
			write,
			commit,
			policy,
			plan: (head, base = policy, policyRef = policy) => planRefs({ cwd, base, head, policyRef }),
		});
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
}

test('rejects malformed and schema-invalid cubic policy with the policy filename', () => {
	fixture(({ write, commit, plan, policy }) => {
		for (const content of [
			'[',
			'{}',
			'version: 1',
			'version: 1\nreviews:\n  custom_rules: broken',
			'version: 1\nreviews:\n  custom_rules: [{name: Bad, include: [2]}]',
		]) {
			write('cubic.yaml', content);
			const head = commit();
			assert.throws(() => plan(head, policy, head), /cubic.yaml:/);
		}
	});
});

test('local checks reject non-rule files, nested directories, and symlinks without following them', () => {
	fixture(({ cwd, write }) => {
		assert.deepEqual(checkLocalTeams(cwd), []);
		write(`${team}bad.txt`, 'not a rule');
		assert.match(checkLocalTeams(cwd).join('\n'), /bad.txt: use only/);
		rmSync(join(cwd, `${team}bad.txt`));
		write(`${team}nested/rule.md`, 'Applies to: nested.');
		assert.match(checkLocalTeams(cwd).join('\n'), /nested directories/);
		rmSync(join(cwd, `${team}nested`), { recursive: true });
		for (const target of ['/does/not/exist', cwd]) {
			const path = `${team}link.md`;
			symlinkSync(target, join(cwd, path));
			assert.match(checkLocalTeams(cwd).join('\n'), /symlinks are not allowed/);
			rmSync(join(cwd, path));
		}
		write(`${team}bad.md`, '# No scope');
		assert.match(checkLocalTeams(cwd).join('\n'), /Applies to/);
	});
});

test('local checks reject symlinks at the team root and its ancestors', () => {
	for (const path of ['.agents/review-rules/teams', '.agents/review-rules', '.agents']) {
		fixture(({ cwd }) => {
			rmSync(join(cwd, path), { recursive: true });
			symlinkSync(cwd, join(cwd, path));
			assert.match(checkLocalTeams(cwd).join('\n'), /symlinks are not allowed/);
		});
	}
});

test('Git policy rejects symlinks by mode before reading their contents', () => {
	let reads = 0;
	assert.match(
		validateTeams(
			[`${team}rule.md`],
			() => {
				reads++;
				throw new Error('must not read');
			},
			[{ team: '@n8n-io/ai-agents' }],
			() => '120000',
		).join('\n'),
		/symlinks are not allowed/,
	);
	assert.equal(reads, 0);
	fixture(({ cwd, commit, plan, policy }) => {
		symlinkSync('/does/not/exist', join(cwd, `${team}outside.md`));
		const head = commit();
		assert.throws(() => plan(head, policy, head), /symlinks are not allowed/);
	});
});

test('ref errors are explicit and flag-like refs cannot reach Git options', () => {
	fixture(({ git, write, commit, plan, policy }) => {
		assert.throws(() => plan(policy, '--output=x'), /Invalid Git ref: --output=x/);
		assert.throws(() => plan('--help'), /Invalid Git ref: --help/);
		assert.throws(() => plan(policy, policy, '--output=x'), /Invalid Git ref: --output=x/);
		assert.throws(() => plan(policy, 'missing'), /Cannot resolve Git ref: missing/);
		git('checkout', '--orphan', 'unrelated');
		write('orphan.txt', 'unrelated');
		assert.throws(() => plan(commit()), /no merge base \(unrelated histories\)/);
	});
});

test('rename, deletion, quoted Unicode paths, test-only reviews, and glob exclusions', () => {
	fixture(({ git, write, commit, plan, cwd }) => {
		mkdirSync(join(cwd, 'packages/b'), { recursive: true });
		git('mv', 'packages/a/original.ts', 'packages/b/renamed.ts');
		rmSync(join(cwd, 'packages/a/deleted.ts'));
		const names = ['-dash.ts', 'é space.ts', 'a..b.ts', '.dot.ts', 'test/excluded.ts'];
		for (const name of names) write(`packages/a/${name}`, 'new');
		git('-c', 'core.quotePath=true', 'diff', '--name-status');
		const result = plan(commit());
		assert(result.files.includes('packages/a/original.ts'));
		assert(result.files.includes('packages/a/deleted.ts'));
		for (const name of names) assert(result.files.includes(`packages/a/${name}`));
		assert.equal(
			result.teams.find((entry) => entry.team === '@n8n-io/ai-assistant').reviews[0].rule,
			'involved',
		);
		assert(result.agents[0].files.includes('packages/a/.dot.ts'));
		assert(!result.agents[0].files.includes('packages/a/test/excluded.ts'));
		const base = result.head;
		write('packages/a/new.test.ts', 'test');
		write('packages/b/new.spec.ts', 'test');
		assert(plan(commit(), base).teams.every((entry) => entry.reviews.length === 0));
	});
});

test('head cannot replace trusted OWNERS, rules, or lane instructions', () => {
	fixture(({ write, commit, plan }) => {
		write('OWNERS', '* @n8n-io/attacker');
		write(`${team}profile.json`, '{"lanes":[{"preset":"unit-tests; rm -rf /","paths":["*"]}]}');
		write('.agents/review-rules/teams/attacker/rule.md', 'Applies to: everything.');
		write('packages/a/probe.ts', 'new');
		const result = plan(commit());
		assert(result.teams.some((entry) => entry.team === '@n8n-io/ai-agents'));
		assert(!result.teams.some((entry) => entry.team === '@n8n-io/attacker'));
		assert.deepEqual(
			result.lanes.map((lane) => lane.preset),
			['unit-tests'],
		);
		assert.equal(result.policyChanges.length, 3);
	});
});

test('diverged base uses the merge base and missing team folders remain explicit gaps', () => {
	fixture(({ git, write, commit, plan, policy, cwd }) => {
		write('base-only', 'base');
		const base = commit();
		git('checkout', '-b', 'diverged', policy);
		write('head-only', 'head');
		const head = commit();
		assert.deepEqual(plan(head, base).files, ['head-only']);
		rmSync(join(cwd, '.agents/review-rules/teams'), { recursive: true });
		write('packages/a/probe.ts', 'new');
		const noTeams = commit();
		const result = plan(noTeams, head, noTeams);
		assert(result.teams.find((entry) => entry.team === '@n8n-io/ai-agents').gap);
		assert.equal(result.lanes.length, 0);
	});
});
