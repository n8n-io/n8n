import { render } from '@testing-library/vue';

import N8NActionBox from './ActionBox.vue';

describe('N8NActionBox', () => {
	it('should render correctly', () => {
		const wrapper = render(N8NActionBox, {
			props: {
				emoji: '😿',
				heading: 'Headline you need to know',
				description:
					'Long description that you should know something is the way it is because of how it is. ',
				buttonText: 'Do something',
				buttonType: 'primary',
			},
			global: {
				stubs: ['N8nHeading', 'N8nText', 'N8nButton', 'N8nCallout'],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
