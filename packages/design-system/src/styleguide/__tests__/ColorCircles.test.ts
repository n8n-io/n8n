import { render } from '@testing-library/vue';
import ColorCircles from '../ColorCircles.vue';

describe('ColorCircles', () => {
	it('should render an empty section with empty colors', () => {
		const wrapper = render(ColorCircles, {
			props: {
				colors: [],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render a section with two colors', () => {
		const wrapper = render(ColorCircles, {
			props: {
				colors: ['--color-primary-shade-1', '--color-primary'],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
