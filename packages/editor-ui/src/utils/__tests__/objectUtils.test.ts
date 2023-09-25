import { valuesToString } from '@/utils/objectUtils';

describe('objectUtils', () => {
	describe('valuesToString', () => {
		it('should convert all values to string', () => {
			const input = {
				a: 1,
				b: '2',
				c: true,
				d: [1, 2, 3],
				e: null,
				f: undefined,
			};
			const result = valuesToString(input);
			expect(result).toEqual({
				a: '1',
				b: '2',
				c: 'true',
				d: '1,2,3',
				e: 'null',
				f: '',
			});
		});
	});
});
