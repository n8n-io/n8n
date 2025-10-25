import { mockNode } from '@/__tests__/mocks';
import { renderComponent } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useInstallNode } from '@/features/settings/communityNodes/composables/useInstallNode';
import { type NodeTypesByTypeNameAndVersion } from '@/Interface';
import { useNDVStore } from '@/features/ndv/ndv.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import type { CommunityNodeType } from '@n8n/api-types';
import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { vi, type MockedFunction } from 'vitest';
import { ref } from 'vue';
import NodeSettingsInvalidNodeWarning from './NodeSettingsInvalidNodeWarning.vue';

vi.mock('@/features/settings/communityNodes/composables/useInstallNode');
vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: vi.fn(),
	}),
}));

const mockInstallNode = vi.fn();
const mockUseInstallNode = useInstallNode as MockedFunction<typeof useInstallNode>;

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
	value: mockWindowOpen,
	writable: true,
});

describe('NodeSettingsInvalidNodeWarning', () => {
	let pinia: TestingPinia;
	let mockUseUsersStore: MockedStore<typeof useUsersStore>;
	let mockUseNodeCreatorStore: MockedStore<typeof useNodeCreatorStore>;
	let mockUseNodeTypesStore: MockedStore<typeof useNodeTypesStore>;
	let mockUseNDVStore: MockedStore<typeof useNDVStore>;
	let mockUseUIStore: MockedStore<typeof useUIStore>;
	beforeEach(() => {
		vi.clearAllMocks();
		pinia = createTestingPinia();
		mockUseUsersStore = mockedStore(useUsersStore);
		mockUseNodeCreatorStore = mockedStore(useNodeCreatorStore);
		mockUseNodeTypesStore = mockedStore(useNodeTypesStore);
		mockUseNDVStore = mockedStore(useNDVStore);
		mockUseUIStore = mockedStore(useUIStore);
		mockUseInstallNode.mockReturnValue({
			installNode: mockInstallNode,
			loading: ref(false),
		});
	});

	describe('Owner permissions', () => {
		it('should show install button when user is owner', async () => {
			mockUseUsersStore.isInstanceOwner = true;
			const node = mockNode({ name: 'Test Node', type: 'n8n-nodes-test.testNode' });
			const { getByTestId } = renderComponent(NodeSettingsInvalidNodeWarning, {
				props: {
					node,
				},
				pinia,
			});

			expect(getByTestId('install-community-node-button')).toBeInTheDocument();
		});

		it('should show ContactAdministratorToInstall when user is not owner', async () => {
			mockUseUsersStore.isInstanceOwner = false;
			const node = mockNode({ name: 'Test Node', type: 'n8n-nodes-test.testNode' });
			const { getByText } = renderComponent(NodeSettingsInvalidNodeWarning, {
				props: {
					node,
				},
				pinia,
			});

			expect(
				getByText(/Please contact an administrator to install this community node/),
			).toBeInTheDocument();
		});
	});

	describe('View Details button', () => {
		it('should open node creator when node is verified community node', async () => {
			mockUseUsersStore.isInstanceOwner = true;
			mockUseNodeTypesStore.communityNodeType = () =>
				({
					isOfficialNode: true,
				}) as CommunityNodeType;
			const node = mockNode({ name: 'Test Node', type: 'n8n-nodes-test.testNode' });
			const mockOpenNodeCreatorWithNode = vi.fn();
			mockUseNodeCreatorStore.openNodeCreatorWithNode = mockOpenNodeCreatorWithNode;

			const { getByRole } = renderComponent(NodeSettingsInvalidNodeWarning, {
				props: {
					node,
				},
				pinia,
			});

			const viewDetailsButton = getByRole('button', { name: 'View details' });
			viewDetailsButton.click();

			expect(mockOpenNodeCreatorWithNode).toHaveBeenCalledWith('Test Node');
		});

		it('should open NPM page when node is not verified community node', async () => {
			mockUseUsersStore.isInstanceOwner = true;
			mockUseNodeTypesStore.communityNodeType = () =>
				({
					isOfficialNode: false,
				}) as CommunityNodeType;
			const node = mockNode({ name: 'Test Node', type: 'n8n-nodes-test.testNode' });

			const { getByTestId } = renderComponent(NodeSettingsInvalidNodeWarning, {
				props: {
					node,
				},
				pinia,
			});

			const viewDetailsButton = getByTestId('view-details-button');
			viewDetailsButton.click();

			expect(mockWindowOpen).toHaveBeenCalledWith(
				'https://www.npmjs.com/package/n8n-nodes-test',
				'_blank',
			);
		});
	});

	describe('Install button logic', () => {
		it('should call installNode directly for verified community node', async () => {
			mockUseUsersStore.isInstanceOwner = true;
			mockUseNodeTypesStore.communityNodeType = () =>
				({
					isOfficialNode: true,
				}) as CommunityNodeType;
			const node = mockNode({ name: 'Test Node', type: 'n8n-nodes-test.testNode' });
			mockInstallNode.mockResolvedValue({ success: true });

			const { getByTestId } = renderComponent(NodeSettingsInvalidNodeWarning, {
				props: {
					node,
				},
				pinia,
			});

			const installButton = getByTestId('install-community-node-button');
			installButton.click();

			expect(mockInstallNode).toHaveBeenCalledWith({
				type: 'verified',
				packageName: 'n8n-nodes-test',
				nodeType: 'n8n-nodes-test.testNode',
			});
		});

		it('should call installNode without preview token directly for verified community node', async () => {
			mockUseUsersStore.isInstanceOwner = true;
			mockUseNodeTypesStore.communityNodeType = () =>
				({
					isOfficialNode: true,
				}) as CommunityNodeType;
			const node = mockNode({ name: 'Test Node', type: 'n8n-nodes-test-preview.testNode' });
			mockInstallNode.mockResolvedValue({ success: true });

			const { getByTestId } = renderComponent(NodeSettingsInvalidNodeWarning, {
				props: {
					node,
				},
				pinia,
			});

			const installButton = getByTestId('install-community-node-button');
			installButton.click();

			expect(mockInstallNode).toHaveBeenCalledWith({
				type: 'verified',
				packageName: 'n8n-nodes-test',
				nodeType: 'n8n-nodes-test-preview.testNode',
			});
		});

		it('should open modal for non-verified community node', async () => {
			mockUseUsersStore.isInstanceOwner = true;
			mockUseNodeTypesStore.communityNodeType = () =>
				({
					isOfficialNode: false,
				}) as CommunityNodeType;
			const node = mockNode({ name: 'Test Node', type: 'n8n-nodes-test.testNode' });
			const mockOpenModalWithData = vi.fn();
			mockUseUIStore.openModalWithData = mockOpenModalWithData;

			const { getByTestId } = renderComponent(NodeSettingsInvalidNodeWarning, {
				props: {
					node,
				},
				pinia,
			});

			const installButton = getByTestId('install-community-node-button');
			installButton.click();

			expect(mockOpenModalWithData).toHaveBeenCalledWith({
				name: 'communityPackageInstall',
				data: {
					packageName: 'n8n-nodes-test',
					disableInput: true,
					hideSuggestion: true,
					nodeType: 'n8n-nodes-test.testNode',
				},
			});
		});
	});

	describe('Node installation watcher', () => {
		it('should call unsetActiveNodeName when node is defined', async () => {
			mockUseUsersStore.isInstanceOwner = true;
			mockUseNodeTypesStore.communityNodeType = () =>
				({
					isOfficialNode: true,
				}) as CommunityNodeType;
			const node = mockNode({ name: 'Test Node', type: 'n8n-nodes-test.testNode' });
			const mockUnsetActiveNodeName = vi.fn();
			mockUseNDVStore.unsetActiveNodeName = mockUnsetActiveNodeName;

			const { rerender } = renderComponent(NodeSettingsInvalidNodeWarning, {
				props: {
					node,
				},
				pinia,
			});

			mockUseNodeTypesStore.nodeTypes = {
				'n8n-nodes-test.testNode': {
					description: {
						name: 'Test Node',
					},
				},
			} as unknown as NodeTypesByTypeNameAndVersion;

			await rerender({ node });

			await waitFor(() => {
				expect(mockUnsetActiveNodeName).toHaveBeenCalled();
			});
		});

		it('should not call unsetActiveNodeName when node is not defined', () => {
			mockUseUsersStore.isInstanceOwner = true;
			mockUseNodeTypesStore.communityNodeType = () =>
				({
					isOfficialNode: true,
				}) as CommunityNodeType;
			const node = mockNode({ name: 'Test Node', type: 'n8n-nodes-test.testNode' });
			const mockUnsetActiveNodeName = vi.fn();
			mockUseNDVStore.unsetActiveNodeName = mockUnsetActiveNodeName;

			renderComponent(NodeSettingsInvalidNodeWarning, {
				props: {
					node,
				},
				pinia,
			});

			expect(mockUnsetActiveNodeName).not.toHaveBeenCalled();
		});
	});

	describe('Non-community nodes', () => {
		it('should show custom node documentation link for non-community nodes', () => {
			mockUseUsersStore.isInstanceOwner = true;
			const node = mockNode({ name: 'Custom Node', type: 'custom-node' });

			const { getByText } = renderComponent(NodeSettingsInvalidNodeWarning, {
				props: {
					node,
				},
				pinia,
			});

			expect(getByText('custom node')).toBeInTheDocument();
		});
	});
});
