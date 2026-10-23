import { pinPrioritizedModels } from '../model-priority';

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
		const models = [
			{ id: 'a', priority: '5' },
			{ id: 'b', priority: Number.NaN },
			{ id: 'c' },
			{ id: 'd', priority: Number.POSITIVE_INFINITY },
			{ id: 'valid', priority: 1 },
		];

		expect(pinPrioritizedModels(models, (model) => model.priority).map((m) => m.id)).toEqual([
			'valid',
			'a',
			'b',
			'c',
			'd',
		]);
	});
});
