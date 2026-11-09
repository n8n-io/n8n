import { Adalo } from './Adalo.node';

function collectUrls(value: unknown): string[] {
	if (Array.isArray(value)) return value.flatMap(collectUrls);
	if (value === null || typeof value !== 'object') return [];

	return Object.entries(value).flatMap(([key, child]) => {
		if (key === 'url' && typeof child === 'string') return [child];
		return collectUrls(child);
	});
}

describe('Adalo node', () => {
	it('encodes every dynamic request URL path segment', () => {
		const dynamicUrls = collectUrls(new Adalo().description.properties).filter((url) =>
			url.includes('$parameter'),
		);
		const dynamicExpressions = dynamicUrls.flatMap((url) =>
			[...url.matchAll(/{{\s*(.*?)\s*}}/g)]
				.map((match) => match[1])
				.filter((expression) => expression.includes('$parameter')),
		);

		expect(dynamicUrls).toHaveLength(5);
		expect(dynamicExpressions).toHaveLength(8);
		for (const expression of dynamicExpressions) {
			expect(expression).toMatch(/^toPathSegment\(.+\)$/);
		}
	});
});
