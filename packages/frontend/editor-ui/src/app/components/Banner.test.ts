import userEvent from '@testing-library/user-event';

import { renderComponent } from '@/__tests__/render';

import Banner from './Banner.vue';

describe('Banner', () => {
	it('renders the message without an element-plus tag', () => {
		const { getByText, container } = renderComponent(Banner, {
			props: { theme: 'success', message: 'Connected' },
		});

		expect(getByText('Connected')).toBeInTheDocument();
		expect(container.querySelector('.el-tag')).not.toBeInTheDocument();
		expect(container.firstElementChild?.className).toContain('success');
	});

	it('shows the details after the more-details link is clicked', async () => {
		const { getByText, queryByText, container } = renderComponent(Banner, {
			props: { theme: 'danger', message: 'Could not connect', details: 'Timeout' },
		});

		expect(queryByText('Timeout')).not.toBeInTheDocument();
		expect(container.firstElementChild?.className).toContain('danger');

		await userEvent.click(getByText('More details'));

		expect(getByText('Timeout')).toBeInTheDocument();
	});

	it('emits click when the action button is pressed', async () => {
		const { getByRole, emitted } = renderComponent(Banner, {
			props: { theme: 'warning', message: 'Account is not connected', buttonLabel: 'Connect' },
		});

		await userEvent.click(getByRole('button', { name: 'Connect' }));

		expect(emitted().click).toHaveLength(1);
	});
});
