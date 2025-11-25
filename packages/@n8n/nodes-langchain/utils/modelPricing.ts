/**
 * Model Pricing Service
 * Fetches and caches pricing data from LiteLLM's pricing database via CDN
 * Includes fallback pricing for most common models
 */

type ModelPricing = {
	input_cost_per_token?: number;
	output_cost_per_token?: number;
	input_cost_per_million_tokens?: number;
	output_cost_per_million_tokens?: number;
};

type PricingDatabase = Record<string, ModelPricing>;

/**
 * Fallback pricing for most common models (updated as of January 2025)
 * Prices are per million tokens
 */
const FALLBACK_PRICING: PricingDatabase = {
	// OpenAI Models
	'gpt-4': {
		input_cost_per_million_tokens: 30,
		output_cost_per_million_tokens: 60,
	},
	'gpt-4-turbo': {
		input_cost_per_million_tokens: 10,
		output_cost_per_million_tokens: 30,
	},
	'gpt-4o': {
		input_cost_per_million_tokens: 2.5,
		output_cost_per_million_tokens: 10,
	},
	'gpt-4o-mini': {
		input_cost_per_million_tokens: 0.15,
		output_cost_per_million_tokens: 0.6,
	},
	'gpt-3.5-turbo': {
		input_cost_per_million_tokens: 0.5,
		output_cost_per_million_tokens: 1.5,
	},
	// Anthropic Models
	'claude-3-opus-20240229': {
		input_cost_per_million_tokens: 15,
		output_cost_per_million_tokens: 75,
	},
	'claude-3-sonnet-20240229': {
		input_cost_per_million_tokens: 3,
		output_cost_per_million_tokens: 15,
	},
	'claude-3-haiku-20240307': {
		input_cost_per_million_tokens: 0.25,
		output_cost_per_million_tokens: 1.25,
	},
	'claude-3-5-sonnet-20241022': {
		input_cost_per_million_tokens: 3,
		output_cost_per_million_tokens: 15,
	},
	// Google Models
	'gemini-pro': {
		input_cost_per_million_tokens: 0.5,
		output_cost_per_million_tokens: 1.5,
	},
	'gemini-1.5-pro': {
		input_cost_per_million_tokens: 1.25,
		output_cost_per_million_tokens: 5,
	},
	'gemini-1.5-flash': {
		input_cost_per_million_tokens: 0.075,
		output_cost_per_million_tokens: 0.3,
	},
};

class ModelPricingService {
	private static instance: ModelPricingService;
	private pricingData: PricingDatabase | null = null;
	private fetchPromise: Promise<void> | null = null;
	private lastFetchTime: number = 0;
	private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
	private readonly PRICING_URL =
		'https://cdn.jsdelivr.net/gh/BerriAI/litellm@main/model_prices_and_context_window.json';

	private constructor() {}

	static getInstance(): ModelPricingService {
		if (!ModelPricingService.instance) {
			ModelPricingService.instance = new ModelPricingService();
		}
		return ModelPricingService.instance;
	}

	/**
	 * Fetches pricing data from LiteLLM via CDN
	 * Uses cache if data is fresh (< 24 hours old)
	 */
	private async fetchPricingData(): Promise<void> {
		// Return existing promise if fetch is in progress
		if (this.fetchPromise) {
			return await this.fetchPromise;
		}

		// Use cached data if it's fresh
		const now = Date.now();
		if (this.pricingData && now - this.lastFetchTime < this.CACHE_DURATION) {
			return;
		}

		// Fetch new data
		this.fetchPromise = (async () => {
			try {
				const response = await fetch(this.PRICING_URL);
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				this.pricingData = await response.json();
				this.lastFetchTime = Date.now();
			} catch (error) {
				// If fetch fails, use fallback data
				if (!this.pricingData) {
					this.pricingData = FALLBACK_PRICING;
					console.warn('Failed to fetch model pricing data, using fallback:', error);
				}
			} finally {
				this.fetchPromise = null;
			}
		})();

		return await this.fetchPromise;
	}

	/**
	 * Get pricing for a specific model
	 */
	private async getModelPricing(modelName: string): Promise<ModelPricing | null> {
		await this.fetchPricingData();

		// Validate modelName is a string
		if (typeof modelName !== 'string' || !modelName) {
			return null;
		}

		if (!this.pricingData) {
			// Use fallback if fetch completely failed
			return await Promise.resolve(FALLBACK_PRICING[modelName] || null);
		}

		// Try exact match first
		if (this.pricingData[modelName]) {
			return this.pricingData[modelName];
		}

		// Try common variations
		const variations = [
			modelName.toLowerCase(),
			`openai/${modelName}`,
			`anthropic/${modelName}`,
			`google/${modelName}`,
			`azure/${modelName}`,
		];

		for (const variant of variations) {
			if (this.pricingData[variant]) {
				return this.pricingData[variant];
			}
		}

		// Check fallback as last resort
		return await Promise.resolve(FALLBACK_PRICING[modelName] || null);
	}

	/**
	 * Calculate cost for given token usage
	 * @param modelName The model identifier
	 * @param promptTokens Number of prompt/input tokens
	 * @param completionTokens Number of completion/output tokens
	 * @returns Estimated cost in USD, or null if pricing unavailable
	 */
	async calculateCost(
		modelName: string,
		promptTokens: number,
		completionTokens: number,
	): Promise<number | null> {
		const pricing = await this.getModelPricing(modelName);

		if (!pricing) {
			return null;
		}

		// LiteLLM can store pricing in two formats:
		// 1. Per-token pricing (input_cost_per_token, output_cost_per_token)
		// 2. Per-million tokens (input_cost_per_million_tokens, output_cost_per_million_tokens)

		let inputCost = 0;
		let outputCost = 0;

		if (pricing.input_cost_per_token !== undefined) {
			inputCost = promptTokens * pricing.input_cost_per_token;
		} else if (pricing.input_cost_per_million_tokens !== undefined) {
			inputCost = (promptTokens / 1_000_000) * pricing.input_cost_per_million_tokens;
		}

		if (pricing.output_cost_per_token !== undefined) {
			outputCost = completionTokens * pricing.output_cost_per_token;
		} else if (pricing.output_cost_per_million_tokens !== undefined) {
			outputCost = (completionTokens / 1_000_000) * pricing.output_cost_per_million_tokens;
		}

		return inputCost + outputCost;
	}

	/**
	 * Force refresh pricing data (useful for testing)
	 */
	async refresh(): Promise<void> {
		this.pricingData = null;
		this.lastFetchTime = 0;
		await this.fetchPricingData();
	}
}

// Export singleton instance
export const modelPricingService = ModelPricingService.getInstance();
