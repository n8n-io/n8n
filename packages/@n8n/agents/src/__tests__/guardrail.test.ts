import { Guardrail } from '../guardrail';

describe('Guardrail', () => {
	it('should build a PII guardrail', () => {
		const guardrail = new Guardrail('pii-detector')
			.type('pii')
			.strategy('redact')
			.detect(['email', 'phone', 'credit-card'])
			.build();

		expect(guardrail.name).toBe('pii-detector');
		expect(guardrail.guardType).toBe('pii');
		expect(guardrail.strategy).toBe('redact');
	});

	it('should build a prompt injection guardrail', () => {
		const guardrail = new Guardrail('injection')
			.type('prompt-injection')
			.strategy('block')
			.threshold(0.8)
			.build();

		expect(guardrail.name).toBe('injection');
		expect(guardrail.guardType).toBe('prompt-injection');
		expect(guardrail.strategy).toBe('block');
	});

	it('should build a moderation guardrail', () => {
		const guardrail = new Guardrail('moderation').type('moderation').strategy('block').build();

		expect(guardrail.name).toBe('moderation');
		expect(guardrail.guardType).toBe('moderation');
	});

	it('should throw if type is missing', () => {
		expect(() => new Guardrail('test').strategy('block').build()).toThrow(
			'Guardrail "test" requires a type',
		);
	});

	it('should throw if strategy is missing', () => {
		expect(() => new Guardrail('test').type('pii').build()).toThrow(
			'Guardrail "test" requires a strategy',
		);
	});
});
