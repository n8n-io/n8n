import { render } from '@testing-library/vue';

import N8NCircleLoader from './CircleLoader.vue';

describe('N8NCircleLoader', () => {
	it('should render correctly', () => {
		const wrapper = render(N8NCircleLoader, {
			props: {
				radius: 20,
				progress: 42,
				strokeWidth: 10,
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
