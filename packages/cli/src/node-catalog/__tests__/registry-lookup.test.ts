import {
	findRegistryMatches,
	matchesRegistryQuery,
	rankRegistryMatches,
	registryQueryTerms,
} from '../registry-lookup';
import type { RegistryCandidate } from '../registry-lookup';

const entry = (
	name: string,
	displayName: string,
	extra: Partial<RegistryCandidate> = {},
): RegistryCandidate => ({ name, displayName, ...extra });

// Real registry entries, so these cases pin behaviour against names that
// actually exist rather than invented ones.
const FIRECRAWL = entry('@mendable/n8n-nodes-firecrawl.firecrawl', 'Firecrawl', {
	numberOfDownloads: 2520,
});
const BRAVE = entry('@brave/n8n-nodes-brave-search.braveSearch', 'Brave Search', {
	numberOfDownloads: 130641,
});
const TAVILY = entry('@tavily/n8n-nodes-tavily.tavily', 'Tavily', { numberOfDownloads: 61266 });
const APIFY = entry('@apify/n8n-nodes-apify.apify', 'Apify', { numberOfDownloads: 18774 });
const APIFY_TRIGGER = entry('@apify/n8n-nodes-apify.apifyTrigger', 'Apify Trigger', {
	numberOfDownloads: 18774,
});
const OPENINBOX = entry('n8n-nodes-openinbox.openInbox', 'OpenInbox');
const SEATALK = entry('n8n-nodes-seatalk.seaTalk', 'SeaTalk');
const BLACKBEE = entry('n8n-nodes-blackbee.blackbee', 'Blackbee');
const SCRAPEOPS = entry('@scrapeops/n8n-nodes-scrapeops.ScrapeOps', 'ScrapeOps');

const ALL = [
	FIRECRAWL,
	BRAVE,
	TAVILY,
	APIFY,
	APIFY_TRIGGER,
	OPENINBOX,
	SEATALK,
	BLACKBEE,
	SCRAPEOPS,
];

describe('registryQueryTerms', () => {
	test('lowercases and splits on punctuation', () => {
		expect(registryQueryTerms('Brave Search')).toEqual(['brave', 'search']);
	});

	test('does not split camelCase, so a product name stays one term', () => {
		// Splitting would search for "open" and match OpenInbox, Open Banking, ...
		expect(registryQueryTerms('OpenAI')).toEqual(['openai']);
	});

	test('drops terms too short to be distinctive', () => {
		expect(registryQueryTerms('if')).toEqual([]);
		expect(registryQueryTerms('set')).toEqual(['set']);
	});

	test('drops words that appear in most package names', () => {
		expect(registryQueryTerms('n8n nodes for the slack api')).toEqual(['slack']);
	});

	test('de-duplicates repeated terms', () => {
		expect(registryQueryTerms('brave brave')).toEqual(['brave']);
	});
});

describe('matchesRegistryQuery', () => {
	test('matches when every term starts a word of the name', () => {
		expect(matchesRegistryQuery(BRAVE, ['brave', 'search'])).toBe(true);
	});

	test('matches a camelCase name word by word', () => {
		expect(matchesRegistryQuery(BRAVE, ['search'])).toBe(true);
	});

	test('does not match mid-word', () => {
		// "box" occurs inside "openinbox" but does not start any of its words.
		expect(matchesRegistryQuery(OPENINBOX, ['box'])).toBe(false);
	});

	test('a multi-word query still matches a run-together name', () => {
		expect(matchesRegistryQuery(FIRECRAWL, ['fire', 'crawl'])).toBe(true);
	});

	test('the run-together relaxation does not apply to a single word', () => {
		// Otherwise it degrades to mid-word matching again.
		expect(matchesRegistryQuery(SEATALK, ['eat'])).toBe(false);
	});

	test('requires every term, not just one', () => {
		expect(matchesRegistryQuery(BRAVE, ['brave', 'sheets'])).toBe(false);
	});

	test('ignores the description unless asked', () => {
		expect(matchesRegistryQuery(SCRAPEOPS, ['crawl'])).toBe(false);
	});

	test('an empty term list matches nothing', () => {
		expect(matchesRegistryQuery(FIRECRAWL, [])).toBe(false);
	});
});

describe('rankRegistryMatches', () => {
	test('an exact display-name match outranks a more downloaded one', () => {
		const ranked = rankRegistryMatches('apify', [BRAVE, APIFY]);

		expect(ranked[0]).toBe(APIFY);
	});

	test('falls back to adoption when neither matches the name exactly', () => {
		const ranked = rankRegistryMatches('trigger', [FIRECRAWL, APIFY_TRIGGER]);

		expect(ranked[0]).toBe(APIFY_TRIGGER);
	});
});

describe('findRegistryMatches', () => {
	test.each([
		['firecrawl', FIRECRAWL.name],
		['brave', BRAVE.name],
		['tavily', TAVILY.name],
		['apify', APIFY.name],
		['brave search', BRAVE.name],
		['fire crawl', FIRECRAWL.name],
	])('%s resolves to the right node', (query, expected) => {
		expect(findRegistryMatches(query, ALL)[0]?.name).toBe(expected);
	});

	test.each([['slack'], ['send email'], ['http request'], ['if'], ['postgres']])(
		'%s returns nothing rather than an unrelated package',
		(query) => {
			expect(findRegistryMatches(query, ALL)).toEqual([]);
		},
	);

	test('returns every node of a matching package', () => {
		expect(findRegistryMatches('apify', ALL).map((m) => m.name)).toEqual([
			APIFY.name,
			APIFY_TRIGGER.name,
		]);
	});

	test('caps how many nodes one query returns', () => {
		const many = Array.from({ length: 6 }, (_, i) =>
			entry(`n8n-nodes-acme-${i}.acme${i}`, `Acme ${i}`, { numberOfDownloads: i }),
		);

		expect(findRegistryMatches('acme', many)).toHaveLength(3);
	});
});
