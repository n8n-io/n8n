import { Container } from '@n8n/di';

import { AiConfig } from '../ai.config';

describe('AiConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.clearAllMocks();
	});

	afterEach(() => {
		delete process.env.N8N_AI_RATE_LIMIT;
	});

	it('should not poison openAiDefaultHeaders object globally when modified', () => {
		const { openAiDefaultHeaders } = Container.get(AiConfig);
		openAiDefaultHeaders.test = 'ok';
		expect(openAiDefaultHeaders.test).toBe('ok');
		expect(Container.get(AiConfig).openAiDefaultHeaders.test).toBeFalsy();
	});

	describe('rateLimit', () => {
		it('applies the documented default limit', () => {
			expect(Container.get(AiConfig).rateLimit).toBe(100);
		});

		it('reads the limit from its environment variable', () => {
			process.env.N8N_AI_RATE_LIMIT = '500';
			expect(Container.get(AiConfig).rateLimit).toBe(500);
		});

		it('accepts 0 to disable rate limiting for the AI endpoints', () => {
			process.env.N8N_AI_RATE_LIMIT = '0';
			expect(Container.get(AiConfig).rateLimit).toBe(0);
		});

		it.each(['-5', 'abc', '1.5'])(
			'falls back to the default when given an invalid value (%s)',
			(value) => {
				process.env.N8N_AI_RATE_LIMIT = value;
				expect(Container.get(AiConfig).rateLimit).toBe(100);
			},
		);
	});
});
