import { removePreviewToken } from '@/components/Node/NodeCreator/utils';
import type { IWorkflowDb } from '@/Interface';
import { useCommunityNodesStore } from '../communityNodes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUsersStore } from '@/features/users/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { CommunityNodeType } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import type { INode } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useInstallNode } from './useInstallNode';
import { useToast } from '@/composables/useToast';

vi.mock('@/composables/useCanvasOperations', () => ({
	useCanvasOperations: vi.fn().mockReturnValue({
		initializeUnknownNodes: vi.fn(),
	}),
}));

vi.mock('@/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showError: vi.fn(),
		showMessage: vi.fn(),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	i18n: {
		baseText: vi.fn((key: string) => key),
	},
	useI18n: vi.fn(() => ({
		baseText: vi.fn((key: string) => key),
	})),
}));

vi.mock('@/components/Node/NodeCreator/utils', () => ({
	removePreviewToken: vi.fn((key: string) => key.replace('preview:', '')),
}));

let workflowsStore: ReturnType<typeof useWorkflowsStore>;
let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
let communityNodesStore: ReturnType<typeof useCommunityNodesStore>;
let credentialsStore: ReturnType<typeof useCredentialsStore>;
let usersStore: ReturnType<typeof useUsersStore>;
let toast: ReturnType<typeof useToast>;
let canvasOperations: ReturnType<typeof useCanvasOperations>;

const initializeUnknownNodes = vi.fn();
const showError = vi.fn();
const showMessage = vi.fn();

beforeEach(() => {
	const pinia = createTestingPinia();
	setActivePinia(pinia);

	nodeTypesStore = useNodeTypesStore(pinia);
	communityNodesStore = useCommunityNodesStore(pinia);
	credentialsStore = useCredentialsStore(pinia);
	workflowsStore = useWorkflowsStore(pinia);
	usersStore = useUsersStore(pinia);

	canvasOperations = {
		initializeUnknownNodes,
	} as unknown as ReturnType<typeof useCanvasOperations>;

	vi.mocked(useCanvasOperations).mockReturnValue(canvasOperations);

	toast = {
		showError,
		showMessage,
	} as unknown as ReturnType<typeof useToast>;

	vi.mocked(useToast).mockReturnValue(toast);

	Object.defineProperty(usersStore, 'isInstanceOwner', {
		value: true,
		writable: true,
	});

	vi.mocked(communityNodesStore.installPackage).mockResolvedValue(undefined);
	vi.mocked(nodeTypesStore.getNodeTypes).mockResolvedValue(undefined);
	vi.mocked(credentialsStore.fetchCredentialTypes).mockResolvedValue(undefined);
	vi.mocked(nodeTypesStore.getCommunityNodeAttributes).mockResolvedValue({
		npmVersion: '1.0.0',
		authorGithubUrl: 'https://github.com/test',
		authorName: 'Test Author',
		checksum: 'test-checksum',
		description: 'Test description',
		documentationUrl: 'https://docs.test.com',
		icon: 'test-icon',
		iconUrl: 'https://icon.test.com',
		id: 'test-id',
		license: 'MIT',
		name: 'Test Node',
		packageName: 'test-package',
		version: '1.0.0',
	} as unknown as CommunityNodeType);

	workflowsStore.workflow = {
		id: 'test-workflow',
		name: 'Test Workflow',
		active: false,
		isArchived: false,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		nodes: [],
		connections: {},
		settings: {},
		staticData: {},
		tags: [],
		triggerCount: 0,
		versionId: '1',
	} as unknown as IWorkflowDb;

	vi.clearAllMocks();
});

describe('useInstallNode', () => {
	describe('installNode', () => {
		it('should return error when user is not an owner', async () => {
			Object.defineProperty(usersStore, 'isInstanceOwner', {
				value: false,
				writable: true,
			});
			const { installNode } = useInstallNode();

			const result = await installNode({
				type: 'verified',
				packageName: 'test-package',
				nodeType: 'test-node',
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(Error);
			expect(result.error?.message).toBe('User is not an owner');
			expect(showError).toHaveBeenCalledWith(
				expect.any(Error),
				'settings.communityNodes.messages.install.error',
			);
		});

		it('should install verified node with npm version', async () => {
			const { installNode } = useInstallNode();

			const result = await installNode({
				type: 'verified',
				packageName: 'test-package',
				nodeType: 'test-node',
			});

			expect(result.success).toBe(true);
			expect(communityNodesStore.installPackage).toHaveBeenCalledWith(
				'test-package',
				true,
				'1.0.0',
			);
			expect(nodeTypesStore.getNodeTypes).toHaveBeenCalled();
			expect(credentialsStore.fetchCredentialTypes).toHaveBeenCalledWith(true);
			expect(showMessage).toHaveBeenCalledWith({
				title: 'settings.communityNodes.messages.install.success',
				type: 'success',
			});
		});

		it('should install unverified node without npm version', async () => {
			const { installNode } = useInstallNode();

			const result = await installNode({
				type: 'unverified',
				packageName: 'test-package',
			});

			expect(result.success).toBe(true);
			expect(communityNodesStore.installPackage).toHaveBeenCalledWith('test-package');
			expect(nodeTypesStore.getNodeTypes).toHaveBeenCalled();
			expect(credentialsStore.fetchCredentialTypes).toHaveBeenCalledWith(true);
		});

		it('should initialize unknown nodes when nodeType is provided and workflow has nodes', async () => {
			const mockNodes = [
				{
					id: 'node-1',
					type: 'test-node',
					name: 'Node 1',
					typeVersion: 1,
					position: [100, 100] as [number, number],
					parameters: {},
				},
				{
					id: 'node-2',
					type: 'other-node',
					name: 'Node 2',
					typeVersion: 1,
					position: [200, 200] as [number, number],
					parameters: {},
				},
			];
			workflowsStore.workflow.nodes = mockNodes as INode[];

			const { installNode } = useInstallNode();

			await installNode({
				type: 'verified',
				packageName: 'test-package',
				nodeType: 'preview:test-node',
			});

			expect(removePreviewToken).toHaveBeenCalledWith('preview:test-node');
			expect(initializeUnknownNodes).toHaveBeenCalledWith([
				{
					id: 'node-1',
					type: 'test-node',
					name: 'Node 1',
					typeVersion: 1,
					position: [100, 100] as [number, number],
					parameters: {},
				},
			]);
		});

		it('should not initialize nodes when nodeType is not provided', async () => {
			workflowsStore.workflow.nodes = [
				{
					id: 'node-1',
					type: 'test-node',
					name: 'Node 1',
					typeVersion: 1,
					position: [100, 100] as [number, number],
					parameters: {},
				},
			] as INode[];

			const { installNode } = useInstallNode();

			await installNode({
				type: 'unverified',
				packageName: 'test-package',
			});

			expect(initializeUnknownNodes).not.toHaveBeenCalled();
		});

		it('should not initialize nodes when workflow has no nodes', async () => {
			workflowsStore.workflow.nodes = [];

			const { installNode } = useInstallNode();

			await installNode({
				type: 'verified',
				packageName: 'test-package',
				nodeType: 'test-node',
			});

			expect(initializeUnknownNodes).not.toHaveBeenCalled();
		});

		it('should handle installation errors', async () => {
			const error = new Error('Installation failed');
			vi.mocked(communityNodesStore.installPackage).mockRejectedValue(error);

			const { installNode } = useInstallNode();

			const result = await installNode({
				type: 'verified',
				packageName: 'test-package',
				nodeType: 'test-node',
			});

			expect(result.success).toBe(false);
			expect(result.error).toBe(error);
			expect(showError).toHaveBeenCalledWith(
				error,
				'settings.communityNodes.messages.install.error',
			);
		});

		it('should handle getNpmVersion returning undefined', async () => {
			vi.mocked(nodeTypesStore.getCommunityNodeAttributes).mockResolvedValue(null);

			const { installNode } = useInstallNode();

			const result = await installNode({
				type: 'verified',
				packageName: 'test-package',
				nodeType: 'test-node',
			});

			expect(result.success).toBe(true);
			expect(communityNodesStore.installPackage).toHaveBeenCalledWith(
				'test-package',
				true,
				undefined,
			);
		});

		it('should handle getNpmVersion errors', async () => {
			const error = new Error('Failed to get npm version');
			vi.mocked(nodeTypesStore.getCommunityNodeAttributes).mockRejectedValue(error);

			const { installNode } = useInstallNode();

			const result = await installNode({
				type: 'verified',
				packageName: 'test-package',
				nodeType: 'test-node',
			});

			expect(result.success).toBe(false);
			expect(result.error).toBe(error);
		});
	});

	describe('loading state', () => {
		it('should set loading to true during installation', async () => {
			vi.mocked(communityNodesStore.installPackage).mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
			});

			const { installNode, loading } = useInstallNode();

			const installPromise = installNode({
				type: 'verified',
				packageName: 'test-package',
				nodeType: 'test-node',
			});

			expect(loading.value).toBe(true);
			await installPromise;
			expect(loading.value).toBe(false);
		});

		it('should set loading to false even when installation fails', async () => {
			vi.mocked(communityNodesStore.installPackage).mockRejectedValue(
				new Error('Installation failed'),
			);

			const { installNode, loading } = useInstallNode();

			await installNode({
				type: 'verified',
				packageName: 'test-package',
				nodeType: 'test-node',
			});

			expect(loading.value).toBe(false);
		});
	});

	describe('getNpmVersion', () => {
		it('should return npm version from community node attributes', async () => {
			const mockAttributes = {
				npmVersion: '2.0.0',
				authorGithubUrl: 'https://github.com/test',
				authorName: 'Test Author',
				checksum: 'test-checksum',
				description: 'Test description',
				documentationUrl: 'https://docs.test.com',
				icon: 'test-icon',
				iconUrl: 'https://icon.test.com',
				id: 'test-id',
				license: 'MIT',
				name: 'Test Node',
				packageName: 'test-package',
				version: '2.0.0',
			};
			vi.mocked(nodeTypesStore.getCommunityNodeAttributes).mockResolvedValue(
				mockAttributes as unknown as CommunityNodeType,
			);

			// We need to access the private getNpmVersion function through the composable
			// Since it's not exported, we'll test it indirectly through the installNode function
			const { installNode } = useInstallNode();

			await installNode({
				type: 'verified',
				packageName: 'test-package',
				nodeType: 'test-node',
			});

			expect(nodeTypesStore.getCommunityNodeAttributes).toHaveBeenCalledWith('test-node');
			expect(communityNodesStore.installPackage).toHaveBeenCalledWith(
				'test-package',
				true,
				'2.0.0',
			);
		});
	});

	describe('node filtering and initialization', () => {
		it('should filter nodes by exact type match after removing preview token', async () => {
			const mockNodes = [
				{
					id: 'node-1',
					type: 'preview:test-node',
					name: 'Node 1',
					typeVersion: 1,
					position: [100, 100] as [number, number],
					parameters: {},
				},
				{
					id: 'node-2',
					type: 'test-node',
					name: 'Node 2',
					typeVersion: 1,
					position: [200, 200] as [number, number],
					parameters: {},
				},
				{
					id: 'node-3',
					type: 'other-node',
					name: 'Node 3',
					typeVersion: 1,
					position: [300, 300] as [number, number],
					parameters: {},
				},
			];
			workflowsStore.workflow.nodes = mockNodes as INode[];

			vi.mocked(removePreviewToken).mockReturnValue('test-node');

			const { installNode } = useInstallNode();

			await installNode({
				type: 'verified',
				packageName: 'test-package',
				nodeType: 'preview:test-node',
			});

			expect(removePreviewToken).toHaveBeenCalledWith('preview:test-node');
			expect(initializeUnknownNodes).toHaveBeenCalledWith([
				{
					id: 'node-2',
					type: 'test-node',
					name: 'Node 2',
					typeVersion: 1,
					position: [200, 200] as [number, number],
					parameters: {},
				},
			]);
		});

		it('should handle multiple nodes of the same type', async () => {
			const mockNodes = [
				{
					id: 'node-1',
					type: 'test-node',
					name: 'Node 1',
					typeVersion: 1,
					position: [100, 100] as [number, number],
					parameters: {},
				},
				{
					id: 'node-2',
					type: 'test-node',
					name: 'Node 2',
					typeVersion: 1,
					position: [200, 200] as [number, number],
					parameters: {},
				},
				{
					id: 'node-3',
					type: 'other-node',
					name: 'Node 3',
					typeVersion: 1,
					position: [300, 300] as [number, number],
					parameters: {},
				},
			];
			workflowsStore.workflow.nodes = mockNodes as INode[];

			vi.mocked(removePreviewToken).mockReturnValue('test-node');

			const { installNode } = useInstallNode();

			await installNode({
				type: 'verified',
				packageName: 'test-package',
				nodeType: 'preview:test-node',
			});

			expect(initializeUnknownNodes).toHaveBeenCalledWith([
				{
					id: 'node-1',
					type: 'test-node',
					name: 'Node 1',
					typeVersion: 1,
					position: [100, 100] as [number, number],
					parameters: {},
				},
				{
					id: 'node-2',
					type: 'test-node',
					name: 'Node 2',
					typeVersion: 1,
					position: [200, 200] as [number, number],
					parameters: {},
				},
			]);
		});
	});
});
