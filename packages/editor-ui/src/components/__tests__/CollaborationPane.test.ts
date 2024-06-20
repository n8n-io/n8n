import { merge } from 'lodash-es';
import { SETTINGS_STORE_DEFAULT_STATE, waitAllPromises } from '@/__tests__/utils';
import { ROLE, STORES } from '@/constants';
import { createTestingPinia } from '@pinia/testing';
import { useUIStore } from '@/stores/ui.store';
import CollaborationPane from '@/components//MainHeader/CollaborationPane.vue';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';

const OWNER_USER = {
	createdAt: '2023-11-22T10:17:12.246Z',
	id: 'aaaaaa',
	email: 'owner@user.com',
	firstName: 'Owner',
	lastName: 'User',
	role: ROLE.Owner,
	disabled: false,
	isPending: false,
	fullName: 'Owner User',
};

const MEMBER_USER = {
	createdAt: '2023-11-22T10:17:12.246Z',
	id: 'aaabbb',
	email: 'member@user.com',
	firstName: 'Member',
	lastName: 'User',
	role: ROLE.Member,
	disabled: false,
	isPending: false,
	fullName: 'Member User',
};

const MEMBER_USER_2 = {
	createdAt: '2023-11-22T10:17:12.246Z',
	id: 'aaaccc',
	email: 'member2@user.com',
	firstName: 'Another Member',
	lastName: 'User',
	role: ROLE.Member,
	disabled: false,
	isPending: false,
	fullName: 'Another Member User',
};

let uiStore: ReturnType<typeof useUIStore>;

const initialState = {
	[STORES.SETTINGS]: {
		settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
	},
	[STORES.WORKFLOWS]: {
		workflow: {
			id: 'w1',
		},
	},
	[STORES.USERS]: {
		currentUserId: 'aaaaaa',
		users: {
			aaaaaa: OWNER_USER,
			aaabbb: MEMBER_USER,
			aaaccc: MEMBER_USER_2,
		},
	},
	[STORES.COLLABORATION]: {
		usersForWorkflows: {
			w1: [
				{ lastSeen: '2023-11-22T10:17:12.246Z', user: MEMBER_USER },
				{ lastSeen: '2023-11-22T10:17:12.246Z', user: OWNER_USER },
			],
			w2: [{ lastSeen: '2023-11-22T10:17:12.246Z', user: MEMBER_USER_2 }],
		},
	},
};

const defaultRenderOptions: RenderOptions = {
	pinia: createTestingPinia({ initialState }),
};

const renderComponent = createComponentRenderer(CollaborationPane, defaultRenderOptions);

describe('CollaborationPane', () => {
	beforeEach(() => {
		uiStore = useUIStore();
	});

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

	it('should render current user correctly', async () => {
		const { getByText, queryByText } = renderComponent();
		await waitAllPromises();
		expect(getByText(`${OWNER_USER.fullName} (you)`)).toBeInTheDocument();
		expect(queryByText(`${MEMBER_USER.fullName} (you)`)).toBeNull();
		expect(queryByText(`${MEMBER_USER.fullName}`)).toBeInTheDocument();
	});

	it('should always render owner first in the list', async () => {
		const { getByTestId } = renderComponent();
		await waitAllPromises();
		const firstAvatar = getByTestId('user-stack-avatars').querySelector('.n8n-avatar');
		// Owner is second in the store bur shourld be rendered first
		expect(firstAvatar).toHaveAttribute('data-test-id', `user-stack-avatar-${OWNER_USER.id}`);
	});
});
