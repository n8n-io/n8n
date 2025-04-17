import { render } from '@testing-library/vue';

import N8nCheckbox from './Checkbox.vue';

describe('components', () => {
	describe('N8nCheckbox', () => {
		it('should render without label and child content', () => {
			const { container } = render(N8nCheckbox);
			expect(container).toMatchSnapshot();
		});

		it('should render with label', () => {
			const { container } = render(N8nCheckbox, { props: { label: 'Checkbox' } });
			expect(container).toMatchSnapshot();
		});

		it('should render with child', () => {
			const { container } = render(N8nCheckbox, {
				slots: { default: '<strong>Bold text</strong>' },
			});
			expect(container).toMatchSnapshot();
		});

		it('should render with both child and label', () => {
			const { container } = render(N8nCheckbox, {
				props: { label: 'Checkbox' },
				slots: { default: '<strong>Bold text</strong>' },
			});
			expect(container).toMatchSnapshot();
		});
	});
});
