import { describe, expect, it } from 'vitest';

import { readResponse } from './envelope';

describe('readResponse', () => {
	it('takes a body without ok as the state partial itself', () => {
		expect(readResponse({ rows: [1, 2] })).toEqual({ ok: true, state: { rows: [1, 2] } });
	});

	it('takes a body with a state key but no ok as the state partial too', () => {
		expect(readResponse({ state: { rows: [] } })).toEqual({
			ok: true,
			state: { state: { rows: [] } },
		});
	});

	it('unwraps the single item a Respond to Webhook node hands back as an array', () => {
		expect(readResponse([{ ok: true, state: { rows: [] } }])).toMatchObject({
			ok: true,
			state: { rows: [] },
		});
	});

	it('reads an envelope that succeeded', () => {
		expect(readResponse({ ok: true, state: { saved: true } })).toEqual({
			ok: true,
			state: { saved: true },
			toast: undefined,
			error: undefined,
		});
	});

	it('reads the toast an envelope carries', () => {
		expect(readResponse({ ok: true, toast: { type: 'success', message: 'Saved' } })).toMatchObject({
			toast: { type: 'success', message: 'Saved' },
		});
	});

	it('falls back to an info toast for a type it does not know', () => {
		expect(readResponse({ ok: true, toast: { type: 'shouty', message: 'Saved' } })).toMatchObject({
			toast: { type: 'info', message: 'Saved' },
		});
	});

	it('ignores a toast with no message', () => {
		expect(readResponse({ ok: true, toast: { type: 'success' } }).toast).toBeUndefined();
	});

	it('gives a failure with no toast one made from its error message', () => {
		expect(readResponse({ ok: false, error: { code: 'E_NOPE', message: 'Order is gone' } })).toEqual(
			{
				ok: false,
				state: undefined,
				toast: { type: 'error', message: 'Order is gone' },
				error: { code: 'E_NOPE', message: 'Order is gone' },
			},
		);
	});

	it('gives a failure with no error at all a message of its own', () => {
		expect(readResponse({ ok: false })).toMatchObject({
			ok: false,
			toast: { type: 'error', message: 'Action failed' },
			error: { message: 'Action failed' },
		});
	});

	it('lets an explicit toast win over the one the error would have given', () => {
		expect(
			readResponse({
				ok: false,
				error: { message: 'Order is gone' },
				toast: { type: 'info', message: 'Nothing to save' },
			}),
		).toMatchObject({ toast: { type: 'info', message: 'Nothing to save' } });
	});

	it('keeps the state partial a failure sent, so a workflow can still correct the view', () => {
		expect(readResponse({ ok: false, state: { rows: [] } }).state).toEqual({ rows: [] });
	});
});
