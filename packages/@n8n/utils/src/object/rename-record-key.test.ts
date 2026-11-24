import { renameRecordKey } from './rename-record-key';

describe('renameRecordKey', () => {
	it('should move the value to the new key and keep the other keys', () => {
		const value = { id: 1 };
		const other = { id: 2 };
		const record = { old: value, other };

		const result = renameRecordKey(record, 'old', 'new');

		expect(result).not.toBe(record);
		expect(result).toEqual({ other, new: value });
		expect(result.new).toBe(value);
		expect(result.other).toBe(other);
		expect(record).toEqual({ old: value, other });
	});

	it('should return the same record when the old key is missing', () => {
		const record = { other: { id: 2 } };

		expect(renameRecordKey(record, 'old', 'new')).toBe(record);
	});

	it.each([0, '', false, null, undefined])('should move a falsy value %s', (value) => {
		const record: Record<string, unknown> = { old: value, other: 1 };

		const result = renameRecordKey(record, 'old', 'new');

		expect(result).toEqual({ other: 1, new: value });
		expect(Object.hasOwn(result, 'old')).toBe(false);
		expect(Object.hasOwn(result, 'new')).toBe(true);
	});

	it('should not treat an inherited property as an entry', () => {
		const record: Record<string, unknown> = { other: 1 };

		const result = renameRecordKey(record, 'toString', 'renamed');

		expect(result).toBe(record);
		expect(Object.hasOwn(result, 'renamed')).toBe(false);
	});
});
