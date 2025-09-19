import { render } from '@testing-library/vue';

import N8nTree from './Tree.vue';

describe('components', () => {
	describe('N8nTree', () => {
		it('should render simple tree', () => {
			const wrapper = render(N8nTree, {
				props: {
					value: {
						hello: 'world',
					},
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render tree', () => {
			const wrapper = render(N8nTree, {
				props: {
					value: {
						hello: {
							test: 'world',
						},
						options: ['yes', 'no'],
					},
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render tree with slots', () => {
			const wrapper = render(N8nTree, {
				props: {
					value: {
						hello: {
							test: 'world',
						},
						options: ['yes', 'no'],
					},
				},
				slots: {
					label: '<span>label</span>',
					value: '<span>value</span>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render each tree with node class', () => {
			const wrapper = render(N8nTree, {
				props: {
					value: {
						hello: {
							test: 'world',
						},
						options: ['yes', 'no'],
					},
					nodeClass: 'nodeClass',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
	});
});
