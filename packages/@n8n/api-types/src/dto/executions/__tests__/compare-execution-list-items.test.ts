import { compareExecutionListItems } from '../compare-execution-list-items';

const item = (
	id: string,
	startedAt: Date | string | null,
	createdAt: Date | string = '2024-01-01T00:00:00.000Z',
) => ({ id, startedAt, createdAt });

describe('compareExecutionListItems', () => {
	describe('time key', () => {
		it('puts the newer startedAt first', () => {
			const older = item('1', '2024-05-01T10:00:00.000Z');
			const newer = item('2', '2024-05-01T11:00:00.000Z');

			expect(compareExecutionListItems(newer, older)).toBeLessThan(0);
			expect(compareExecutionListItems(older, newer)).toBeGreaterThan(0);
		});

		it('falls back to createdAt when startedAt is null', () => {
			const notStarted = item('1', null, '2024-05-01T11:00:00.000Z');
			const started = item('2', '2024-05-01T10:00:00.000Z');

			expect(compareExecutionListItems(notStarted, started)).toBeLessThan(0);
		});

		it('accepts Date objects', () => {
			const older = item('1', new Date('2024-05-01T10:00:00.000Z'));
			const newer = item('2', new Date('2024-05-01T11:00:00.000Z'));

			expect(compareExecutionListItems(newer, older)).toBeLessThan(0);
		});

		it('treats an ISO string and an equal Date as a tie', () => {
			const a = item('2', '2024-05-01T10:00:00.000Z');
			const b = item('1', new Date('2024-05-01T10:00:00.000Z'));

			expect(compareExecutionListItems(a, b)).toBeLessThan(0);
		});
	});

	describe('id tie-break', () => {
		const time = '2024-05-01T10:00:00.000Z';

		it('puts the higher numeric id first', () => {
			expect(compareExecutionListItems(item('10', time), item('9', time))).toBeLessThan(0);
			expect(compareExecutionListItems(item('9', time), item('10', time))).toBeGreaterThan(0);
		});

		it('puts a v2 id before a numeric id', () => {
			const v2 = item('01917b3e-0000-7000-8000-000000000000', time);
			const numeric = item('999', time);

			expect(compareExecutionListItems(v2, numeric)).toBeLessThan(0);
			expect(compareExecutionListItems(numeric, v2)).toBeGreaterThan(0);
		});

		it('puts the higher v2 id first', () => {
			const lower = item('01917b3e-0000-7000-8000-000000000001', time);
			const higher = item('01917b3e-0000-7000-8000-000000000002', time);

			expect(compareExecutionListItems(higher, lower)).toBeLessThan(0);
			expect(compareExecutionListItems(lower, higher)).toBeGreaterThan(0);
		});

		it('returns 0 for the same id and time', () => {
			expect(compareExecutionListItems(item('7', time), item('7', time))).toBe(0);
		});
	});

	it('sorts a mixed list newest first', () => {
		const items = [
			item('9', '2024-05-01T10:00:00.000Z'),
			item('11', '2024-05-01T12:00:00.000Z'),
			item('aaa-1', '2024-05-01T10:00:00.000Z'),
			item('10', '2024-05-01T10:00:00.000Z'),
			item('bbb-1', null, '2024-05-01T13:00:00.000Z'),
		];

		expect([...items].sort(compareExecutionListItems).map((i) => i.id)).toEqual([
			'bbb-1',
			'11',
			'aaa-1',
			'10',
			'9',
		]);
	});
});
