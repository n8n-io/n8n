import { render } from '@testing-library/vue';

import InputLabel from './InputLabel.vue';

describe('component', () => {
	describe('Text overflow behavior', () => {
		it('displays full text without options', () => {
			const { container } = render(InputLabel, {
				props: {
					label: 'a label',
				},
			});

			expect(container.querySelectorAll('.textEllipses').length).eq(0);

			expect(container).toMatchSnapshot();
		});

		it('displays ellipsis with options', () => {
			const { container } = render(InputLabel, {
				props: {
					label: 'a label',
					showOptions: true,
				},
			});

			expect(container.querySelectorAll('.textEllipses').length).eq(1);

			expect(container).toMatchSnapshot();
		});
	});
});
