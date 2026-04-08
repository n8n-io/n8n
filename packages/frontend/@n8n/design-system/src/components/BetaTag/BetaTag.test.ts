import { render } from '@testing-library/vue';

import BetaTag from './BetaTag.vue';

describe('BetaTag', () => {
	it('renders beta tag correctly', () => {
		const { container } = render(BetaTag, {});
		expect(container).toMatchSnapshot();
	});
});
