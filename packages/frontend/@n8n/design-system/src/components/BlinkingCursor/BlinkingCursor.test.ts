import { render } from '@testing-library/vue';

import BlinkingCursor from './BlinkingCursor.vue';

describe('BlinkingCursor', () => {
	it('renders blinking cursor correctly', () => {
		const { container } = render(BlinkingCursor, {});
		expect(container).toMatchSnapshot();
	});
});
