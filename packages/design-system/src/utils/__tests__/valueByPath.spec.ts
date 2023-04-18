import { getValueByPath } from '@/utils';

describe('getValueByPath()', () => {
	const object = {
		id: '1',
		name: 'Richard Hendricks',
		address: {
			city: 'Palo Alto',
			state: 'California',
			country: 'United States',
		},
	};

	it('should return direct field from object', () => {
		const path = 'name';

		expect(getValueByPath(object, path)).toEqual(object.name);
	});

	it('should return nested field from object', () => {
		const path = 'address.country';

		expect(getValueByPath(object, path)).toEqual(object.address.country);
	});

	it('should return undefined if direct field does not exist', () => {
		const path = 'other';

		expect(getValueByPath(object, path)).toEqual(undefined);
	});

	it('should return undefined if nested field does not exist', () => {
		const path = 'address.other';

		expect(getValueByPath(object, path)).toEqual(undefined);
	});

	it('should return undefined if path does not exist', () => {
		const path = 'other.other';

		expect(getValueByPath(object, path)).toEqual(undefined);
	});
});
