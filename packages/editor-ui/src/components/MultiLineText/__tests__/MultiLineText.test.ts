import { render } from '@testing-library/vue';

import MultiLineText from '../MultiLineText.vue';

describe('MultiLineText', () => {
	it('renders multiline text correctly', () => {
		const { container } = render(MultiLineText, {
			props: {
				text: 'The quick brown fox\njumps over the lazy dog',
			},
		});

		expect(container).toMatchSnapshot();
	});
});
