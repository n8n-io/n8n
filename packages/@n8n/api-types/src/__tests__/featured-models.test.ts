import { FEATURED_MODELS, getFeaturedModelName, pinFeaturedModels } from '../featured-models';

describe('featured models', () => {
	beforeEach(() => {
		FEATURED_MODELS.google = { 'gemini-featured': 'Gemini Featured' };
	});

	afterEach(() => {
		delete FEATURED_MODELS.google;
	});

	describe('getFeaturedModelName', () => {
		it('returns the product name of a featured model', () => {
			expect(getFeaturedModelName('google', 'gemini-featured')).toBe('Gemini Featured');
			expect(getFeaturedModelName('google', 'models/gemini-featured')).toBe('Gemini Featured');
		});

		it('returns undefined for other models and providers', () => {
			expect(getFeaturedModelName('google', 'models/gemini-2.5-pro')).toBeUndefined();
			expect(getFeaturedModelName('openai', 'gemini-featured')).toBeUndefined();
		});
	});

	describe('pinFeaturedModels', () => {
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
});
