import { render } from '@testing-library/vue';

import AssistantAvatar from './AssistantAvatar.vue';

describe('AskAssistantAvatar', () => {
	it('renders small avatar correctly', () => {
		const { container } = render(AssistantAvatar, {
			props: {
				size: 'small',
			},
		});
		expect(container).toMatchSnapshot();
	});
	it('renders mini avatar correctly', () => {
		const { container } = render(AssistantAvatar, {
			props: {
				size: 'mini',
			},
		});
		expect(container).toMatchSnapshot();
	});
});
