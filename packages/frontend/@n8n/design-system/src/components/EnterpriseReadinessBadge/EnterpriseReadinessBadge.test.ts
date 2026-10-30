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
			await findAllByText("Some enterprise capabilities don't cover this feature yet."),
		).not.toHaveLength(0);
	});

	it('links the tooltip to the feature docs', async () => {
		const { findByRole } = render(EnterpriseReadinessBadge, {
			props: { docsUrl: 'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant' },
		});

		await userEvent.tab();

		const link = await findByRole('link', { name: 'Learn more' });
		expect(link).toHaveAttribute(
			'href',
			'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant',
		);
		expect(link.closest('p')).toHaveTextContent(
			"Some enterprise capabilities don't cover this feature yet. Learn more",
		);
	});
});
