import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '@testing-library/vue';

import Breadcrumbs from '.';
import { nextTick } from 'vue';

describe('Breadcrumbs', () => {
	it('renders default version correctly', () => {
		const wrapper = render(Breadcrumbs, {
			props: {
				items: [
					{ id: '1', label: 'Folder 1', href: '/folder1' },
					{ id: '2', label: 'Folder 2', href: '/folder2' },
					{ id: '3', label: 'Folder 3', href: '/folder3' },
					{ id: '4', label: 'Current' },
				],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders small version correctly', () => {
		const wrapper = render(Breadcrumbs, {
			props: {
				items: [
					{ id: '1', label: 'Folder 1', href: '/folder1' },
					{ id: '2', label: 'Folder 2', href: '/folder2' },
					{ id: '3', label: 'Folder 3', href: '/folder3' },
					{ id: '4', label: 'Current' },
				],
				theme: 'small',
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders slots correctly', () => {
		const wrapper = render(Breadcrumbs, {
			props: {
				items: [
					{ id: '1', label: 'Folder 1', href: '/folder1' },
					{ id: '2', label: 'Folder 2', href: '/folder2' },
					{ id: '3', label: 'Folder 3', href: '/folder3' },
					{ id: '4', label: 'Current' },
				],
			},
			slots: {
				prepend: '<div>[PRE] Custom content</div>',
				append: '<div>[POST] Custom content</div>',
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders hidden items correctly', async () => {
		const wrapper = render(Breadcrumbs, {
			props: {
				items: [
					{ id: '3', label: 'Folder 3', href: '/folder3' },
					{ id: '4', label: 'Current' },
				],
				hiddenItemsSource: [
					{ id: '1', label: 'Parent 1', href: '/hidden1' },
					{ id: '2', label: 'Parent 2', href: '/hidden2' },
				],
				tooltipTrigger: 'click',
			},
			global: {
				stubs: {
					'n8n-tooltip': {
						props: ['trigger', 'popper-class'],
						template: `
							<div>
									<slot name="content" />
							</div>
						`,
					},
					'n8n-link': {
						props: ['href', 'theme'],
						template: '<a :href="href" :theme="theme"><slot /></a>',
					},
					'n8n-text': {
						template: '<span><slot /></span>',
					},
				},
			},
		});

		await fireEvent.click(wrapper.getByTestId('ellipsis'));
		await nextTick();

		const renderedHiddenItems = wrapper.getAllByTestId('breadcrumbs-item-hidden');
		expect(renderedHiddenItems).toHaveLength(2);
		expect(renderedHiddenItems[0].textContent?.trim()).toBe('Parent 1');
		expect(renderedHiddenItems[1].textContent?.trim()).toBe('Parent 2');
	});
});
