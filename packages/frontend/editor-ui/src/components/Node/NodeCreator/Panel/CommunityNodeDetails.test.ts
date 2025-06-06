import { createComponentRenderer } from '@/__tests__/render';
import { type TestingPinia, createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import CommunityNodeDetails from './CommunityNodeDetails.vue';
import { waitFor } from '@testing-library/vue';
import { userEvent } from '@testing-library/user-event';

const fetchCredentialTypes = vi.fn();
const getCommunityNodeAttributes = vi.fn(() => ({ npmVersion: '1.0.0' }));
const getNodeTypes = vi.fn();
const installPackage = vi.fn();
const getAllNodeCreateElements = vi.fn(() => [
	{
		key: 'n8n-nodes-test.OtherNode',
		properties: {
			defaults: {
				name: 'OtherNode',
			},
			description: 'Other node description',
			displayName: 'Other Node',
			group: ['transform'],
			name: 'n8n-nodes-test.OtherNode',
			outputs: ['main'],
		},
		subcategory: '*',
		type: 'node',
		uuid: 'n8n-nodes-test.OtherNode-32f238f0-2b05-47ce-b43d-7fab6d7ba3cb',
	},
]);

const popViewStack = vi.fn();
const pushViewStack = vi.fn();
const updateCurrentViewStack = vi.fn();

const showError = vi.fn();

const removeNodeFromMergedNodes = vi.fn();

const usersStore = {
	isInstanceOwner: true,
};

vi.mock('@/stores/credentials.store', () => ({
	useCredentialsStore: vi.fn(() => ({
		fetchCredentialTypes,
	})),
}));

vi.mock('@/stores/nodeCreator.store', () => ({
	useNodeCreatorStore: vi.fn(() => ({
		actions: [],
		removeNodeFromMergedNodes,
	})),
}));

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getCommunityNodeAttributes,
		getNodeTypes,
		communityNodeType: vi.fn(() => ({ isOfficialNode: true })),
	})),
}));

vi.mock('@/stores/communityNodes.store', () => ({
	useCommunityNodesStore: vi.fn(() => ({
		installPackage,
	})),
}));

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn(() => usersStore),
}));

vi.mock('@/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showMessage: vi.fn(),
		showError,
	})),
}));

vi.mock('../composables/useViewStacks', () => ({
	useViewStacks: vi.fn(() => ({
		activeViewStack: {
			communityNodeDetails: {
				description: 'Other node description',
				installed: false,
				key: 'n8n-nodes-preview-test.OtherNode',
				nodeIcon: undefined,
				packageName: 'n8n-nodes-test',
				title: 'Other Node',
			},
			hasSearch: false,
			items: [
				{
					key: 'n8n-nodes-preview-test.OtherNode',
					properties: {
						defaults: {
							name: 'OtherNode',
						},
						description: 'Other node description',
						displayName: 'Other Node',
						group: ['transform'],
						name: 'n8n-nodes-preview-test.OtherNode',
						outputs: ['main'],
					},
					subcategory: '*',
					type: 'node',
					uuid: 'n8n-nodes-preview-test.OtherNode-32f238f0-2b05-47ce-b43d-7fab6d7ba3cb',
				},
			],
			mode: 'community-node',
			rootView: undefined,
			subcategory: 'Other Node',
			title: 'Node details',
		},
		pushViewStack,
		popViewStack,
		updateCurrentViewStack,
		getAllNodeCreateElements,
	})),
}));

describe('CommunityNodeDetails', () => {
	const renderComponent = createComponentRenderer(CommunityNodeDetails);
	let pinia: TestingPinia;

	beforeEach(() => {
		pinia = createTestingPinia();
		setActivePinia(pinia);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should render correctly and install node', async () => {
		const wrapper = renderComponent({ pinia });

		const installButton = wrapper.getByTestId('install-community-node-button');

		expect(wrapper.container.querySelector('.title span')?.textContent).toEqual('Other Node');
		expect(installButton.querySelector('span')?.textContent).toEqual('Install node');

		await userEvent.click(installButton);

		await waitFor(() => expect(removeNodeFromMergedNodes).toHaveBeenCalled());

		expect(getCommunityNodeAttributes).toHaveBeenCalledWith('n8n-nodes-preview-test.OtherNode');
		expect(installPackage).toHaveBeenCalledWith('n8n-nodes-test', true, '1.0.0');
		expect(fetchCredentialTypes).toHaveBeenCalledWith(true);
		expect(getAllNodeCreateElements).toHaveBeenCalled();
		expect(popViewStack).toHaveBeenCalled();
		expect(updateCurrentViewStack).toHaveBeenCalled();
		expect(pushViewStack).toHaveBeenCalledWith(
			{
				communityNodeDetails: {
					description: 'Other node description',
					installed: true,
					key: 'n8n-nodes-test.OtherNode',
					nodeIcon: undefined,
					packageName: 'n8n-nodes-test',
					title: 'Other Node',
					official: true,
				},
				hasSearch: false,
				items: [
					{
						key: 'n8n-nodes-test.OtherNode',
						properties: {
							defaults: {
								name: 'OtherNode',
							},
							description: 'Other node description',
							displayName: 'Other Node',
							group: ['transform'],
							name: 'n8n-nodes-test.OtherNode',
							outputs: ['main'],
						},
						subcategory: '*',
						type: 'node',
						uuid: 'n8n-nodes-test.OtherNode-32f238f0-2b05-47ce-b43d-7fab6d7ba3cb',
					},
				],
				mode: 'community-node',
				rootView: undefined,
				subcategory: 'Other Node',
				title: 'Node details',
			},
			{
				transitionDirection: 'none',
			},
		);
		expect(removeNodeFromMergedNodes).toHaveBeenCalled();
	});

	it('should handle errors during node installation', async () => {
		installPackage.mockImplementation(() => {
			throw new Error('Installation failed');
		});

		const wrapper = renderComponent({ pinia });

		const installButton = wrapper.getByTestId('install-community-node-button');

		await userEvent.click(installButton);

		expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Error installing new package');
		expect(pushViewStack).not.toHaveBeenCalled();
		expect(popViewStack).not.toHaveBeenCalled();
	});

	it('should not render install button if not instance owner', async () => {
		usersStore.isInstanceOwner = false;

		const wrapper = renderComponent({ pinia });

		expect(wrapper.queryByTestId('install-community-node-button')).not.toBeInTheDocument();
	});
});
