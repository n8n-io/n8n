import { render } from '@testing-library/vue';

import AssistantText from './AssistantText.vue';

describe('AssistantText', () => {
	it('renders default text correctly', () => {
		const { container } = render(AssistantText, {
			props: {
				text: 'Ask me something',
			},
		});
		expect(container).toMatchSnapshot();
	});
	it('renders small text correctly', () => {
		const { container } = render(AssistantText, {
			props: {
				text: 'Ask me something',
				size: 'small',
			},
		});
		expect(container).toMatchSnapshot();
	});
	it('renders medium text correctly', () => {
		const { container } = render(AssistantText, {
			props: {
				text: 'Ask me something',
				size: 'medium',
			},
		});
		expect(container).toMatchSnapshot();
	});
	it('renders large text correctly', () => {
		const { container } = render(AssistantText, {
			props: {
				text: 'Ask me something',
				size: 'large',
			},
		});
		expect(container).toMatchSnapshot();
	});
});
