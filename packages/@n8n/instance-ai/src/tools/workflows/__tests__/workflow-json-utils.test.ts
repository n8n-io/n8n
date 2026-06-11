import { findEmptyResourceLocatorFields } from '../workflow-json-utils';

describe('findEmptyResourceLocatorFields', () => {
	it('returns paths for resource locators with empty value', () => {
		const fields = findEmptyResourceLocatorFields({
			documentId: {
				__rl: true,
				mode: 'list',
				value: '',
				cachedResultName: 'Bookings',
			},
		});

		expect(fields).toEqual(['documentId']);
	});

	it('returns nested paths', () => {
		const fields = findEmptyResourceLocatorFields({
			columns: {
				value: {
					'AI Confirmation': '={{ $json.output }}',
				},
			},
			documentId: {
				__rl: true,
				mode: 'id',
				value: '',
			},
		});

		expect(fields).toEqual(['documentId']);
	});

	it('returns empty array when values are set or non-resource-locator', () => {
		expect(
			findEmptyResourceLocatorFields({
				documentId: {
					__rl: true,
					mode: 'id',
					value: 'abc123',
				},
				sheetName: 'Sheet1',
			}),
		).toEqual([]);
	});
});
