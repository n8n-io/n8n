import { describe, expect, it } from 'vitest';

import { readResponse } from './envelope';

describe('readResponse', () => {
	it('hands back a body that says nothing about the outcome, as it arrived', () => {
		expect(readResponse({ rows: [1, 2] })).toEqual({
			ok: true,
			body: { rows: [1, 2] },
			toast: undefined,
			error: undefined,
		});
	});

	it('leaves an array of rows an array', () => {
		expect(readResponse([{ id: 1 }, { id: 2 }]).body).toEqual([{ id: 1 }, { id: 2 }]);
	});

	it('reads the toast a body carries', () => {
		expect(readResponse({ toast: { type: 'success', message: 'Saved' } })).toMatchObject({
			toast: { type: 'success', message: 'Saved' },
		});
	});

	it('falls back to an info toast for a type it does not know', () => {
		expect(readResponse({ toast: { type: 'shouty', message: 'Saved' } })).toMatchObject({
			toast: { type: 'info', message: 'Saved' },
		});
	});

	it('ignores a toast with no message', () => {
		expect(readResponse({ toast: { type: 'success' } }).toast).toBeUndefined();
	});

	it('reads a refusal and the error it explains itself with', () => {
		expect(
			readResponse({ ok: false, error: { code: 'E_NOPE', message: 'Order is gone' } }),
		).toEqual({
			ok: false,
			body: { ok: false, error: { code: 'E_NOPE', message: 'Order is gone' } },
			toast: undefined,
			error: { code: 'E_NOPE', message: 'Order is gone' },
		});
	});

	it('gives a refusal with no error at all a message of its own', () => {
		expect(readResponse({ ok: false })).toMatchObject({
			ok: false,
			error: { message: 'Action failed' },
		});
	});

	it("reads n8n's own failure shapes", () => {
		expect(readResponse({ error: 'Bad Request' }).error).toEqual({ message: 'Bad Request' });
		expect(readResponse({ message: 'Error in workflow' }).error).toEqual({
			message: 'Error in workflow',
		});
	});

	it('treats only an explicit false as a refusal', () => {
		expect(readResponse({ ok: 'no' }).ok).toBe(true);
		expect(readResponse({ ok: false }).ok).toBe(false);
	});
});
