import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import MetricSummaryStrip from './MetricSummaryStrip.vue';

const renderComponent = createComponentRenderer(MetricSummaryStrip);

function deltaText(container: Element): string {
	return container.querySelector('[data-test-id="trend-delta-badge"]')?.textContent?.trim() ?? '';
}

describe('MetricSummaryStrip', () => {
	it('normalizes each run on its own scale before computing the delta', () => {
		// "Quality" changed scale between runs: previous 4 on a 1–5 scale (→80%),
		// current 0.9 on a unit scale (→90%). The delta is +10 points — a raw
		// 0.9 − 4 cross-scale subtraction would render nonsense.
		const { container } = renderComponent({
			props: {
				currentMetrics: { Quality: 0.9 },
				previousMetrics: { Quality: 4 },
				metricScales: { Quality: 'unit' },
				previousMetricScales: { Quality: 'oneToFive' },
			},
		});

		expect(deltaText(container)).toContain('+10%');
	});

	it('renders the same delta as before for a metric whose scale did not change', () => {
		// 4→5 on a 1–5 scale is a +1 point gain = +20 percentage points.
		const { container } = renderComponent({
			props: {
				currentMetrics: { Score: 5 },
				previousMetrics: { Score: 4 },
				metricScales: { Score: 'oneToFive' },
				previousMetricScales: { Score: 'oneToFive' },
			},
		});

		expect(deltaText(container)).toContain('+20%');
	});
});
