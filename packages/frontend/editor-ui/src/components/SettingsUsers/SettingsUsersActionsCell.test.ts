import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ROLE, type UsersList } from '@n8n/api-types';
import { type UserAction } from '@n8n/design-system';
import SettingsUsersActionsCell from '@/components/SettingsUsers/SettingsUsersActionsCell.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { IUser } from '@n8n/rest-api-client/api/users';

const baseUser: UsersList['items'][number] = {
	id: '1',
	email: 'member@example.com',
	firstName: 'Member',
	lastName: 'User',
	role: ROLE.Member,
	isOwner: false,
	isPending: false,
	mfaEnabled: false,
	settings: {},
};

const mockActions: Array<UserAction<IUser>> = [
	{ value: 'copyInviteLink', label: 'Copy invite link' },
	{ value: 'copyPasswordResetLink', label: 'Copy password reset link' },
];

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('SettingsUsersActionsCell', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(SettingsUsersActionsCell, {
			pinia: createTestingPinia(),
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should not render action toggle for an owner', () => {
		const props = { data: { ...baseUser, isOwner: true }, actions: mockActions };
		const { container } = renderComponent({ props });
		expect(container.firstChild).toBeEmptyDOMElement();
	});

	it('should not render action toggle if there are no actions', () => {
		const props = { data: baseUser, actions: [] };
		const { container } = renderComponent({ props });
		expect(container.firstChild).toBeEmptyDOMElement();
	});

	it('should render the action toggle with provided actions', () => {
		const props = { data: baseUser, actions: mockActions };
		renderComponent({ props });

		expect(screen.getByTestId('action-copyInviteLink')).toBeInTheDocument();
		expect(screen.getByTestId('action-copyPasswordResetLink')).toBeInTheDocument();
	});

	it('should emit "action" with correct payload when an action is clicked', async () => {
		const props = { data: baseUser, actions: mockActions };
		const { emitted } = renderComponent({ props });
		const user = userEvent.setup();

		await user.click(screen.getByTestId('action-copyInviteLink'));

		expect(emitted()).toHaveProperty('action');
		expect(emitted().action[0]).toEqual([{ action: 'copyInviteLink', userId: '1' }]);
	});
});
