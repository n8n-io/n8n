import { render } from '@testing-library/vue';

import N8nTag from './Tag.vue';

describe('N8nTag', () => {
	it('renders the default sm tag', () => {
		const wrapper = render(N8nTag, {
			props: {
				text: 'Tag name',
				clickable: false,
			},
		});

		const tag = wrapper.getByText('Tag name').closest('.n8n-tag');

		expect(tag).toBeInTheDocument();
		expect(tag?.className).toContain('sm');
	});

	it.each(['md', 'lg'] as const)('renders the %s tag variant', (size) => {
		const wrapper = render(N8nTag, {
			props: {
				text: 'Tag name',
				size,
				clickable: false,
			},
		});

		const tag = wrapper.getByText('Tag name').closest('.n8n-tag');

		expect(tag).toBeInTheDocument();
		expect(tag?.className).toContain(size);
	});
});
