import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';

import { STORES } from '@n8n/stores';
import CollaborationPane from './CollaborationPane.vue';
import type { IUser } from '@n8n/rest-api-client/api/users';

import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';
import { waitAllPromises } from '@/__tests__/utils';

const OWNER_USER = mock<IUser>({ id: 'owner-id' });
const MEMBER_USER = mock<IUser>({ id: 'member-id' });
const MEMBER_USER_2 = mock<IUser>({ id: 'member-id-2' });

const initialState = {
	[STORES.USERS]: {
		currentUserId: OWNER_USER.id,
		usersById: {
			[OWNER_USER.id]: OWNER_USER,
			[MEMBER_USER.id]: MEMBER_USER,
			[MEMBER_USER_2.id]: MEMBER_USER_2,
		},
	},
	[STORES.COLLABORATION]: {
		collaborators: [{ user: MEMBER_USER }, { user: OWNER_USER }],
	},
};

const defaultRenderOptions: RenderOptions<typeof CollaborationPane> = {
	pinia: createTestingPinia({ initialState }),
};

const renderComponent = createComponentRenderer(CollaborationPane, defaultRenderOptions);

describe('CollaborationPane', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should show only current workflow users', async () => {
		const { getByTestId, queryByTestId } = renderComponent();
		await waitAllPromises();

		expect(getByTestId('collaboration-pane')).toBeInTheDocument();
		expect(getByTestId('user-stack-avatars')).toBeInTheDocument();
		expect(getByTestId(`user-stack-avatar-${OWNER_USER.id}`)).toBeInTheDocument();
		expect(getByTestId(`user-stack-avatar-${MEMBER_USER.id}`)).toBeInTheDocument();
		expect(queryByTestId(`user-stack-avatar-${MEMBER_USER_2.id}`)).toBeNull();
	});

	it('should always render the current user first in the list', async () => {
		const { getByTestId } = renderComponent();
		await waitAllPromises();

		const firstAvatar = getByTestId('user-stack-avatars').querySelector('.n8n-avatar');
		// Owner is second in the store but should be rendered first
		expect(firstAvatar).toHaveAttribute('data-test-id', `user-stack-avatar-${OWNER_USER.id}`);
	});

	it('should not render the user-stack if there is only one user', async () => {
		const { getByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: {
					...initialState,
					[STORES.COLLABORATION]: {
						collaborators: [{ user: OWNER_USER }],
					},
				},
			}),
		});
		await waitAllPromises();

		const collaborationPane = getByTestId('collaboration-pane');
		expect(collaborationPane).toBeInTheDocument();
		expect(collaborationPane.querySelector('[data-test-id=user-stack-avatars]')).toBeNull();
	});
});
