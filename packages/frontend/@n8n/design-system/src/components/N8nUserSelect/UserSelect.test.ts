import { fireEvent, render, waitFor } from '@testing-library/vue';

import N8nUserSelect from '.';
import N8nAvatar from '../N8nAvatar';
import N8nUserInfo from '../N8nUserInfo';

describe('UserSelect', () => {
	it('should render user select with all users (even pending ones)', async () => {
		const { getByRole } = render(N8nUserSelect, {
			attrs: {
				id: 'user-select',
			},
			props: {
				users: [
					{
						id: '1',
						firstName: 'Sunny',
						lastName: 'Side',
						fullName: 'Sunny Side',
						email: 'hello@n8n.io',
						isPendingUser: false,
						isOwner: true,
						signInType: 'email',
						disabled: false,
					},
					{
						id: '2',
						firstName: 'Kobi',
						lastName: 'Dog',
						fullName: 'Kobi Dog',
						email: 'kobi@n8n.io',
						isPendingUser: true,
						isOwner: false,
						signInType: 'ldap',
						disabled: true,
					},
				],
			},
			global: {
				components: {
					'n8n-avatar': N8nAvatar,
					'n8n-user-info': N8nUserInfo,
				},
			},
		});

		// ACT
		const selectInput = getByRole('combobox'); // Find the select input
		expect(selectInput).toBeInTheDocument();

		// Simulate clicking the select input to open the dropdown
		await fireEvent.click(selectInput);

		// ASSERT
		// Wait for the dropdown to appear in the DOM
		const dropdown = await waitFor(() => document.body.querySelector('[role="listbox"]'));
		expect(dropdown).toBeInTheDocument();
		const options = dropdown!.querySelectorAll('.el-select-dropdown__item');
		expect(options).toHaveLength(2);
	});
});
