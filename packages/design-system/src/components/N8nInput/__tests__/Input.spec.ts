import { render } from '@testing-library/vue';
import N8nInput from '../Input.vue';

describe('N8nInput', () => {
	it('should render correctly', () => {
		const wrapper = render(N8nInput);
		expect(wrapper.html()).toMatchSnapshot();
	});
});
