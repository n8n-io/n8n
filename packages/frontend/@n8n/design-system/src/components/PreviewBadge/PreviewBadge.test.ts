import { render } from '@testing-library/vue';

import PreviewBadge from './PreviewBadge.vue';

describe('PreviewBadge', () => {
	it('renders custom text instead of the default label', () => {
		const { getByText } = render(PreviewBadge, { props: { text: 'Early preview' } });
		expect(getByText('Early preview')).toBeInTheDocument();
	});
});
