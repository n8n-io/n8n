import { inputDataToAssignments } from './assignmentCollection.utils';

const toNameValueType = (input: Parameters<typeof inputDataToAssignments>[0]) =>
	inputDataToAssignments(input).map(({ name, value, type }) => ({ name, value, type }));

describe('inputDataToAssignments', () => {
	it('should use dot access for plain keys, nested objects and arrays', () => {
		expect(toNameValueType({ id: 1, user: { email: 'a@b.c' }, tags: ['x'] })).toEqual([
			{ name: 'id', value: '={{ $json.id }}', type: 'number' },
			{ name: 'user.email', value: '={{ $json.user.email }}', type: 'string' },
			{ name: 'tags[0]', value: '={{ $json.tags[0] }}', type: 'string' },
		]);
	});

	it('should use bracket access for keys that are not valid identifiers', () => {
		expect(
			toNameValueType({
				'first name': 'Ann',
				'user-id': 7,
				address: { 'zip code': '12345' },
				"it's": true,
			}),
		).toEqual([
			{ name: 'first name', value: "={{ $json['first name'] }}", type: 'string' },
			{ name: 'user-id', value: "={{ $json['user-id'] }}", type: 'number' },
			{ name: 'address.zip code', value: "={{ $json.address['zip code'] }}", type: 'string' },
			{ name: "it's", value: "={{ $json['it\\'s'] }}", type: 'boolean' },
		]);
	});
});
