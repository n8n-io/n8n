import { render } from '@testing-library/vue';

import AssistantIcon from './AssistantIcon.vue';

describe('AssistantIcon', () => {
	it('renders default icon correctly', () => {
		const { container } = render(AssistantIcon, {});
		expect(container).toMatchSnapshot();
	});
	it('renders blank icon correctly', () => {
		const { container } = render(AssistantIcon, {
			props: {
				theme: 'blank',
			},
		});
		expect(container).toMatchSnapshot();
	});
	it('renders mini icon correctly', () => {
		const { container } = render(AssistantIcon, {
			props: {
				size: 'mini',
			},
		});
		expect(container).toMatchSnapshot();
	});
	it('renders small icon correctly', () => {
		const { container } = render(AssistantIcon, {
			props: {
				size: 'small',
			},
		});
		expect(container).toMatchSnapshot();
	});
	it('renders medium icon correctly', () => {
		const { container } = render(AssistantIcon, {
			props: {
				size: 'medium',
			},
		});
		expect(container).toMatchSnapshot();
	});
	it('renders large icon correctly', () => {
		const { container } = render(AssistantIcon, {
			props: {
				size: 'large',
			},
		});
		expect(container).toMatchSnapshot();
	});
});
