import type { GitHubSkillCandidate, SkillGitSourceInfo } from '@n8n/api-types';

import {
	canPickCandidate,
	initialPicks,
	picksNeedAcknowledgement,
	shortSha,
	skillGitState,
	validPicks,
} from './skillsGitHub.utils';

function source(overrides: Partial<SkillGitSourceInfo> = {}): SkillGitSourceInfo {
	return {
		owner: 'acme',
		repo: 'skills',
		ref: 'main',
		refType: 'branch',
		path: 'skills/notes',
		htmlUrl: 'https://github.com/acme/skills/tree/main/skills/notes',
		syncedCommitSha: 'a'.repeat(40),
		status: 'ok',
		lastError: null,
		lastCheckedAt: null,
		update: null,
		...overrides,
	};
}

function candidate(
	path: string,
	result: 'passed' | 'review' | 'blocked' = 'passed',
	importedTo: Array<{ projectId: string | null }> = [],
): GitHubSkillCandidate {
	return {
		path,
		name: path,
		description: '',
		check: { result, findings: [] },
		skippedFiles: [],
		importedTo,
	};
}

describe('skillGitState', () => {
	it.each([
		[null, null],
		[source(), null],
		[source({ update: { status: 'pending', toCommitSha: 'b' } }), 'update'],
		[source({ update: { status: 'blocked', toCommitSha: 'b' } }), 'blocked'],
		[source({ status: 'unavailable' }), 'unavailable'],
		[source({ status: 'rate_limited' }), 'delayed'],
		[source({ refType: 'tag', ref: 'v1' }), 'fixed'],
	])('maps %j to %s', (input, expected) => {
		expect(skillGitState(input)).toBe(expected);
	});
});

describe('import picks', () => {
	const candidates = [
		candidate('a'),
		candidate('b', 'review'),
		candidate('c', 'blocked'),
		candidate('d', 'passed', [{ projectId: null }]),
	];

	it('starts with every folder that can be imported into the place', () => {
		expect(initialPicks(candidates, null)).toEqual(['a', 'b']);
		expect(initialPicks(candidates, 'p1')).toEqual(['a', 'b', 'd']);
	});

	it('never lets a blocked folder be picked', () => {
		expect(canPickCandidate(candidates[2], 'p1')).toBe(false);
	});

	it('drops picks that a new place makes impossible', () => {
		expect(validPicks(['a', 'd', 'gone'], candidates, null)).toEqual(['a']);
	});

	it('needs the warnings confirmed only when a picked folder has them', () => {
		expect(picksNeedAcknowledgement(['a'], candidates)).toBe(false);
		expect(picksNeedAcknowledgement(['a', 'b'], candidates)).toBe(true);
	});
});

it('shortens a commit SHA', () => {
	expect(shortSha('e7f3b10aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe('e7f3b10');
});
