import { render, screen } from '@testing-library/vue';

import N8nBlockUi from './BlockUi.vue';

describe('components', () => {
	describe('N8nBlockUi', () => {
		it('should render but not visible', () => {
			render(N8nBlockUi);
			expect(screen.queryByRole('dialog', { hidden: true })).not.toBeVisible();
		});

		it('should render and is visible', () => {
			render(N8nBlockUi, { props: { show: true } });
			expect(screen.getByRole('dialog', { hidden: true })).toBeVisible();
		});
	});
});
