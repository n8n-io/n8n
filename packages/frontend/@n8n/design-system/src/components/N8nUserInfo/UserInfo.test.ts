import N8nUserInfo from '.';
import { createComponentRenderer } from '../../__tests__/render';

const renderComponent = createComponentRenderer(N8nUserInfo);

describe('UserInfo.vue', () => {
	it('renders correctly for a pending user', () => {
		const { getByText, queryByText, queryByTestId } = renderComponent({
			props: {
				isPendingUser: true,
				email: 'email@example.com',
				firstName: 'John',
				lastName: 'Doe',
			},
		});

		expect(queryByText('John Doe')).not.toBeInTheDocument();
		expect(queryByTestId('user-email')).not.toBeInTheDocument(); // Regular email element is not shown

		expect(getByText('email@example.com')).toBeInTheDocument();
		expect(getByText('Pending')).toBeInTheDocument();
	});

	it('shows the avatar by default', () => {
		const { getByTestId } = renderComponent({
			props: { firstName: 'John', lastName: 'Doe', email: 'email@example.com' },
		});

		expect(getByTestId('user-avatar')).toBeInTheDocument();
	});

	it('hides the avatar when hideAvatar is set', () => {
		const { getByText, queryByTestId } = renderComponent({
			props: {
				firstName: 'John',
				lastName: 'Doe',
				email: 'email@example.com',
				hideAvatar: true,
			},
		});

		expect(queryByTestId('user-avatar')).not.toBeInTheDocument();
		expect(getByText('John Doe')).toBeInTheDocument();
		expect(getByText('email@example.com')).toBeInTheDocument();
	});
});
