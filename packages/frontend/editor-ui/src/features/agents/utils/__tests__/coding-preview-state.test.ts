import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { useI18n } from '@n8n/i18n';

import {
	CODING_PREVIEW_COPY,
	codingPreviewCopy,
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
		// Nothing loads, so the panel offers to show the preview.
		['running', '', 'idle', 'running'],
		['running', '', 'loading', 'loading'],
		['running', '', 'unavailable', 'unavailable'],
		['running', '', 'failed', 'failed'],
		['running', '/sandbox-preview/a/', 'idle', 'ready'],
	] as const)('shows app %s with url %j and request %s as %s', (app, url, request, state) => {
		expect(codingPreviewState({ app, url, request, canExecute: true })).toBe(state);
	});

	it.each([
		['running', '', 'idle', 'noAccess'],
		['starting', '', 'idle', 'noAccess'],
		['stopped', '', 'idle', 'stopped'],
		['error', '', 'idle', 'error'],
		// A request or a URL from before keeps its own state.
		['running', '', 'loading', 'loading'],
		['running', '', 'failed', 'failed'],
		['running', '/sandbox-preview/a/', 'idle', 'ready'],
	] as const)(
		'shows app %s with url %j and request %s as %s to a user who cannot run the agent',
		(app, url, request, state) => {
			expect(codingPreviewState({ app, url, request, canExecute: false })).toBe(state);
		},
	);

	it('shows the frame only for a running app with a URL (property)', () => {
		fc.assert(
			fc.property(
				fc.constantFrom(...apps),
				fc.string({ maxLength: 20 }),
				fc.constantFrom(...requests),
				fc.boolean(),
				(app, url, request, canExecute) => {
					const state = codingPreviewState({ app, url, request, canExecute });
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
				fc.boolean(),
				(app, url, request, canExecute) => {
					const state = codingPreviewState({ app, url, request, canExecute });
					const offersRun = state === 'stopped' || state === 'error';
					const appActive = app === 'starting' || app === 'running';
					expect(offersRun).toBe(!appActive);
					if (state !== 'ready') expect(CODING_PREVIEW_COPY[state].title).toBeTruthy();
				},
			),
		);
	});

	it('says that it loads only while a request is open (property)', () => {
		fc.assert(
			fc.property(
				fc.constantFrom(...apps),
				fc.string({ maxLength: 20 }),
				fc.constantFrom(...requests),
				fc.boolean(),
				(app, url, request, canExecute) => {
					const state = codingPreviewState({ app, url, request, canExecute });
					if (state === 'loading') expect(request).toBe('loading');
					if (state === 'noAccess') expect(canExecute).toBe(false);
					if (state === 'running') expect([app, url, request]).toEqual(['running', '', 'idle']);
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

	it('names the missing permission instead of the app status for a user who cannot run it', () => {
		expect(CODING_PREVIEW_COPY.noAccess).toEqual({
			title: 'agents.coding.app.noAccess',
			hint: 'agents.coding.app.noAccessHint',
		});
		expect(CODING_PREVIEW_COPY.running).toEqual({ title: 'agents.coding.app.running' });
	});
});

describe('codingPreviewCopy', () => {
	const i18n = useI18n();

	it('offers to run a stopped app and names the session that holds the preview', () => {
		expect(codingPreviewCopy(i18n, 'stopped', 'Add dark mode')).toEqual({
			title: 'App stopped',
			hint: 'The preview is running for “Add dark mode”. Run this session to replace it.',
			offersRun: true,
		});
	});

	it('keeps the own hint of an active state, even when another session holds the preview', () => {
		expect(codingPreviewCopy(i18n, 'unavailable', 'Add dark mode')).toEqual({
			title: 'Preview is not available for this sandbox yet.',
			hint: 'The app still runs. You can follow its output in the app logs.',
			offersRun: false,
		});
		expect(codingPreviewCopy(i18n, 'loading')).toEqual({
			title: 'Opening the preview…',
			hint: undefined,
			offersRun: false,
		});
	});
});
