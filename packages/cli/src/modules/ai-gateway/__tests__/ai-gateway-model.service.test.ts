import { AiGatewayModelService } from '../ai-gateway-model.service';
import { MODEL_CATEGORY_MAP } from '../ai-gateway.constants';

describe('AiGatewayModelService', () => {
	let service: AiGatewayModelService;

	beforeEach(() => {
		service = new AiGatewayModelService();
	});

	describe('resolveModel', () => {
		it.each(Object.entries(MODEL_CATEGORY_MAP))(
			'should resolve category "%s" to "%s"',
			(category, expectedModel) => {
				expect(service.resolveModel(category)).toBe(expectedModel);
			},
		);

		it('should pass through concrete model IDs unchanged', () => {
			expect(service.resolveModel('openai/gpt-4.1')).toBe('openai/gpt-4.1');
			expect(service.resolveModel('anthropic/claude-sonnet-4')).toBe('anthropic/claude-sonnet-4');
			expect(service.resolveModel('meta-llama/llama-3-70b')).toBe('meta-llama/llama-3-70b');
		});

		it('should be case-sensitive', () => {
			expect(service.resolveModel('Balanced')).toBe('Balanced');
			expect(service.resolveModel('BALANCED')).toBe('BALANCED');
		});
	});

	describe('isCategory', () => {
		it('should return true for valid categories', () => {
			expect(service.isCategory('balanced')).toBe(true);
			expect(service.isCategory('cheapest')).toBe(true);
			expect(service.isCategory('fastest')).toBe(true);
			expect(service.isCategory('best-quality')).toBe(true);
			expect(service.isCategory('reasoning')).toBe(true);
		});

		it('should return false for non-categories', () => {
			expect(service.isCategory('openai/gpt-4.1')).toBe(false);
			expect(service.isCategory('manual')).toBe(false);
			expect(service.isCategory('')).toBe(false);
		});
	});

	describe('getCategories', () => {
		it('should return all category info objects', () => {
			const categories = service.getCategories();
			expect(categories).toHaveLength(5);
			expect(categories.map((c) => c.id)).toEqual([
				'balanced',
				'cheapest',
				'fastest',
				'best-quality',
				'reasoning',
			]);
			for (const cat of categories) {
				expect(cat).toHaveProperty('label');
				expect(cat).toHaveProperty('description');
				expect(cat).toHaveProperty('model');
			}
		});
	});
});
