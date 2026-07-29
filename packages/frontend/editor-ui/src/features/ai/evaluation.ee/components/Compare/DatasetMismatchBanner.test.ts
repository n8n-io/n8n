import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import DatasetMismatchBanner from './DatasetMismatchBanner.vue';

const renderComponent = createComponentRenderer(DatasetMismatchBanner);

describe('DatasetMismatchBanner', () => {
	it('renders the per-version case counts in the warning', () => {
		const { container } = renderComponent({
			props: { mismatch: { hasMismatch: true, counts: [12, 12, 10], maxCount: 12 } },
		});

		const banner = container.querySelector('[data-test-id="compare-dataset-mismatch"]');
		expect(banner).not.toBeNull();
		expect(banner?.textContent).toContain('12, 12, 10');
	});
});
