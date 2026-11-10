import { mapRecord } from './map-record';

describe('mapRecord', () => {
	it('should return a new record with the mapped values when a value changes', () => {
		const a = { id: 1 };
		const record = { a, b: { id: 2 } };

		const result = mapRecord(record, (value) => (value.id === 2 ? { id: 3 } : value));

		expect(result).not.toBe(record);
		expect(result).toEqual({ a: { id: 1 }, b: { id: 3 } });
		expect(result.a).toBe(a);
		expect(record).toEqual({ a: { id: 1 }, b: { id: 2 } });
	});

	it('should return the same record when no value changes', () => {
		const record = { a: { id: 1 }, b: { id: 2 } };

		expect(mapRecord(record, (value) => value)).toBe(record);
	});

	it('should return the same record when it is empty', () => {
		const record: Record<string, number> = {};

		expect(mapRecord(record, (value) => value + 1)).toBe(record);
	});
});
