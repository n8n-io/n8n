import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNodeCommands } from './useNodeCommands';
import { mockRestrictedNodeTypes } from '@n8n/frontend-module-type-availability-policies/__tests__/mocks';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { INodeTypeDescription } from 'n8n-workflow';
import { getResourcePermissions } from '@n8n/permissions';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { createTestNode } from '@/__tests__/mocks';
import type { CommandBarLocalSource, CommandBarSearchRequest } from '../types';

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

const mockAddNodes = vi.fn();
const mockSetNodeActive = vi.fn();

vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: () => ({
		addNodes: mockAddNodes,
		setNodeActive: mockSetNodeActive,
	}),
}));

vi.mock('@/features/workflows/canvas/canvas.eventBus', () => ({
	canvasEventBus: {
		emit: vi.fn(),
	},
}));

const mockGenerateMergedNodesAndActionsFn = vi.fn().mockReturnValue({ mergedNodes: [] });

vi.mock('@/features/shared/nodeCreator/composables/useActionsGeneration', () => ({
	useActionsGenerator: () => ({
		generateMergedNodesAndActions: mockGenerateMergedNodesAndActionsFn,
	}),
}));

vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	getResourcePermissions: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const IN_WORKFLOW_SECTION = 'commandBar.nodes.inWorkflow';
const ADD_NODE_SECTION = 'commandBar.nodes.addNode';

describe('useNodeCommands', () => {
	let mockNodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let mockSourceControlStore: ReturnType<typeof useSourceControlStore>;
	let mockWorkflowsStore: ReturnType<typeof useWorkflowsStore>;
	let mockGetResourcePermissions: ReturnType<typeof vi.fn>;
	let mockCanvasEventBusEmit: ReturnType<typeof vi.fn>;

	const createMockNodeType = (name: string, displayName: string): INodeTypeDescription => ({
		name,
		displayName,
		description: `Mock ${displayName}`,
		version: 1,
		defaults: {},
		inputs: [],
		outputs: [],
		properties: [],
		group: [],
	});

	const setMergedNodes = (mergedNodes: INodeTypeDescription[]) => {
		mockGenerateMergedNodesAndActionsFn.mockReturnValue({ mergedNodes });
	};

	const setWorkflowNodes = (nodes: Array<{ id: string; name: string; type: string }>) => {
		useWorkflowDocumentStore(createWorkflowDocumentId('123')).setNodes(
			nodes.map((node) => createTestNode({ ...node, typeVersion: 1 })),
		);
	};

	const getNodesSource = (): CommandBarLocalSource => {
		const { source } = useNodeCommands();
		if (source?.isRemote === false) {
			return source;
		}
		throw new Error('Expected a local nodes source');
	};

	const searchNodes = (request: Partial<CommandBarSearchRequest> = {}) =>
		getNodesSource().search({ query: '', offset: 0, limit: 100, ...request });

	const searchNodeIds = (query = '') => searchNodes({ query }).items.map((item) => item.id);

	const denyUpdatePermission = () => {
		mockGetResourcePermissions.mockReturnValue({
			workflow: { update: false, execute: true },
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();

		setActivePinia(createTestingPinia({ stubActions: false }));

		mockGetResourcePermissions = vi.mocked(getResourcePermissions);
		mockCanvasEventBusEmit = vi.mocked(canvasEventBus.emit);

		mockNodeTypesStore = useNodeTypesStore();
		vi.spyOn(mockNodeTypesStore, 'isNodeTypeUnavailable').mockReturnValue(false);
		mockSourceControlStore = useSourceControlStore();
		mockWorkflowsStore = useWorkflowsStore();

		mockGetResourcePermissions.mockReturnValue({
			workflow: { update: true, execute: true },
		});

		setMergedNodes([]);

		Object.defineProperty(mockNodeTypesStore, 'getNodeType', {
			value: vi.fn((type: string) => createMockNodeType(type, type)),
		});

		Object.defineProperty(mockSourceControlStore, 'preferences', {
			value: { branchReadOnly: false },
		});

		Object.defineProperty(mockWorkflowsStore, 'workflow', {
			value: { isArchived: false, scopes: [], nodes: [] },
		});

		Object.defineProperty(mockWorkflowsStore, 'isNewWorkflow', {
			value: false,
		});

		Object.defineProperty(mockWorkflowsStore, 'workflowId', {
			value: '123',
			writable: true,
		});

		Object.defineProperty(mockWorkflowsStore, 'isWorkflowSaved', {
			value: { '123': true },
			writable: true,
		});

		mockAddNodes.mockResolvedValue([{ id: 'node-1' }]);
	});

	describe('add sticky note command', () => {
		it('should return only the add sticky note command with the Shift+S shortcut', () => {
			const { commands } = useNodeCommands();

			expect(commands.value).toEqual([
				expect.objectContaining({
					id: 'add-sticky',
					title: 'commandBar.nodes.addStickyNote',
					section: 'commandBar.sections.nodes',
					shortcut: { shiftKey: true, keys: ['s'] },
				}),
			]);
		});

		it('should not include add sticky note command when the sticky note type is unavailable', () => {
			vi.mocked(mockNodeTypesStore.isNodeTypeUnavailable).mockReturnValue(true);

			const { commands } = useNodeCommands();

			expect(commands.value).toEqual([]);
		});

		it('should not include add sticky note command when user lacks update permission', () => {
			denyUpdatePermission();

			const { commands } = useNodeCommands();

			expect(commands.value).toEqual([]);
		});

		it('should not include add sticky note command when branch is read-only', () => {
			Object.defineProperty(mockSourceControlStore, 'preferences', {
				value: { branchReadOnly: true },
			});

			const { commands } = useNodeCommands();

			expect(commands.value).toEqual([]);
		});

		it('should not include add sticky note command when workflow is archived', () => {
			useWorkflowDocumentStore(createWorkflowDocumentId('123')).setIsArchived(true);

			const { commands } = useNodeCommands();

			expect(commands.value).toEqual([]);
		});

		it('should include add sticky note command for an unsaved workflow without permissions', () => {
			mockGetResourcePermissions.mockReturnValue({
				workflow: { update: false, execute: false },
			});
			Object.defineProperty(mockWorkflowsStore, 'isWorkflowSaved', {
				value: {},
				writable: true,
			});

			const { commands } = useNodeCommands();

			expect(commands.value.map((command) => command.id)).toEqual(['add-sticky']);
		});

		it('should emit create:sticky event when sticky note command is executed', () => {
			const { commands } = useNodeCommands();

			void commands.value[0].handler?.();

			expect(mockCanvasEventBusEmit).toHaveBeenCalledWith('create:sticky');
		});
	});

	describe('nodes source', () => {
		it('should expose an available local source with the nodes id', () => {
			const source = getNodesSource();

			expect(source.id).toBe('nodes');
			expect(source.title).toBe('commandBar.sections.nodes');
			expect(source.isAvailable()).toBe(true);
		});

		it('should return no items when the workflow is empty and no node types exist', () => {
			expect(searchNodes()).toEqual({ items: [], hasMore: false });
		});
	});

	describe('nodes in the workflow', () => {
		beforeEach(() => {
			vi.mocked(mockNodeTypesStore.getNodeType).mockImplementation((type: string) =>
				createMockNodeType(type, type === 'n8n-nodes-base.manualTrigger' ? 'Manual Trigger' : type),
			);
			setWorkflowNodes([
				{ id: 'node-1', name: 'Start', type: 'n8n-nodes-base.manualTrigger' },
				{ id: 'node-2', name: 'Fetch data', type: 'n8n-nodes-base.httpRequest' },
			]);
		});

		it('should list workflow nodes with the node type display name as description', () => {
			const { items } = searchNodes();

			expect(items).toEqual([
				expect.objectContaining({
					id: 'node-1',
					title: 'Start',
					description: 'Manual Trigger',
					section: IN_WORKFLOW_SECTION,
				}),
				expect.objectContaining({
					id: 'node-2',
					title: 'Fetch data',
					section: IN_WORKFLOW_SECTION,
				}),
			]);
		});

		it('should set the node active when a workflow node item is selected', async () => {
			const { items } = searchNodes();

			await items[0].handler?.();

			expect(mockSetNodeActive).toHaveBeenCalledWith('node-1', 'command_bar');
		});

		it('should match workflow nodes by node type display name', () => {
			expect(searchNodeIds('manual trigger')).toEqual(['node-1']);
		});

		it('should keep listing workflow nodes when user lacks update permission', () => {
			setMergedNodes([createMockNodeType('n8n-nodes-base.slack', 'Slack')]);
			denyUpdatePermission();

			expect(searchNodeIds()).toEqual(['node-1', 'node-2']);
		});
	});

	describe('node types to add', () => {
		beforeEach(() => {
			setMergedNodes([
				createMockNodeType('n8n-nodes-base.httpRequest', 'HTTP Request'),
				createMockNodeType('n8n-nodes-base.slack', 'Slack'),
			]);
		});

		it('should list node types to add after the nodes in the workflow', () => {
			setWorkflowNodes([{ id: 'node-1', name: 'Start', type: 'n8n-nodes-base.manualTrigger' }]);

			const { items } = searchNodes();

			expect(items.map((item) => [item.id, item.section])).toEqual([
				['node-1', IN_WORKFLOW_SECTION],
				['n8n-nodes-base.httpRequest', ADD_NODE_SECTION],
				['n8n-nodes-base.slack', ADD_NODE_SECTION],
			]);
			expect(items[1].title).toBe('HTTP Request');
			expect(mockGenerateMergedNodesAndActionsFn).toHaveBeenCalled();
		});

		it('should not list node types to add when user lacks update permission', () => {
			denyUpdatePermission();

			expect(searchNodeIds()).toEqual([]);
		});

		it('should not list node types to add when branch is read-only', () => {
			Object.defineProperty(mockSourceControlStore, 'preferences', {
				value: { branchReadOnly: true },
			});

			expect(searchNodeIds()).toEqual([]);
		});

		it('should not list node types to add when workflow is archived', () => {
			useWorkflowDocumentStore(createWorkflowDocumentId('123')).setIsArchived(true);

			expect(searchNodeIds()).toEqual([]);
		});

		it('should list node types to add for an unsaved workflow without permissions', () => {
			mockGetResourcePermissions.mockReturnValue({
				workflow: { update: false, execute: false },
			});
			Object.defineProperty(mockWorkflowsStore, 'isWorkflowSaved', {
				value: {},
				writable: true,
			});

			expect(searchNodeIds()).toEqual(['n8n-nodes-base.httpRequest', 'n8n-nodes-base.slack']);
		});

		it('should add the node and select it when a node type item is selected', async () => {
			const slackItem = searchNodes().items.find((item) => item.id === 'n8n-nodes-base.slack');

			await slackItem?.handler?.();

			expect(mockAddNodes).toHaveBeenCalledWith([{ type: 'n8n-nodes-base.slack' }]);
			expect(mockCanvasEventBusEmit).toHaveBeenCalledWith('nodes:select', { ids: ['node-1'] });
		});

		it('should not select a node when no node was added', async () => {
			mockAddNodes.mockResolvedValue([]);

			await searchNodes().items[0].handler?.();

			expect(mockCanvasEventBusEmit).not.toHaveBeenCalled();
		});
	});

	describe('search ranking', () => {
		it('should rank node types by fuzzy match on the title and exclude non-matching ones', () => {
			setMergedNodes([
				createMockNodeType('n8n-nodes-base.slackTrigger', 'Slack Trigger'),
				createMockNodeType('n8n-nodes-base.httpRequest', 'HTTP Request'),
				createMockNodeType('n8n-nodes-base.slack', 'Slack'),
			]);

			expect(searchNodeIds('slack')).toEqual([
				'n8n-nodes-base.slack',
				'n8n-nodes-base.slackTrigger',
			]);
		});

		it('should match node types by their aliases', () => {
			setMergedNodes([
				{
					...createMockNodeType('n8n-nodes-base.httpRequest', 'HTTP Request'),
					codex: { alias: ['cURL', 'API'] },
				},
				createMockNodeType('n8n-nodes-base.slack', 'Slack'),
			]);

			const { items } = searchNodes({ query: 'curl' });

			expect(items.map((item) => item.id)).toEqual(['n8n-nodes-base.httpRequest']);
			expect(items[0].keywords).toEqual(['cURL', 'API']);
		});

		it('should list matching workflow nodes before better matching node types', () => {
			setWorkflowNodes([{ id: 'node-1', name: 'Post to Slack', type: 'n8n-nodes-base.slack' }]);
			setMergedNodes([createMockNodeType('n8n-nodes-base.slack', 'Slack')]);

			expect(searchNodeIds('slack')).toEqual(['node-1', 'n8n-nodes-base.slack']);
		});

		it('should list restricted node types last even when they match better', () => {
			setMergedNodes([
				createMockNodeType('n8n-nodes-base.slack', 'Slack'),
				createMockNodeType('n8n-nodes-base.slackTrigger', 'Slack Trigger'),
			]);
			mockRestrictedNodeTypes({ 'n8n-nodes-base.slack': 'instance' });

			const { items } = searchNodes({ query: 'slack' });

			expect(items.map((item) => [item.id, item.disabled])).toEqual([
				['n8n-nodes-base.slackTrigger', false],
				['n8n-nodes-base.slack', true],
			]);
		});
	});

	describe('restricted node types', () => {
		it('should list a restricted node type last and disabled instead of hiding it', () => {
			setMergedNodes([
				createMockNodeType('n8n-nodes-base.gmail', 'Gmail'),
				createMockNodeType('n8n-nodes-base.slack', 'Slack'),
			]);
			mockRestrictedNodeTypes({ 'n8n-nodes-base.gmail': 'instance' });

			const { items } = searchNodes();

			expect(items.map((item) => [item.id, item.disabled])).toEqual([
				['n8n-nodes-base.slack', false],
				['n8n-nodes-base.gmail', true],
			]);
			expect(items[1].title).toBe('Gmail');
		});

		it('should disable a credential-only node type when HTTP Request is restricted', () => {
			setMergedNodes([
				createMockNodeType('n8n-creds-base.sysdigApi', 'Sysdig'),
				createMockNodeType('n8n-nodes-base.slack', 'Slack'),
			]);
			mockRestrictedNodeTypes({ 'n8n-nodes-base.httpRequest': 'instance' });

			const { items } = searchNodes();

			expect(items.map((item) => [item.id, item.disabled])).toEqual([
				['n8n-nodes-base.slack', false],
				['n8n-creds-base.sysdigApi', true],
			]);
		});

		it('should disable a node type the policy restricts', () => {
			setMergedNodes([
				createMockNodeType('n8n-nodes-base.httpRequest', 'HTTP Request'),
				createMockNodeType('n8n-nodes-base.slack', 'Slack'),
			]);
			mockRestrictedNodeTypes({ 'n8n-nodes-base.slack': 'instance' });

			const { items } = searchNodes();

			expect(items.map((item) => [item.id, item.disabled])).toEqual([
				['n8n-nodes-base.httpRequest', false],
				['n8n-nodes-base.slack', true],
			]);
		});
	});

	describe('pagination', () => {
		beforeEach(() => {
			setWorkflowNodes([{ id: 'node-1', name: 'Start', type: 'n8n-nodes-base.manualTrigger' }]);
			setMergedNodes([
				createMockNodeType('n8n-nodes-base.httpRequest', 'HTTP Request'),
				createMockNodeType('n8n-nodes-base.slack', 'Slack'),
			]);
		});

		it('should return the first page and report more items', () => {
			const { items, hasMore } = searchNodes({ offset: 0, limit: 2 });

			expect(items.map((item) => item.id)).toEqual(['node-1', 'n8n-nodes-base.httpRequest']);
			expect(hasMore).toBe(true);
		});

		it('should return the last page and report no more items', () => {
			const { items, hasMore } = searchNodes({ offset: 2, limit: 2 });

			expect(items.map((item) => item.id)).toEqual(['n8n-nodes-base.slack']);
			expect(hasMore).toBe(false);
		});
	});
});
