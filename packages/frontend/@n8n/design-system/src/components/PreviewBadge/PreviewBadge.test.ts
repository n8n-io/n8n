import { render } from '@testing-library/vue';
import { mount } from '@vue/test-utils';

import N8nBadge from '../N8nBadge';

import PreviewBadge from './PreviewBadge.vue';

describe('PreviewBadge', () => {
	it('uses the outline variant and forwards its size', () => {
		const wrapper = mount(PreviewBadge, { props: { size: 'small' } });
		expect(wrapper.getComponent(N8nBadge).props()).toMatchObject({
			variant: 'outline',
			size: 'small',
		});
	});

	it('renders custom text instead of the default label', () => {
		const { getByText } = render(PreviewBadge, { props: { text: 'Early preview' } });
		expect(getByText('Early preview')).toBeInTheDocument();
	});
});
