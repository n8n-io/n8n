import { findMockQuirks, MOCK_QUIRKS, quirkMatches, type MockQuirk } from '../mock-quirks';

describe('quirkMatches', () => {
	const serviceWide: MockQuirk = {
		service: 'Acme',
		guidance: 'service-wide',
		rationale: 'test',
		addedAt: '2026-05-08',
	};

	const endpointSpecific: MockQuirk = {
		service: 'Acme',
		endpoint: 'POST /v1/widgets',
		guidance: 'endpoint-specific',
		rationale: 'test',
		addedAt: '2026-05-08',
	};

	it('returns false when service does not match', () => {
		expect(quirkMatches(serviceWide, 'Other', 'GET', '/anything')).toBe(false);
		expect(quirkMatches(endpointSpecific, 'Other', 'POST', '/v1/widgets')).toBe(false);
	});

	it('returns true for service-wide quirk on any endpoint of that service', () => {
		expect(quirkMatches(serviceWide, 'Acme', 'GET', '/v1/foo')).toBe(true);
		expect(quirkMatches(serviceWide, 'Acme', 'POST', '/v2/bar/baz')).toBe(true);
		expect(quirkMatches(serviceWide, 'Acme', 'DELETE', '/')).toBe(true);
	});

	it('returns true for endpoint-specific quirk on exact match', () => {
		expect(quirkMatches(endpointSpecific, 'Acme', 'POST', '/v1/widgets')).toBe(true);
	});

	it('returns false for endpoint-specific quirk on different endpoint', () => {
		expect(quirkMatches(endpointSpecific, 'Acme', 'POST', '/v1/other')).toBe(false);
		expect(quirkMatches(endpointSpecific, 'Acme', 'GET', '/v1/widgets')).toBe(false);
	});

	it('matches method case-insensitively', () => {
		expect(quirkMatches(endpointSpecific, 'Acme', 'post', '/v1/widgets')).toBe(true);
		expect(quirkMatches(endpointSpecific, 'Acme', 'Post', '/v1/widgets')).toBe(true);
	});
});

describe('findMockQuirks (real registry)', () => {
	it('returns the Notion guidance for any Notion request', () => {
		const guidance = findMockQuirks('Notion', 'POST', '/v1/pages');
		expect(guidance.length).toBeGreaterThan(0);
		expect(guidance[0]).toMatch(/full|FULL/);
	});

	it('returns the same guidance regardless of which Notion endpoint is hit', () => {
		const pageGuidance = findMockQuirks('Notion', 'POST', '/v1/pages');
		const dbGuidance = findMockQuirks('Notion', 'GET', '/v1/databases/abc');
		const blockGuidance = findMockQuirks('Notion', 'PATCH', '/v1/blocks/xyz');
		expect(pageGuidance).toEqual(dbGuidance);
		expect(pageGuidance).toEqual(blockGuidance);
	});

	it('returns empty array for services with no quirks registered', () => {
		expect(findMockQuirks('Slack', 'POST', '/chat.postMessage')).toEqual([]);
		expect(findMockQuirks('GitHub', 'GET', '/repos/owner/name/issues')).toEqual([]);
	});

	it('is case-sensitive on service name (extractServiceName produces capitalized form)', () => {
		expect(findMockQuirks('notion', 'POST', '/v1/pages')).toEqual([]);
		expect(findMockQuirks('NOTION', 'POST', '/v1/pages')).toEqual([]);
	});
});

describe('MOCK_QUIRKS registry shape', () => {
	it('every entry has the required fields', () => {
		for (const quirk of MOCK_QUIRKS) {
			expect(quirk.service).toMatch(/^[A-Z]/);
			expect(quirk.guidance.length).toBeGreaterThan(0);
			expect(quirk.rationale.length).toBeGreaterThan(0);
			expect(quirk.addedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			if (quirk.endpoint !== undefined) {
				expect(quirk.endpoint).toMatch(/^(GET|POST|PUT|PATCH|DELETE) \//);
			}
		}
	});
});
