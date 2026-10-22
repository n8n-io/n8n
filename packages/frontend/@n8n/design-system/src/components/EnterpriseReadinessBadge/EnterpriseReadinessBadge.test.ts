import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import EnterpriseReadinessBadge from './EnterpriseReadinessBadge.vue';

describe('EnterpriseReadinessBadge', () => {
	it('renders the limited enterprise support label', () => {
		const { getByText } = render(EnterpriseReadinessBadge);
		expect(getByText('Limited enterprise support')).toBeInTheDocument();
	});

	it('renders xxsmall badge correctly', () => {
		const { container } = render(EnterpriseReadinessBadge, { props: { size: 'xxsmall' } });
		expect(container).toMatchSnapshot();
	});

	it('renders xsmall badge correctly', () => {
		const { container } = render(EnterpriseReadinessBadge, { props: { size: 'xsmall' } });
		expect(container).toMatchSnapshot();
	});

	it('shows the tooltip on keyboard focus', async () => {
		const { getByText, findAllByText } = render(EnterpriseReadinessBadge);

		await userEvent.tab();
		expect(getByText('Limited enterprise support').closest('.n8n-badge')).toHaveFocus();

		expect(
			await findAllByText(
				"Some enterprise capabilities don't cover this feature yet. See docs for details.",
			),
		).not.toHaveLength(0);
	});
});
