import { Scorer } from '../scorer';

describe('Scorer', () => {
	it('should build a scorer with all fields', () => {
		const scorer = new Scorer('relevancy')
			.type('answer-relevancy')
			.model('anthropic/claude-haiku-4-5')
			.sampling(0.5)
			.build();

		expect(scorer.name).toBe('relevancy');
		expect(scorer.scorerType).toBe('answer-relevancy');
		expect(scorer.sampling).toBe(0.5);
	});

	it('should default sampling to 1.0', () => {
		const scorer = new Scorer('toxicity')
			.type('toxicity')
			.model('anthropic/claude-haiku-4-5')
			.build();

		expect(scorer.sampling).toBe(1.0);
	});

	it('should throw if type is missing', () => {
		expect(() => new Scorer('test').model('openai/gpt-4o').build()).toThrow(
			'Scorer "test" requires a type',
		);
	});

	it('should throw if model is missing', () => {
		expect(() => new Scorer('test').type('toxicity').build()).toThrow(
			'Scorer "test" requires a model',
		);
	});
});
