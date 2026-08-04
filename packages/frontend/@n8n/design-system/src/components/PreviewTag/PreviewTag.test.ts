import { render } from '@testing-library/vue';

import PreviewTag from './PreviewTag.vue';

describe('PreviewTag', () => {
	it('renders small preview tag correctly', () => {
		const { container } = render(PreviewTag, { props: { size: 'small' } });
		expect(container).toMatchSnapshot();
	});

	it('renders medium preview tag correctly', () => {
		const { container } = render(PreviewTag, { props: { size: 'medium' } });
		expect(container).toMatchSnapshot();
	});

	it('renders custom text instead of the default label', () => {
		const { getByText } = render(PreviewTag, { props: { text: 'Early preview' } });
		expect(getByText('Early preview')).toBeInTheDocument();
	});
});
