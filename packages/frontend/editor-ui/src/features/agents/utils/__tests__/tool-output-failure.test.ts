import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { isFailedToolOutput, toolOutputErrorMessage } from '../tool-output-failure';

const FAILURE_MARKERS: Array<Record<string, unknown>> = [
	{ error: 'Not found' },
	{ error: { message: 'Not found' } },
	{ status: 'error' },
	{ status: 'failed' },
	{ success: false },
	{ ok: false },
	{ isError: true },
];

/** Keys that never mark a failure, so a record with only these keys did not fail. */
const neutralRecord = fc.dictionary(
	fc.constantFrom('content', 'result', 'path', 'exitCode', 'stdout'),
	fc.oneof(fc.string(), fc.integer(), fc.boolean()),
);

describe('toolOutputErrorMessage', () => {
	it.each([
		[{ error: 'Not found' }, 'Not found'],
		[{ error: { message: 'Disk full' } }, 'Disk full'],
		[{ error: '' }, undefined],
		[{ error: { message: '' } }, undefined],
		[{ error: { code: 1 } }, undefined],
		[{ success: false }, undefined],
		['Not found', undefined],
		[undefined, undefined],
	])('reads %j as %j', (output, message) => {
		expect(toolOutputErrorMessage(output)).toBe(message);
	});
});

describe('isFailedToolOutput', () => {
	it.each(FAILURE_MARKERS)('treats %j as a failure', (output) => {
		expect(isFailedToolOutput(output)).toBe(true);
	});

	it.each([
		[{ success: true }],
		[{ ok: true, status: 'done' }],
		[{ isError: false, error: '' }],
		[{ content: 'text' }],
		['error'],
		[[{ success: false }]],
		[null],
		[undefined],
	])('does not treat %j as a failure', (output) => {
		expect(isFailedToolOutput(output)).toBe(false);
	});

	it('finds a failure marker in any other result (property)', () => {
		fc.assert(
			fc.property(neutralRecord, fc.constantFrom(...FAILURE_MARKERS), (record, marker) => {
				expect(isFailedToolOutput(record)).toBe(false);
				expect(isFailedToolOutput({ ...record, ...marker })).toBe(true);
			}),
		);
	});
});
