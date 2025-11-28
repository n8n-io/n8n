import { modelPricingService } from '../modelPricing';

describe('ModelPricingService', () => {
	beforeEach(() => {
		// Reset the singleton instance state before each test
		// @ts-expect-error - accessing private property for testing
		modelPricingService.pricingData = null;
		// @ts-expect-error - accessing private property for testing
		modelPricingService.lastFetchTime = 0;
	});

	describe('calculateCost', () => {
		describe('fallback pricing', () => {
			it('should calculate cost for GPT-4o-mini', async () => {
				const cost = await modelPricingService.calculateCost('gpt-4o-mini', 1000, 500);

				// GPT-4o-mini: $0.15 per million input tokens, $0.60 per million output tokens
				// (1000 / 1_000_000) * 0.15 + (500 / 1_000_000) * 0.60 = 0.00015 + 0.0003 = 0.00045
				expect(cost).toBe(0.00045);
			});

			it('should calculate cost for GPT-4', async () => {
				const cost = await modelPricingService.calculateCost('gpt-4', 1000, 500);

				// GPT-4: $30 per million input tokens, $60 per million output tokens
				// (1000 / 1_000_000) * 30 + (500 / 1_000_000) * 60 = 0.03 + 0.03 = 0.06
				expect(cost).toBeCloseTo(0.06, 10);
			});

			it('should calculate cost for GPT-4 Turbo', async () => {
				const cost = await modelPricingService.calculateCost('gpt-4-turbo', 1000, 500);

				// GPT-4 Turbo: $10 per million input tokens, $30 per million output tokens
				// (1000 / 1_000_000) * 10 + (500 / 1_000_000) * 30 = 0.01 + 0.015 = 0.025
				expect(cost).toBe(0.025);
			});

			it('should calculate cost for GPT-4o', async () => {
				const cost = await modelPricingService.calculateCost('gpt-4o', 1000, 500);

				// GPT-4o: $2.5 per million input tokens, $10 per million output tokens
				// (1000 / 1_000_000) * 2.5 + (500 / 1_000_000) * 10 = 0.0025 + 0.005 = 0.0075
				expect(cost).toBe(0.0075);
			});

			it('should calculate cost for GPT-3.5 Turbo', async () => {
				const cost = await modelPricingService.calculateCost('gpt-3.5-turbo', 1000, 500);

				// GPT-3.5 Turbo: $0.5 per million input tokens, $1.5 per million output tokens
				// (1000 / 1_000_000) * 0.5 + (500 / 1_000_000) * 1.5 = 0.0005 + 0.00075 = 0.00125
				expect(cost).toBe(0.00125);
			});

			it('should calculate cost for Claude 3 Opus', async () => {
				const cost = await modelPricingService.calculateCost('claude-3-opus-20240229', 1000, 500);

				// Claude 3 Opus: $15 per million input tokens, $75 per million output tokens
				// (1000 / 1_000_000) * 15 + (500 / 1_000_000) * 75 = 0.015 + 0.0375 = 0.0525
				expect(cost).toBe(0.0525);
			});

			it('should calculate cost for Claude 3 Sonnet', async () => {
				const cost = await modelPricingService.calculateCost('claude-3-sonnet-20240229', 1000, 500);

				// Claude 3 Sonnet: $3 per million input tokens, $15 per million output tokens
				// (1000 / 1_000_000) * 3 + (500 / 1_000_000) * 15 = 0.003 + 0.0075 = 0.0105
				expect(cost).toBeCloseTo(0.0105, 10);
			});

			it('should calculate cost for Claude 3 Haiku', async () => {
				const cost = await modelPricingService.calculateCost('claude-3-haiku-20240307', 1000, 500);

				// Claude 3 Haiku: $0.25 per million input tokens, $1.25 per million output tokens
				// (1000 / 1_000_000) * 0.25 + (500 / 1_000_000) * 1.25 = 0.00025 + 0.000625 = 0.000875
				expect(cost).toBe(0.000875);
			});

			it('should calculate cost for Claude 3.5 Sonnet', async () => {
				const cost = await modelPricingService.calculateCost(
					'claude-3-5-sonnet-20241022',
					1000,
					500,
				);

				// Claude 3.5 Sonnet: $3 per million input tokens, $15 per million output tokens
				// (1000 / 1_000_000) * 3 + (500 / 1_000_000) * 15 = 0.003 + 0.0075 = 0.0105
				expect(cost).toBeCloseTo(0.0105, 10);
			});

			it('should calculate cost for Gemini Pro', async () => {
				const cost = await modelPricingService.calculateCost('gemini-pro', 1000, 500);

				// Gemini Pro: $0.5 per million input tokens, $1.5 per million output tokens
				// (1000 / 1_000_000) * 0.5 + (500 / 1_000_000) * 1.5 = 0.0005 + 0.00075 = 0.00125
				expect(cost).toBe(0.00125);
			});

			it('should calculate cost for Gemini 1.5 Pro', async () => {
				const cost = await modelPricingService.calculateCost('gemini-1.5-pro', 1000, 500);

				// Gemini 1.5 Pro: $1.25 per million input tokens, $5 per million output tokens
				// (1000 / 1_000_000) * 1.25 + (500 / 1_000_000) * 5 = 0.00125 + 0.0025 = 0.00375
				expect(cost).toBe(0.00375);
			});

			it('should calculate cost for Gemini 1.5 Flash', async () => {
				const cost = await modelPricingService.calculateCost('gemini-1.5-flash', 1000, 500);

				// Gemini 1.5 Flash: $0.075 per million input tokens, $0.3 per million output tokens
				// (1000 / 1_000_000) * 0.075 + (500 / 1_000_000) * 0.3 = 0.000075 + 0.00015 = 0.000225
				expect(cost).toBe(0.000225);
			});
		});

		describe('unknown models', () => {
			it('should return null for unknown model', async () => {
				const cost = await modelPricingService.calculateCost('unknown-model-xyz', 1000, 500);
				expect(cost).toBeNull();
			});

			it('should return null for empty model name', async () => {
				const cost = await modelPricingService.calculateCost('', 1000, 500);
				expect(cost).toBeNull();
			});
		});

		describe('edge cases', () => {
			it('should handle zero tokens', async () => {
				const cost = await modelPricingService.calculateCost('gpt-4o-mini', 0, 0);
				expect(cost).toBe(0);
			});

			it('should handle only input tokens', async () => {
				const cost = await modelPricingService.calculateCost('gpt-4o-mini', 1000, 0);

				// Only input cost: (1000 / 1_000_000) * 0.15 = 0.00015
				expect(cost).toBe(0.00015);
			});

			it('should handle only output tokens', async () => {
				const cost = await modelPricingService.calculateCost('gpt-4o-mini', 0, 500);

				// Only output cost: (500 / 1_000_000) * 0.60 = 0.0003
				expect(cost).toBe(0.0003);
			});

			it('should handle large token counts', async () => {
				const cost = await modelPricingService.calculateCost('gpt-4o-mini', 1_000_000, 500_000);

				// (1_000_000 / 1_000_000) * 0.15 + (500_000 / 1_000_000) * 0.60 = 0.15 + 0.30 = 0.45
				expect(cost).toBeCloseTo(0.45, 10);
			});
		});

		describe('realistic scenarios', () => {
			it('should calculate cost for short conversation', async () => {
				// Typical short prompt + response
				const cost = await modelPricingService.calculateCost('gpt-4o-mini', 50, 100);

				// (50 / 1_000_000) * 0.15 + (100 / 1_000_000) * 0.60 = 0.0000075 + 0.00006 = 0.0000675
				expect(cost).toBeCloseTo(0.0000675, 10);
			});

			it('should calculate cost for medium conversation', async () => {
				// Medium-length conversation
				const cost = await modelPricingService.calculateCost('gpt-4o-mini', 500, 300);

				// (500 / 1_000_000) * 0.15 + (300 / 1_000_000) * 0.60 = 0.000075 + 0.00018 = 0.000255
				expect(cost).toBeCloseTo(0.000255, 10);
			});

			it('should calculate cost for long document analysis', async () => {
				// Long document processing
				const cost = await modelPricingService.calculateCost('gpt-4o', 10000, 2000);

				// (10000 / 1_000_000) * 2.5 + (2000 / 1_000_000) * 10 = 0.025 + 0.02 = 0.045
				expect(cost).toBe(0.045);
			});

			it('should calculate cost for multi-turn agent conversation', async () => {
				// Multi-turn conversation with tool calls
				const cost = await modelPricingService.calculateCost(
					'claude-3-5-sonnet-20241022',
					2500,
					1500,
				);

				// (2500 / 1_000_000) * 3 + (1500 / 1_000_000) * 15 = 0.0075 + 0.0225 = 0.03
				expect(cost).toBe(0.03);
			});
		});

		describe('cost comparison', () => {
			it('should show GPT-4 is more expensive than GPT-4o-mini', async () => {
				const costGpt4 = await modelPricingService.calculateCost('gpt-4', 1000, 500);
				const costGpt4oMini = await modelPricingService.calculateCost('gpt-4o-mini', 1000, 500);

				expect(costGpt4).toBeGreaterThan(costGpt4oMini!);
			});

			it('should show Claude 3 Opus is more expensive than Claude 3 Haiku', async () => {
				const costOpus = await modelPricingService.calculateCost(
					'claude-3-opus-20240229',
					1000,
					500,
				);
				const costHaiku = await modelPricingService.calculateCost(
					'claude-3-haiku-20240307',
					1000,
					500,
				);

				expect(costOpus).toBeGreaterThan(costHaiku!);
			});

			it('should show Gemini 1.5 Pro is more expensive than Gemini 1.5 Flash', async () => {
				const costPro = await modelPricingService.calculateCost('gemini-1.5-pro', 1000, 500);
				const costFlash = await modelPricingService.calculateCost('gemini-1.5-flash', 1000, 500);

				expect(costPro).toBeGreaterThan(costFlash!);
			});
		});
	});

	describe('refresh', () => {
		it('should allow manual refresh of pricing data', async () => {
			// This test mainly ensures the method exists and doesn't throw
			await expect(modelPricingService.refresh()).resolves.not.toThrow();
		});
	});
});
