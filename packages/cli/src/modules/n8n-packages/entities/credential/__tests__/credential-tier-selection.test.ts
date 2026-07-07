import type { SlimProject } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { UsableCredential } from '../credential-matcher';
import { resolveByCandidateFilter, selectBestCandidate } from '../credential-tier-selection';

const targetProjectId = 'project-target';
const targetProjectRef = mock<SlimProject>({ id: targetProjectId });

const usable = (overrides: Partial<UsableCredential> & { id: string }): UsableCredential =>
	({
		type: 'githubApi',
		name: overrides.id,
		updatedAt: '2024-01-01T00:00:00.000Z',
		isGlobal: false,
		homeProject: null,
		sharedWithProjects: [],
		...overrides,
	}) as UsableCredential;

describe('selectBestCandidate', () => {
	it('returns undefined for an empty candidate list', () => {
		expect(selectBestCandidate([], targetProjectId)).toBeUndefined();
	});

	it('returns undefined when no candidate is owned by, shared with, or global to the target project', () => {
		const candidates = [usable({ id: 'unrelated' })];
		expect(selectBestCandidate(candidates, targetProjectId)).toBeUndefined();
	});

	it('falls back to a credential shared into the target project when none is owned', () => {
		const candidate = usable({ id: 'shared-in', sharedWithProjects: [targetProjectRef] });
		expect(selectBestCandidate([candidate], targetProjectId)).toBe(candidate);
	});

	it('prefers a credential shared into the target project over a more recently updated global one', () => {
		const sharedIn = usable({
			id: 'shared-in',
			sharedWithProjects: [targetProjectRef],
			updatedAt: '2024-01-01T00:00:00.000Z',
		});
		const global = usable({ id: 'global', isGlobal: true, updatedAt: '2024-06-01T00:00:00.000Z' });
		expect(selectBestCandidate([global, sharedIn], targetProjectId)).toBe(sharedIn);
	});

	it('prefers an owned credential over a more recently updated one merely shared into the project', () => {
		const owned = usable({
			id: 'owned',
			homeProject: targetProjectRef,
			updatedAt: '2024-01-01T00:00:00.000Z',
		});
		const sharedIn = usable({
			id: 'shared-in',
			sharedWithProjects: [targetProjectRef],
			updatedAt: '2024-06-01T00:00:00.000Z',
		});
		expect(selectBestCandidate([sharedIn, owned], targetProjectId)).toBe(owned);
	});

	it('picks the newer candidate when it is encountered after the older one', () => {
		const older = usable({ id: 'older', homeProject: targetProjectRef });
		const newer = usable({
			id: 'newer',
			homeProject: targetProjectRef,
			updatedAt: '2024-06-01T00:00:00.000Z',
		});
		expect(selectBestCandidate([older, newer], targetProjectId)).toBe(newer);
	});

	it('keeps the newer candidate when an older one is encountered after it', () => {
		const newer = usable({
			id: 'newer',
			homeProject: targetProjectRef,
			updatedAt: '2024-06-01T00:00:00.000Z',
		});
		const older = usable({ id: 'older', homeProject: targetProjectRef });
		expect(selectBestCandidate([newer, older], targetProjectId)).toBe(newer);
	});

	it('breaks a same-updatedAt tie by picking the smaller id, regardless of order', () => {
		const a = usable({ id: 'cred-a', homeProject: targetProjectRef });
		const b = usable({ id: 'cred-b', homeProject: targetProjectRef });

		expect(selectBestCandidate([b, a], targetProjectId)).toBe(a);
		expect(selectBestCandidate([a, b], targetProjectId)).toBe(a);
	});
});

describe('resolveByCandidateFilter', () => {
	const reference = {
		id: 'source-cred',
		name: 'Prod',
		type: 'githubApi',
		usedByWorkflows: ['wf-1'],
	};

	it('maps a reference to the best matching candidate', () => {
		const candidate = usable({ id: 'target-cred', homeProject: targetProjectRef });

		const result = resolveByCandidateFilter(
			[reference],
			[candidate],
			targetProjectId,
			(c, r) => c.type === r.type,
		);

		expect(result).toEqual(
			new Map([['source-cred', { targetId: 'target-cred', targetType: 'githubApi' }]]),
		);
	});

	it('omits a reference with no matching candidate', () => {
		const result = resolveByCandidateFilter([reference], [], targetProjectId, () => false);
		expect(result).toEqual(new Map());
	});
});
