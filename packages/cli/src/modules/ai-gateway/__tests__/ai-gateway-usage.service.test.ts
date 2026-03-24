import { AiGatewayUsageService } from '../ai-gateway-usage.service';

describe('AiGatewayUsageService', () => {
	let service: AiGatewayUsageService;

	beforeEach(() => {
		service = new AiGatewayUsageService();
	});

	describe('track and getUsage', () => {
		it('should return empty usage when no records', () => {
			const usage = service.getUsage();
			expect(usage.totalRequests).toBe(0);
			expect(usage.totalInputTokens).toBe(0);
			expect(usage.totalOutputTokens).toBe(0);
			expect(usage.byCategory).toEqual({});
			expect(usage.byModel).toEqual({});
		});

		it('should aggregate usage by category', () => {
			service.track({
				timestamp: new Date(),
				category: 'balanced',
				resolvedModel: 'openai/gpt-4.1-mini',
				inputTokens: 100,
				outputTokens: 50,
			});
			service.track({
				timestamp: new Date(),
				category: 'balanced',
				resolvedModel: 'openai/gpt-4.1-mini',
				inputTokens: 200,
				outputTokens: 80,
			});
			service.track({
				timestamp: new Date(),
				category: 'reasoning',
				resolvedModel: 'openai/o4-mini',
				inputTokens: 500,
				outputTokens: 300,
			});

			const usage = service.getUsage();
			expect(usage.totalRequests).toBe(3);
			expect(usage.totalInputTokens).toBe(800);
			expect(usage.totalOutputTokens).toBe(430);
			expect(usage.byCategory.balanced).toEqual({
				requests: 2,
				inputTokens: 300,
				outputTokens: 130,
			});
			expect(usage.byCategory.reasoning).toEqual({
				requests: 1,
				inputTokens: 500,
				outputTokens: 300,
			});
			expect(usage.byModel['openai/gpt-4.1-mini']).toEqual({
				requests: 2,
				inputTokens: 300,
				outputTokens: 130,
			});
			expect(usage.byModel['openai/o4-mini']).toEqual({
				requests: 1,
				inputTokens: 500,
				outputTokens: 300,
			});
		});
	});

	describe('extractUsageFromResponseBody', () => {
		it('should extract tokens from standard response', () => {
			const result = service.extractUsageFromResponseBody({
				usage: { prompt_tokens: 42, completion_tokens: 18 },
			});
			expect(result).toEqual({ inputTokens: 42, outputTokens: 18 });
		});

		it('should return zeros when usage is missing', () => {
			const result = service.extractUsageFromResponseBody({});
			expect(result).toEqual({ inputTokens: 0, outputTokens: 0 });
		});
	});

	describe('clear', () => {
		it('should reset all records', () => {
			service.track({
				timestamp: new Date(),
				category: 'balanced',
				resolvedModel: 'openai/gpt-4.1-mini',
				inputTokens: 100,
				outputTokens: 50,
			});
			expect(service.getUsage().totalRequests).toBe(1);

			service.clear();
			expect(service.getUsage().totalRequests).toBe(0);
		});
	});
});
