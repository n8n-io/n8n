import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
	CODING_PREVIEW_COPY,
	codingPreviewState,
	type CodingPreviewRequest,
} from '../coding-preview-state';

const apps = [undefined, 'stopped', 'starting', 'running', 'error'] as const;
const requests: CodingPreviewRequest[] = ['idle', 'loading', 'unavailable', 'failed'];

describe('codingPreviewState', () => {
	it.each([
		[undefined, '', 'idle', 'stopped'],
		['stopped', '', 'idle', 'stopped'],
		// A stopped app wins over an old request result.
		['stopped', '', 'unavailable', 'stopped'],
		['error', '/sandbox-preview/a/', 'idle', 'error'],
		['starting', '', 'loading', 'starting'],
		['starting', '/sandbox-preview/a/', 'idle', 'starting'],
		['starting', '', 'unavailable', 'unavailable'],
		['running', '', 'idle', 'loading'],
		['running', '', 'loading', 'loading'],
		['running', '', 'unavailable', 'unavailable'],
		['running', '', 'failed', 'failed'],
		['running', '/sandbox-preview/a/', 'idle', 'ready'],
	] as const)('shows app %s with url %j and request %s as %s', (app, url, request, state) => {
		expect(codingPreviewState({ app, url, request })).toBe(state);
	});

	it('shows the frame only for a running app with a URL (property)', () => {
		fc.assert(
			fc.property(
				fc.constantFrom(...apps),
				fc.string({ maxLength: 20 }),
				fc.constantFrom(...requests),
				(app, url, request) => {
					const state = codingPreviewState({ app, url, request });
					const ready =
						app === 'running' && url !== '' && request !== 'unavailable' && request !== 'failed';
					expect(state === 'ready').toBe(ready);
				},
			),
		);
	});

	it('never says that the app runs while it offers to run it (property)', () => {
		fc.assert(
			fc.property(
				fc.constantFrom(...apps),
				fc.string({ maxLength: 20 }),
				fc.constantFrom(...requests),
				(app, url, request) => {
					const state = codingPreviewState({ app, url, request });
					const offersRun = state === 'stopped' || state === 'error';
					const appActive = app === 'starting' || app === 'running';
					expect(offersRun).toBe(!appActive);
					if (state !== 'ready') expect(CODING_PREVIEW_COPY[state].title).toBeTruthy();
				},
			),
		);
	});
});

describe('CODING_PREVIEW_COPY', () => {
	it('gives the unavailable state a plain heading and a hint, and no run copy', () => {
		expect(CODING_PREVIEW_COPY.unavailable).toEqual({
			title: 'agents.coding.app.unavailable',
			hint: 'agents.coding.app.unavailableHint',
		});
		expect(CODING_PREVIEW_COPY.starting.hint).not.toBe('agents.coding.app.hint');
		expect(CODING_PREVIEW_COPY.loading.hint).toBeUndefined();
	});
});
