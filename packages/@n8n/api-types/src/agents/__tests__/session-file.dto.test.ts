import { describe, expect, it } from 'vitest';

import {
	MAX_SESSION_UPLOAD_WORKING_SET_BYTES,
	selectWorkingSet,
	toSessionFileDto,
} from '../session-file.dto';

const MB = 1024 * 1024;

function candidate(partial: {
	id: string;
	fileName?: string;
	sizeBytes: number;
	createdAt: string;
	messageId?: string | null;
}) {
	return {
		fileName: 'data.csv',
		...partial,
	};
}

describe('toSessionFileDto', () => {
	it('defaults onDisk to false', () => {
		expect(
			toSessionFileDto({
				id: 'a1',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 4,
				createdAt: new Date('2026-01-01T00:00:00.000Z'),
			}).onDisk,
		).toBe(false);
	});
});

describe('selectWorkingSet', () => {
	it('includes newest files that fit under the cap', () => {
		const result = selectWorkingSet(
			[
				candidate({
					id: 'older',
					sizeBytes: 10 * MB,
					createdAt: '2026-01-01T00:00:00.000Z',
					messageId: 'msg-1',
				}),
				candidate({
					id: 'newer',
					sizeBytes: 10 * MB,
					createdAt: '2026-01-02T00:00:00.000Z',
					messageId: 'msg-2',
				}),
			],
			'sess-1',
		);

		expect(result.onDisk.map((entry) => entry.id)).toEqual(['newer', 'older']);
		expect(result.skipped).toEqual([]);
		expect(result.onDisk[0]?.path).toBe('uploads/sess-1/msg-2/data.csv');
	});

	it('skips a file that would exceed the cap and keeps going', () => {
		const result = selectWorkingSet(
			[
				candidate({
					id: 'big',
					sizeBytes: 180 * MB,
					createdAt: '2026-01-02T00:00:00.000Z',
					messageId: 'msg-new',
				}),
				candidate({
					id: 'small',
					sizeBytes: 30 * MB,
					createdAt: '2026-01-01T00:00:00.000Z',
					messageId: 'msg-old',
				}),
			],
			'sess-1',
		);

		expect(result.onDisk.map((entry) => entry.id)).toEqual(['big']);
		expect(result.skipped).toEqual([
			{
				id: 'small',
				messageId: 'msg-old',
				fileName: 'data.csv',
				sizeBytes: 30 * MB,
				reason: 'working_set_cap',
			},
		]);
	});

	it('skips a newest file over the cap and still includes an older CSV that fits', () => {
		const result = selectWorkingSet(
			[
				candidate({
					id: 'huge',
					sizeBytes: 250 * MB,
					createdAt: '2026-01-02T00:00:00.000Z',
					messageId: 'msg-huge',
				}),
				candidate({
					id: 'csv',
					sizeBytes: 10 * MB,
					createdAt: '2026-01-01T00:00:00.000Z',
					messageId: 'msg-csv',
				}),
			],
			'sess-1',
		);

		expect(result.onDisk.map((entry) => entry.id)).toEqual(['csv']);
		expect(result.skipped[0]).toMatchObject({ id: 'huge', reason: 'working_set_cap' });
		expect(result.onDisk[0]?.sizeBytes).toBeLessThanOrEqual(MAX_SESSION_UPLOAD_WORKING_SET_BYTES);
	});

	it('uses the attachment id when messageId is missing', () => {
		const result = selectWorkingSet(
			[
				candidate({
					id: 'att-1',
					sizeBytes: 10,
					createdAt: '2026-01-01T00:00:00.000Z',
				}),
			],
			'sess-1',
		);

		expect(result.onDisk[0]?.path).toBe('uploads/sess-1/att-1/data.csv');
		expect(result.onDisk[0]?.messageId).toBe('att-1');
	});

	it('prefixes the basename when two files would share a path', () => {
		const result = selectWorkingSet(
			[
				candidate({
					id: 'a',
					sizeBytes: 10,
					createdAt: '2026-01-02T00:00:00.000Z',
					messageId: 'same',
				}),
				candidate({
					id: 'b',
					sizeBytes: 10,
					createdAt: '2026-01-01T00:00:00.000Z',
					messageId: 'same',
				}),
			],
			'sess-1',
		);

		expect(result.onDisk.map((entry) => entry.path)).toEqual([
			'uploads/sess-1/same/data.csv',
			'uploads/sess-1/same/b-data.csv',
		]);
	});

	it('skips empty or parent basename as unavailable', () => {
		const result = selectWorkingSet(
			[
				candidate({
					id: 'dots',
					fileName: '..',
					sizeBytes: 10,
					createdAt: '2026-01-01T00:00:00.000Z',
					messageId: 'msg',
				}),
			],
			'sess-1',
		);

		expect(result.onDisk).toEqual([]);
		expect(result.skipped[0]?.reason).toBe('unavailable');
	});
});
