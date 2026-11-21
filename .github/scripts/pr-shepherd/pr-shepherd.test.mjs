import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
	buildPlan,
	changedPaths,
	markdown,
	planRefs,
	validateProfile,
	validateTeams,
} from './pr-shepherd.mjs';

const prefix = '.agents/review-rules/teams/ai-agents/';
const policy = {
	OWNERS: '* @n8n-io/fallback\npackages/@n8n/agents/ @n8n-io/ai-agents required(2)',
	'cubic.yaml':
		'version: 1\nreviews:\n  custom_rules:\n    - name: Backend\n      include: ["packages/**"]\n      exclude: ["**/*.test.ts"]\n      file_paths: ["shared.md"]\n',
	[`${prefix}provider.md`]: 'Applies to: model requests.\nCheck provider boundaries.',
	[`${prefix}profile.json`]: JSON.stringify({
		lanes: [{ preset: 'unit-tests', paths: ['packages/@n8n/agents/'] }],
	}),
	'packages/@n8n/agents/AGENTS.md': '# Agent rules',
};
const plan = (paths, source = policy) =>
	buildPlan({
		files: new Set(paths),
		policyFiles: Object.keys(source),
		read: (path) => source[path],
		base: 'base',
		head: 'head',
		policy: 'policy',
	});

test('counts old and new rename paths, deleted files, and unusual filenames', () => {
	assert.deepEqual(
		[...changedPaths('R100\0old name\0new\nname\0D\0gone\0M\0kept\0')],
		['old name', 'new\nname', 'gone', 'kept'],
	);
	assert.deepEqual([...changedPaths('')], []);
	assert.throws(() => changedPaths('R100\0old\0'), /Invalid/);
});

test('routes files, review counts, cubic exclusions, rules, guidance, lanes and gaps', () => {
	const result = plan([
		'packages/@n8n/agents/src/a.ts',
		'packages/@n8n/agents/src/a.test.ts',
		'other',
	]);
	assert.equal(result.teams[0].fileCount, 2);
	assert.deepEqual(result.teams[0].reviews, [
		{ file: 'packages/@n8n/agents/src/a.ts', rule: 'required', count: 2 },
	]);
	assert.deepEqual(result.teams[0].rules, [`${prefix}provider.md`]);
	assert.equal(result.teams[1].gap, true);
	assert.deepEqual(result.agents[0].files, ['packages/@n8n/agents/src/a.ts']);
	assert.deepEqual(result.agents[0].file_paths, ['shared.md']);
	assert.deepEqual(result.guidance, ['packages/@n8n/agents/AGENTS.md']);
	assert.equal(result.lanes[0].files.length, 2);
	assert.match(markdown(result), /GAP: no rules folder/);
});

test('empty diff has no routing, lanes, agents or guidance', () => {
	const result = plan([]);
	for (const key of ['teams', 'lanes', 'agents', 'guidance', 'policyChanges'])
		assert.deepEqual(result[key], []);
});

test('AI Agents unit lane covers changed AI utilities with trusted profile policy', () => {
	const source = {
		...policy,
		OWNERS: `${policy.OWNERS}\npackages/@n8n/ai-utilities/ @n8n-io/ai-agents`,
		[`${prefix}profile.json`]: readFileSync(
			new URL('../../../.agents/review-rules/teams/ai-agents/profile.json', import.meta.url),
			'utf8',
		),
	};
	const changed = [
		'packages/@n8n/agents/src/runtime/model/openai-config-model.ts',
		'packages/@n8n/ai-utilities/src/suppliers/supplyModel.ts',
		'packages/@n8n/ai-utilities/src/__tests__/suppliers/supplyModel.test.ts',
	];
	assert.deepEqual(
		plan(changed, source).lanes.find((lane) => lane.preset === 'unit-tests').files,
		changed,
	);
	assert.equal(plan([], source).lanes.length, 0);
	assert.equal(plan(['outside.ts'], source).lanes.length, 0);
});

test('lists policy edits without changing policy', () => {
	assert.deepEqual(plan(['OWNERS', `${prefix}profile.json`, 'cubic.yaml']).policyChanges, [
		'OWNERS',
		`${prefix}profile.json`,
		'cubic.yaml',
	]);
});

test('rejects arbitrary commands, unknown presets, keys and invalid patterns', () => {
	const lane = { preset: 'unit-tests', paths: ['*'] };
	for (const invalid of [
		null,
		{},
		{ lanes: 'bad' },
		{ lanes: [], command: 'sh' },
		{ lanes: [{ ...lane, command: 'sh' }] },
		{ lanes: [{ ...lane, preset: 'shell' }] },
		{ lanes: [{ ...lane, paths: [] }] },
		{ lanes: [{ ...lane, paths: ['**/*.ts'] }] },
		{ lanes: [{ ...lane, paths: ['../outside'] }] },
		{ lanes: [{ ...lane, evidence: 'log' }] },
		{ lanes: [{ ...lane, notes: 1 }] },
	])
		assert.throws(() => validateProfile(invalid));
	assert.deepEqual(validateProfile({ lanes: [] }), { lanes: [] });
	assert.doesNotThrow(() =>
		validateProfile({ lanes: [{ ...lane, evidence: ['output'], notes: 'Focus on the diff.' }] }),
	);
});

test('validates all team rules and profiles and rejects nested rules', () => {
	const entries = [{ team: '@n8n-io/ai-agents' }];
	assert.deepEqual(
		validateTeams(Object.keys(policy), (path) => policy[path], entries),
		[],
	);
	for (const [path, content, expected] of [
		[`${prefix}nested/bad.md`, '# Missing scope', /nested directories/],
		['.agents/review-rules/teams/unknown/rule.md', 'Applies to: x', /unknown OWNERS/],
		[`${prefix}profile.json`, '{', /JSON/],
	]) {
		assert.match(validateTeams([path], () => content, entries).join('\n'), expected);
	}
});

test('git integration pins trusted policy and ignores malicious head policy', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'shepherd-test-'));
	const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
	const write = (path, content) => {
		mkdirSync(join(cwd, path, '..'), { recursive: true });
		writeFileSync(join(cwd, path), content);
	};
	try {
		git('init', '-q');
		for (const [path, content] of Object.entries(policy)) write(path, content);
		write('packages/@n8n/agents/src/old.ts', 'old');
		git('add', '--all');
		const commit = () =>
			git(
				'-c',
				'user.name=Test',
				'-c',
				'user.email=test@example.invalid',
				'commit',
				'-qm',
				'fixture',
			);
		commit();
		const base = git('rev-parse', 'HEAD');
		git('mv', 'packages/@n8n/agents/src/old.ts', 'packages/@n8n/agents/src/new.ts');
		write('OWNERS', '* @n8n-io/attacker');
		write(`${prefix}profile.json`, '{"lanes":[{"preset":"shell"}]}');
		git('add', '--all');
		commit();
		const head = git('rev-parse', 'HEAD');
		const result = planRefs({ base, head, cwd });
		assert.equal(result.policy, base);
		assert.equal(result.teams.find((team) => team.team === '@n8n-io/ai-agents').fileCount, 2);
		assert.equal(result.lanes[0].preset, 'unit-tests');
		assert(result.files.includes('packages/@n8n/agents/src/old.ts'));
		assert(result.policyChanges.includes('OWNERS'));
		assert.equal(planRefs({ base, head, policyRef: base, cwd }).policy, base);
		assert.throws(() => planRefs({ base: 'missing', head, cwd }));
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});
