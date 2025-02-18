import { render } from '@testing-library/vue';

import Breadcrumbs from '.';

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

	it('renders custom separator correctly', () => {
		const wrapper = render(Breadcrumbs, {
			props: {
				items: [
					{ id: '1', label: 'Folder 1', href: '/folder1' },
					{ id: '2', label: 'Folder 2', href: '/folder2' },
					{ id: '3', label: 'Folder 3', href: '/folder3' },
					{ id: '4', label: 'Current' },
				],
				separator: '➮',
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
});
