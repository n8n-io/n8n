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

	it.each(['success', 'info', 'warning', 'danger'] as const)('renders the %s color', (type) => {
		const wrapper = render(N8nTag, {
			props: {
				text: 'Tag name',
				type,
				clickable: false,
			},
		});

		expect(wrapper.getByText('Tag name').closest('.n8n-tag')?.className).toContain(type);
	});

	it('renders a pill radius when round is set', () => {
		const wrapper = render(N8nTag, {
			props: {
				text: 'Tag name',
				round: true,
				clickable: false,
			},
		});

		expect(wrapper.getByText('Tag name').closest('.n8n-tag')?.className).toContain('round');
	});

	it('renders the default slot', () => {
		const wrapper = render(N8nTag, {
			props: { clickable: false },
			slots: { default: '<span>Custom label</span>' },
		});

		expect(wrapper.getByText('Custom label')).toBeInTheDocument();
	});
});
