import { render } from '@testing-library/vue';

import PreviewBadge from './PreviewBadge.vue';

describe('PreviewBadge', () => {
	it('renders small preview badge correctly', () => {
		const { container } = render(PreviewBadge, { props: { size: 'small' } });
		expect(container).toMatchSnapshot();
	});

	it('renders medium preview badge correctly', () => {
		const { container } = render(PreviewBadge, { props: { size: 'medium' } });
		expect(container).toMatchSnapshot();
	});

	it('renders custom text instead of the default label', () => {
		const { getByText } = render(PreviewBadge, { props: { text: 'Early preview' } });
		expect(getByText('Early preview')).toBeInTheDocument();
	});
});
