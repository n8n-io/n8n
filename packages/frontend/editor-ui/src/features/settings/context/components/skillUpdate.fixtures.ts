// Fixtures for the tests of the update review: a source, its updates and a review.
import type {
	SkillPendingUpdate,
	SkillSourceListItem,
	SkillSourceUpdates,
	SkillUpdateReview,
} from '@n8n/api-types';

export function sourceItem(overrides: Partial<SkillSourceListItem> = {}): SkillSourceListItem {
	return {
		id: 'src-1',
		type: 'github',
		label: 'acme/skills',
		ref: 'main',
		path: '',
		webUrl: 'https://github.com/acme/skills/tree/main',
		projectId: 'team-1',
		projectName: 'Marketing',
		projectType: 'team',
		skillCount: 3,
		updatesAvailable: 0,
		updatesBlocked: 0,
		lastCheckedAt: '2026-10-29T12:00:00.000Z',
		canReview: true,
		...overrides,
	};
}

export function pendingUpdate(overrides: Partial<SkillPendingUpdate> = {}): SkillPendingUpdate {
	return {
		skillId: 'skill-1',
		name: 'brand-voice',
		location: 'skills/brand-voice',
		webUrl: 'https://github.com/acme/skills/tree/main/skills/brand-voice',
		contentHash: 'hash-1',
		revision: 'a91c0e2aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
		check: { verdict: 'pass', findings: [] },
		current: { name: 'brand-voice', description: 'Voice', instructions: 'Use short sentences.' },
		update: {
			name: 'brand-voice',
			description: 'Voice',
			instructions: 'Use short sentences.\nPrefer active voice.',
			references: [{ path: 'references/tone.md', content: '# Tone\n' }],
		},
		currentFrontmatter: null,
		updateFrontmatter: null,
		nameClash: null,
		impact: { nextVersion: 3, followingAgents: 2, publishedAgents: 1 },
		...overrides,
	};
}

const commit = {
	revision: 'a91c0e2aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
	baseRevision: 'f02b1aabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
	message: 'brand-voice: add tone examples',
	author: 'lena',
	date: '2026-10-29T10:00:00.000Z',
	commits: 2,
	webUrl: 'https://github.com/acme/skills/compare/f02b1aa...a91c0e2',
};

export function sourceUpdates(overrides: Partial<SkillSourceUpdates> = {}): SkillSourceUpdates {
	return {
		source: sourceItem({ updatesAvailable: 1 }),
		commit,
		updates: [pendingUpdate()],
		...overrides,
	};
}

export function updateReview(
	update: Partial<SkillPendingUpdate> = {},
	source: Partial<SkillSourceListItem> = {},
): SkillUpdateReview {
	return {
		source: sourceItem({ updatesAvailable: 1, ...source }),
		commit,
		update: pendingUpdate(update),
	};
}
