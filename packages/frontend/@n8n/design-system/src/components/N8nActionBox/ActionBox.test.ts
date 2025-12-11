import { render } from '@testing-library/vue';

import N8NActionBox from './ActionBox.vue';

describe('N8NActionBox', () => {
	it('should render correctly with emoji', () => {
		const wrapper = render(N8NActionBox, {
			props: {
				icon: { type: 'emoji', value: '😿' },
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

	it('should render correctly with icon', () => {
		const wrapper = render(N8NActionBox, {
			props: {
				icon: { type: 'icon', value: 'plus' },
				heading: 'Add something new',
				description: 'Click the button to add a new item.',
				buttonText: 'Add Item',
				buttonType: 'primary',
			},
			global: {
				stubs: ['N8nHeading', 'N8nText', 'N8nButton', 'N8nCallout', 'N8nIcon'],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
