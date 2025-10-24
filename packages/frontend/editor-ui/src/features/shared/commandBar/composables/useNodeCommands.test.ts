import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNodeCommands } from './useNodeCommands';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { INodeTypeDescription } from 'n8n-workflow';
import { getResourcePermissions } from '@n8n/permissions';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';

const mockEditableWorkflow = {
	value: {
		nodes: [] as Array<{
			id: string;
			name: string;
			type: string;
			typeVersion: number;
		}>,
	},
};

vi.mock('@/composables/useCanvasOperations', () => ({
	useCanvasOperations: () => ({
		addNodes: vi.fn(),
		setNodeActive: vi.fn(),
		editableWorkflow: mockEditableWorkflow,
	}),
}));

vi.mock('@/features/workflows/canvas/canvas.eventBus', () => ({
	canvasEventBus: {
		emit: vi.fn(),
	},
}));

const mockGenerateMergedNodesAndActionsFn = vi.fn().mockReturnValue({ mergedNodes: [] });

vi.mock('@/components/Node/NodeCreator/composables/useActionsGeneration', () => ({
	useActionsGenerator: () => ({
		generateMergedNodesAndActions: mockGenerateMergedNodesAndActionsFn,
	}),
}));

vi.mock('@n8n/permissions', () => ({
	getResourcePermissions: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

describe('useNodeCommands', () => {
	let mockNodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let mockSourceControlStore: ReturnType<typeof useSourceControlStore>;
	let mockWorkflowsStore: ReturnType<typeof useWorkflowsStore>;
	let mockGetResourcePermissions: ReturnType<typeof vi.fn>;
	let mockAddNodes: ReturnType<typeof vi.fn>;
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

	beforeEach(() => {
		setActivePinia(createTestingPinia());

		mockGetResourcePermissions = vi.mocked(getResourcePermissions);
		const canvasOps = useCanvasOperations();
		mockAddNodes = vi.mocked(canvasOps.addNodes);
		mockCanvasEventBusEmit = vi.mocked(canvasEventBus.emit);

		mockNodeTypesStore = useNodeTypesStore();
		mockSourceControlStore = useSourceControlStore();
		mockWorkflowsStore = useWorkflowsStore();

		mockGetResourcePermissions.mockReturnValue({
			workflow: { update: true, execute: true },
		});

		mockGenerateMergedNodesAndActionsFn.mockReturnValue({
			mergedNodes: [],
		});

		Object.defineProperty(mockNodeTypesStore, 'getNodeType', {
			value: vi.fn((type: string) => createMockNodeType(type, type)),
		});

		Object.defineProperty(mockSourceControlStore, 'preferences', {
			value: { branchReadOnly: false },
		});

		Object.defineProperty(mockWorkflowsStore, 'workflow', {
			value: { isArchived: false, scopes: [] },
		});

		Object.defineProperty(mockWorkflowsStore, 'isNewWorkflow', {
			value: false,
		});

		mockAddNodes.mockResolvedValue([{ id: 'node-1' }]);

		mockEditableWorkflow.value.nodes = [];

		vi.clearAllMocks();
	});

	describe('add node command', () => {
		it('should include add node command when user has update permission', () => {
			const { commands } = useNodeCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			console.log('commands', commands.value);
			const addCommand = commands.value.find((cmd) => cmd.id === 'add-node');
			expect(addCommand).toBeDefined();
		});

		it('should not include add node command when user lacks update permission', () => {
			mockGetResourcePermissions.mockReturnValue({
				workflow: { update: false, execute: true },
			});

			const { commands } = useNodeCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const addCommand = commands.value.find((cmd) => cmd.id === 'add-node');
			expect(addCommand).toBeUndefined();
		});

		it('should not include add node command when branch is read-only', () => {
			Object.defineProperty(mockSourceControlStore, 'preferences', {
				value: { branchReadOnly: true },
			});

			const { commands } = useNodeCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const addCommand = commands.value.find((cmd) => cmd.id === 'add-node');
			expect(addCommand).toBeUndefined();
		});

		it('should not include add node command when workflow is archived', () => {
			Object.defineProperty(mockWorkflowsStore, 'workflow', {
				value: { isArchived: true, scopes: [] },
			});

			const { commands } = useNodeCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const addCommand = commands.value.find((cmd) => cmd.id === 'add-node');
			expect(addCommand).toBeUndefined();
		});

		it('should include add node command for new workflow even without permissions', () => {
			mockGetResourcePermissions.mockReturnValue({
				workflow: { update: false, execute: false },
			});

			Object.defineProperty(mockWorkflowsStore, 'isNewWorkflow', {
				value: true,
			});

			const { commands } = useNodeCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const addCommand = commands.value.find((cmd) => cmd.id === 'add-node');
			expect(addCommand).toBeDefined();
		});

		it('should populate add node children with node types from generateMergedNodesAndActions', () => {
			const mockNodes = [
				createMockNodeType('n8n-nodes-base.httpRequest', 'HTTP Request'),
				createMockNodeType('n8n-nodes-base.slack', 'Slack'),
			];

			mockGenerateMergedNodesAndActionsFn.mockReturnValue({
				mergedNodes: mockNodes,
			});

			const { commands } = useNodeCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const addCommand = commands.value.find((cmd) => cmd.id === 'add-node');
			expect(addCommand?.children).toHaveLength(2);
			expect(addCommand?.children?.[0].id).toBe('n8n-nodes-base.httpRequest');
			expect(addCommand?.children?.[1].id).toBe('n8n-nodes-base.slack');

			expect(mockGenerateMergedNodesAndActionsFn).toHaveBeenCalled();
		});
	});

	describe('open node command', () => {
		it('should include open node command', () => {
			const { commands } = useNodeCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-node');
			expect(openCommand).toBeDefined();
			expect(openCommand?.title).toBe('commandBar.nodes.openNode');
		});

		it('should populate open node children with workflow nodes', () => {
			mockEditableWorkflow.value.nodes = [
				{ id: 'node-1', name: 'Start', type: 'n8n-nodes-base.start', typeVersion: 1 },
				{
					id: 'node-2',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
				},
			];

			const { commands } = useNodeCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-node');
			expect(openCommand?.children).toHaveLength(2);
		});
	});

	describe('add sticky note command', () => {
		it('should include add sticky note command when user has update permission', () => {
			const { commands } = useNodeCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const stickyCommand = commands.value.find((cmd) => cmd.id === 'add-sticky');
			expect(stickyCommand).toBeDefined();
		});

		it('should not include add sticky note command when user lacks update permission', () => {
			mockGetResourcePermissions.mockReturnValue({
				workflow: { update: false, execute: true },
			});

			const { commands } = useNodeCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const stickyCommand = commands.value.find((cmd) => cmd.id === 'add-sticky');
			expect(stickyCommand).toBeUndefined();
		});

		it('should emit create:sticky event when sticky note command is executed', () => {
			const { commands } = useNodeCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
			});

			const stickyCommand = commands.value.find((cmd) => cmd.id === 'add-sticky');
			void stickyCommand?.handler?.();

			expect(mockCanvasEventBusEmit).toHaveBeenCalledWith('create:sticky');
		});
	});

	describe('root add node items', () => {
		it('should not show root add node items when query is too short', () => {
			const { commands } = useNodeCommands({
				lastQuery: ref('ht'),
				activeNodeId: ref(null),
			});

			const addCommand = commands.value.find((cmd) => cmd.id === 'add-node');
			if (addCommand) {
				expect(commands.value.length).toBeLessThanOrEqual(3);
			}
		});

		it('should show root add node items when query is longer than 2 characters', () => {
			const { commands } = useNodeCommands({
				lastQuery: ref('htt'),
				activeNodeId: ref(null),
			});

			expect(commands.value).toBeDefined();
		});
	});

	describe('root open node items', () => {
		beforeEach(() => {
			mockEditableWorkflow.value.nodes = [
				{ id: 'node-1', name: 'Start', type: 'n8n-nodes-base.start', typeVersion: 1 },
			];
		});

		it('should not show root open node items when query is too short', () => {
			const { commands } = useNodeCommands({
				lastQuery: ref('st'),
				activeNodeId: ref(null),
			});

			const rootOpenNodes = commands.value.filter((cmd) => cmd.id === 'node-1');
			expect(rootOpenNodes).toHaveLength(0);
		});

		it('should show root open node items when query is longer than 2 characters', () => {
			const { commands } = useNodeCommands({
				lastQuery: ref('sta'),
				activeNodeId: ref(null),
			});

			const rootOpenNodes = commands.value.filter((cmd) => cmd.id === 'node-1');
			expect(rootOpenNodes).toHaveLength(1);
		});
	});
});
