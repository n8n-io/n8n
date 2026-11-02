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
});
