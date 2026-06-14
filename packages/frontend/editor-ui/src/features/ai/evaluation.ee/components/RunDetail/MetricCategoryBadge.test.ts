import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import MetricCategoryBadge from './MetricCategoryBadge.vue';

const renderComponent = createComponentRenderer(MetricCategoryBadge);

describe('MetricCategoryBadge', () => {
	it('renders the AI-based label for the aiBased category', () => {
		const { container } = renderComponent({ props: { category: 'aiBased' } });
		expect(
			container.querySelector('[data-test-id="metric-category-badge"]')?.textContent,
		).toContain('AI-based');
	});

	it('renders the Custom label for the custom category', () => {
		const { container } = renderComponent({ props: { category: 'custom' } });
		expect(
			container.querySelector('[data-test-id="metric-category-badge"]')?.textContent,
		).toContain('Custom');
	});

	it('renders the heuristic categories', () => {
		const stringSim = renderComponent({ props: { category: 'stringSimilarity' } });
		expect(stringSim.container.textContent).toContain('String similarity');

		const cat = renderComponent({ props: { category: 'categorization' } });
		expect(cat.container.textContent).toContain('Categorization');

		const tools = renderComponent({ props: { category: 'toolsUsed' } });
		expect(tools.container.textContent).toContain('Tools used');
	});
});
