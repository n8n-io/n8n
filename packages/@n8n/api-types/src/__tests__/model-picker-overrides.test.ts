import { getModelDisplayName, pinPrioritizedModels } from '../model-picker-overrides';

describe('getModelDisplayName', () => {
	it('returns the product name of a named model', () => {
		expect(getModelDisplayName('google', 'gemini-2.5-pro')).toBe('Gemini 2.5 Pro');
		expect(getModelDisplayName('google', 'models/gemini-2.5-pro')).toBe('Gemini 2.5 Pro');
	});

	it('returns undefined for other models and providers', () => {
		expect(getModelDisplayName('google', 'models/gemini-0-unknown')).toBeUndefined();
		expect(getModelDisplayName('openai', 'gemini-2.5-pro')).toBeUndefined();
	});

	it('ignores inherited object properties', () => {
		expect(getModelDisplayName('google', 'models/toString')).toBeUndefined();
		expect(getModelDisplayName('constructor', 'gemini-2.5-pro')).toBeUndefined();
	});
});

describe('pinPrioritizedModels', () => {
	it('moves models with a priority to the front, highest first, and keeps the order of the rest', () => {
		const models = [
			{ id: 'b' },
			{ id: 'low', priority: 1 },
			{ id: 'a' },
			{ id: 'high', priority: 10 },
		];

		expect(pinPrioritizedModels(models, (model) => model.priority).map((m) => m.id)).toEqual([
			'high',
			'low',
			'b',
			'a',
		]);
	});

	it('ignores priorities that are not finite numbers', () => {
		const models = [{ id: 'a', priority: '5' }, { id: 'b', priority: Number.NaN }, { id: 'c' }];

		expect(pinPrioritizedModels(models, (model) => model.priority)).toEqual(models);
	});
});
