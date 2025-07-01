import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ROLE, type UsersList } from '@n8n/api-types';
import { type UserAction } from '@n8n/design-system';
import SettingsUsersActionsCell from '@/components/SettingsUsers/SettingsUsersActionsCell.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { IUser } from '@/Interface';

// Mock N8nActionToggle
vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nActionToggle: {
			name: 'N8nActionToggle',
			props: {
				actions: { type: Array, required: true },
			},
			emits: ['action'],
			template: `
        <div>
          <button
            v-for="action in actions"
            :key="action.value"
            :data-test-id="'action-' + action.value"
            @click="$emit('action', action.value)">
            {{ action.label }}
          </button>
        </div>
      `,
		},
	};
});

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
	{ value: 'delete', label: 'Delete' },
	{ value: 'reinvite', label: 'Reinvite' },
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

		expect(screen.getByTestId('action-delete')).toBeInTheDocument();
		expect(screen.getByTestId('action-reinvite')).toBeInTheDocument();
	});

	it('should emit "action" with correct payload when an action is clicked', async () => {
		const props = { data: baseUser, actions: mockActions };
		const { emitted } = renderComponent({ props });
		const user = userEvent.setup();

		await user.click(screen.getByTestId('action-delete'));

		expect(emitted()).toHaveProperty('action');
		expect(emitted().action[0]).toEqual([{ action: 'delete', userId: '1' }]);
	});
});
