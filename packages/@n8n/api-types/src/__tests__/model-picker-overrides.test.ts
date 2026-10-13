import { FEATURED_MODELS, getModelDisplayName, pinFeaturedModels } from '../model-picker-overrides';

describe('getModelDisplayName', () => {
	it('returns the product name of a named model', () => {
		expect(getModelDisplayName('google', 'gemini-2.5-pro')).toBe('Gemini 2.5 Pro');
		expect(getModelDisplayName('google', 'models/gemini-2.5-pro')).toBe('Gemini 2.5 Pro');
	});

	it('returns undefined for other models and providers', () => {
		expect(getModelDisplayName('google', 'models/gemini-0-unknown')).toBeUndefined();
		expect(getModelDisplayName('openai', 'gemini-2.5-pro')).toBeUndefined();
	});
});

describe('pinFeaturedModels', () => {
	beforeEach(() => {
		FEATURED_MODELS.google = ['gemini-featured'];
	});

	afterEach(() => {
		delete FEATURED_MODELS.google;
	});

	it('moves featured models to the front and keeps the order of the rest', () => {
		const models = ['models/gemini-2.5-flash', 'models/gemini-featured', 'models/gemini-2.5-pro'];

		expect(pinFeaturedModels('google', models, (model) => model)).toEqual([
			'models/gemini-featured',
			'models/gemini-2.5-flash',
			'models/gemini-2.5-pro',
		]);
	});

	it('leaves lists without featured models unchanged', () => {
		const models = [{ id: 'gpt-5' }, { id: 'gpt-4.1' }];

		expect(pinFeaturedModels('openai', models, (model) => model.id)).toEqual(models);
	});
});
