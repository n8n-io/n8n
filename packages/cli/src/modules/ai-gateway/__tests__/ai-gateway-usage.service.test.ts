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
			expect(usage.totalCost).toBe(0);
			expect(usage.byModel).toEqual({});
		});

		it('should aggregate usage by model', () => {
			service.track({
				timestamp: new Date(),
				model: 'openai/gpt-4.1-mini',
				inputTokens: 100,
				outputTokens: 50,
			});
			service.track({
				timestamp: new Date(),
				model: 'openai/gpt-4.1-mini',
				inputTokens: 200,
				outputTokens: 80,
			});
			service.track({
				timestamp: new Date(),
				model: 'openai/o4-mini',
				inputTokens: 500,
				outputTokens: 300,
			});

			const usage = service.getUsage();
			expect(usage.totalRequests).toBe(3);
			expect(usage.totalInputTokens).toBe(800);
			expect(usage.totalOutputTokens).toBe(430);
			expect(usage.byModel['openai/gpt-4.1-mini']).toEqual({
				requests: 2,
				inputTokens: 300,
				outputTokens: 130,
				cost: 0,
			});
			expect(usage.byModel['openai/o4-mini']).toEqual({
				requests: 1,
				inputTokens: 500,
				outputTokens: 300,
				cost: 0,
			});
		});
	});

	describe('clear', () => {
		it('should reset all records', () => {
			service.track({
				timestamp: new Date(),
				model: 'openai/gpt-4.1-mini',
				inputTokens: 100,
				outputTokens: 50,
			});
			expect(service.getUsage().totalRequests).toBe(1);

			service.clear();
			expect(service.getUsage().totalRequests).toBe(0);
		});
	});
});
