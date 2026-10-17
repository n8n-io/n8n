import { describe, expect, it } from 'vitest';

import {
	draftMatchesPublished,
	isPinnedBehindLatest,
	skillVersionState,
} from './skillVersionState';

describe('skillVersionState', () => {
	it('is latest when the draft follows the latest version and the live agent runs it', () => {
		expect(
			skillVersionState({
				draft: 4,
				live: 4,
				latest: 4,
				pinned: false,
				liveHasSameContent: false,
				scope: 'project',
			}),
		).toEqual({
			kind: 'latest',
			draft: 4,
			live: 4,
			latest: 4,
		});
	});

	it('is not live when no published version uses the skill', () => {
		expect(
			skillVersionState({
				draft: 3,
				live: null,
				latest: 3,
				pinned: false,
				liveHasSameContent: false,
				scope: 'project',
			}),
		).toEqual({
			kind: 'notLive',
			draft: 3,
			live: null,
			latest: 3,
		});
	});

	it('compares the live version with the draft when the published agent runs an older version', () => {
		expect(
			skillVersionState({
				draft: 5,
				live: 4,
				latest: 5,
				pinned: false,
				liveHasSameContent: false,
				scope: 'project',
			}),
		).toEqual({
			kind: 'liveBehind',
			draft: 5,
			live: 4,
			latest: 5,
			changes: { from: 4, to: 5 },
		});
	});

	it('is latest when the published agent runs another version with the same content', () => {
		expect(
			skillVersionState({
				draft: 10,
				live: 7,
				latest: 10,
				pinned: false,
				liveHasSameContent: true,
				scope: 'project',
			}),
		).toEqual({
			kind: 'latest',
			draft: 10,
			live: 7,
			latest: 10,
		});
	});

	it('keeps a pin when the published agent runs the same content', () => {
		expect(
			skillVersionState({
				draft: 10,
				live: 7,
				latest: 12,
				pinned: true,
				liveHasSameContent: true,
				scope: 'project',
			}).kind,
		).toBe('pinned');
	});

	it('compares the pinned version with the latest one when a newer version exists', () => {
		expect(
			skillVersionState({
				draft: 3,
				live: 3,
				latest: 5,
				pinned: true,
				liveHasSameContent: false,
				scope: 'project',
			}),
		).toEqual({
			kind: 'pinned',
			draft: 3,
			live: 3,
			latest: 5,
			changes: { from: 3, to: 5 },
		});
	});

	it('uses the live state for a pin on the latest version', () => {
		expect(
			skillVersionState({
				draft: 2,
				live: null,
				latest: 2,
				pinned: true,
				liveHasSameContent: false,
				scope: 'project',
			}),
		).toEqual({
			kind: 'notLive',
			draft: 2,
			live: null,
			latest: 2,
		});
		expect(
			skillVersionState({
				draft: 2,
				live: 1,
				latest: 2,
				pinned: true,
				liveHasSameContent: false,
				scope: 'project',
			}),
		).toMatchObject({ kind: 'liveBehind', changes: { from: 1, to: 2 } });
	});

	it('keeps a pin behind the latest version over the live state', () => {
		expect(
			skillVersionState({
				draft: 2,
				live: null,
				latest: 3,
				pinned: true,
				liveHasSameContent: false,
				scope: 'project',
			}),
		).toMatchObject({ kind: 'pinned', changes: { from: 2, to: 3 } });
	});
});

describe('isPinnedBehindLatest', () => {
	it('is true only for a pin on an older version', () => {
		expect(
			isPinnedBehindLatest({
				draft: 3,
				live: 3,
				latest: 5,
				pinned: true,
				liveHasSameContent: false,
				scope: 'project',
			}),
		).toBe(true);
		expect(
			isPinnedBehindLatest({
				draft: 5,
				live: 5,
				latest: 5,
				pinned: true,
				liveHasSameContent: false,
				scope: 'project',
			}),
		).toBe(false);
		expect(
			isPinnedBehindLatest({
				draft: 5,
				live: 4,
				latest: 5,
				pinned: false,
				liveHasSameContent: false,
				scope: 'project',
			}),
		).toBe(false);
		expect(isPinnedBehindLatest(undefined)).toBe(false);
	});
});

describe('draftMatchesPublished', () => {
	const info = {
		draft: 3,
		live: 3,
		latest: 3,
		pinned: false,
		liveHasSameContent: false,
		scope: 'project',
	} as const;

	it('is true when the published agent runs the draft version or the same content', () => {
		expect(draftMatchesPublished(info)).toBe(true);
		expect(draftMatchesPublished({ ...info, live: 2, liveHasSameContent: true })).toBe(true);
	});

	it('is false when the published agent runs other content or does not use the skill', () => {
		expect(draftMatchesPublished({ ...info, live: 2 })).toBe(false);
		expect(draftMatchesPublished({ ...info, live: null })).toBe(false);
	});
});
