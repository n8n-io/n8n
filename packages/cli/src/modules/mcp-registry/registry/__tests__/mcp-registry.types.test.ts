import { normalizeTags } from '../mcp-registry.types';

describe('normalizeTags', () => {
	it('returns undefined when tags is undefined', () => {
		expect(normalizeTags(undefined)).toBeUndefined();
	});

	it('returns the array as-is when tags is already a plain string[]', () => {
		const tags = ['productivity', 'docs'];
		expect(normalizeTags(tags)).toEqual(['productivity', 'docs']);
	});

	it('unwraps the Strapi { data: string[] } envelope', () => {
		expect(normalizeTags({ data: ['issue-tracking', 'project-management'] })).toEqual([
			'issue-tracking',
			'project-management',
		]);
	});

	it('returns undefined when the Strapi envelope has data: undefined', () => {
		expect(normalizeTags({ data: undefined })).toBeUndefined();
	});

	it('returns an empty array when the Strapi envelope has an empty data array', () => {
		expect(normalizeTags({ data: [] })).toEqual([]);
	});
});
