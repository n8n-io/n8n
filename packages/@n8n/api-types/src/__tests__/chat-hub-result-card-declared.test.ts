import { extractDeclaredResultCards } from '../chat-hub-result-card-declared';

const weather = {
	type: 'weather',
	title: 'Lisbon, Portugal',
	location: 'Lisbon, Portugal',
	temperature: 14,
	condition: 'Light rain',
	icon: 'rain',
	sources: [{ name: 'Open-Meteo', temperature: 14 }],
};

describe('extractDeclaredResultCards', () => {
	it('lifts cards out of a cards envelope and tags them as declared', () => {
		const cards = extractDeclaredResultCards([
			{ json: { type: 'cards', text: 'Lisbon: 14° and rain.', cards: [weather] } },
		]);
		expect(cards).toHaveLength(1);
		expect(cards[0]).toMatchObject({ type: 'weather', source: 'declared', unit: 'C' });
	});

	it('accepts a single card item, raw or wrapped in json, with lenient coercion', () => {
		const loose = { ...weather, temperature: '14°', icon: undefined };
		expect(extractDeclaredResultCards([loose])).toHaveLength(1);
		expect(extractDeclaredResultCards([{ json: loose }])[0]).toMatchObject({
			temperature: 14,
			icon: 'rain',
		});
	});

	it('ignores ordinary data, alias-only types and invalid cards', () => {
		expect(
			extractDeclaredResultCards([
				{ json: { id: 1, type: 'message', text: 'hello' } },
				{ json: { type: 'summary', pairs: [{ key: 'a', value: 'b' }] } },
				{ json: { type: 'weather', title: 'no temperature' } },
				'text',
				null,
			]),
		).toEqual([]);
	});

	it('caps the result at three cards across all items', () => {
		const cards = extractDeclaredResultCards([
			{ json: { type: 'cards', cards: [weather, weather] } },
			{ json: weather },
			{ json: weather },
		]);
		expect(cards).toHaveLength(3);
	});
});
