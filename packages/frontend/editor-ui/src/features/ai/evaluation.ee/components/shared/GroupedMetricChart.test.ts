import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import GroupedMetricChart from './GroupedMetricChart.vue';
import { versionColorVar } from './versionPalette';

const renderComponent = createComponentRenderer(GroupedMetricChart);

describe('GroupedMetricChart', () => {
	it('renders one bar per version in version colors (mini variant)', () => {
		const { container } = renderComponent({
			props: { groups: [{ label: 'Helpfulness', values: [0.9, 0.4] }] },
		});
		const bars = container.querySelectorAll('svg rect');

		expect(bars).toHaveLength(2);
		expect(bars[0].getAttribute('fill')).toBe(versionColorVar(0));
		expect(bars[1].getAttribute('fill')).toBe(versionColorVar(1));
		// mini variant draws no score labels or version letters
		expect(container.querySelectorAll('svg text')).toHaveLength(0);
	});

	it('draws score labels and version letters in the detailed variant', () => {
		const { container } = renderComponent({
			props: {
				variant: 'detailed',
				groups: [{ label: 'Helpfulness', values: [0.9, 0.4], letters: ['A', 'B'] }],
			},
		});
		const text = container.textContent ?? '';

		expect(text).toContain('90%');
		expect(text).toContain('40%');
		expect(text).toContain('A');
		expect(text).toContain('B');
	});

	it('paints sub-threshold bars in the danger color when criticalThreshold is set', () => {
		const { container } = renderComponent({
			props: {
				variant: 'detailed',
				criticalThreshold: 0.6,
				groups: [{ label: 'Helpfulness', values: [0.9, 0.4], letters: ['A', 'B'] }],
			},
		});
		const bars = container.querySelectorAll('svg rect');

		// 0.9 ≥ 0.6 keeps its version color; 0.4 < 0.6 flips to danger.
		expect(bars[0].getAttribute('fill')).toBe(versionColorVar(0));
		expect(bars[1].getAttribute('fill')).toBe('var(--color--red-700)');
	});
});
