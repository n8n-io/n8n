import type { INode } from 'n8n-workflow';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowRef, computed } from 'vue';

import type { GatewayOpportunity } from './useWorkflowGatewayScan';

const gatewayState = vi.hoisted(() => ({
	isAiGatewayEnabled: true,
	balance: undefined as number | undefined,
	branchReadOnly: false,
	managedNodeNames: new Set<string>(),
	// Saved by default so the scope check governs; the unsaved bypass is its own test.
	savedWorkflowIds: { wf1: true } as Record<string, boolean>,
}));

const mockWorkflowDocumentStore = vi.hoisted(() => ({
	workflowId: 'wf1',
	scopes: [] as string[],
	isArchived: false,
	getNodeByName: vi.fn(),
	updateNodeProperties: vi.fn(),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		get isAiGatewayEnabled() {
			return gatewayState.isAiGatewayEnabled;
		},
	}),
}));

vi.mock('@/app/composables/useAiGateway', () => ({
	useAiGateway: () => ({
		balance: computed(() => gatewayState.balance),
	}),
}));

vi.mock('@/app/stores/aiGateway.store', () => ({
	useAiGatewayStore: () => ({
		hasGatewayManagedCredential: (node: INode | null) =>
			Boolean(node && gatewayState.managedNodeNames.has(node.name)),
	}),
}));

vi.mock('@/features/integrations/sourceControl.ee/sourceControl.store', () => ({
	useSourceControlStore: () => ({
		preferences: {
			get branchReadOnly() {
				return gatewayState.branchReadOnly;
			},
		},
	}),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		get isWorkflowSaved() {
			return gatewayState.savedWorkflowIds;
		},
	}),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => shallowRef(mockWorkflowDocumentStore),
}));

import { useApplyGatewayCredential } from './useApplyGatewayCredential';

function makeNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'n1',
		name: 'Node1',
		type: 'n8n-nodes-base.test',
		typeVersion: 1,
		position: [0, 0],
		parameters: { existingParam: 'value' },
		credentials: {},
		...overrides,
	};
}

function makeOpportunity(overrides: Partial<GatewayOpportunity> = {}): GatewayOpportunity {
	return {
		nodeName: 'Node1',
		nodeType: 'n8n-nodes-base.test',
		credentialType: 'testApi',
		activationParameters: {},
		...overrides,
	};
}

describe('useApplyGatewayCredential', () => {
	beforeEach(() => {
		gatewayState.isAiGatewayEnabled = true;
		gatewayState.balance = undefined;
		gatewayState.branchReadOnly = false;
		gatewayState.managedNodeNames = new Set();
		gatewayState.savedWorkflowIds = { wf1: true };

		mockWorkflowDocumentStore.scopes = ['workflow:update'];
		mockWorkflowDocumentStore.isArchived = false;
		mockWorkflowDocumentStore.getNodeByName.mockReset();
		mockWorkflowDocumentStore.updateNodeProperties.mockReset();
	});

	describe('applyToNodes()', () => {
		it('applies credentials and activation parameters for each opportunity', () => {
			const node = makeNode();
			mockWorkflowDocumentStore.getNodeByName.mockReturnValue(node);

			const { applyToNodes } = useApplyGatewayCredential();
			const opportunity = makeOpportunity({ activationParameters: { authentication: 'header' } });
			const result = applyToNodes([opportunity]);

			expect(result).toEqual({ applied: ['Node1'], failed: [] });
			expect(mockWorkflowDocumentStore.updateNodeProperties).toHaveBeenCalledWith({
				name: 'Node1',
				properties: {
					parameters: { existingParam: 'value', authentication: 'header' },
					credentials: { testApi: { id: null, name: '', __aiGatewayManaged: true } },
				},
			});
		});

		it('leaves parameters untouched when activationParameters is empty', () => {
			const node = makeNode();
			mockWorkflowDocumentStore.getNodeByName.mockReturnValue(node);

			const { applyToNodes } = useApplyGatewayCredential();
			applyToNodes([makeOpportunity({ activationParameters: {} })]);

			const call = mockWorkflowDocumentStore.updateNodeProperties.mock.calls[0][0];
			expect(call.properties).not.toHaveProperty('parameters');
			expect(call.properties.credentials).toEqual({
				testApi: { id: null, name: '', __aiGatewayManaged: true },
			});
		});

		it('records a missing node in failed and does not write it', () => {
			mockWorkflowDocumentStore.getNodeByName.mockReturnValue(null);

			const { applyToNodes } = useApplyGatewayCredential();
			const result = applyToNodes([makeOpportunity({ nodeName: 'Ghost' })]);

			expect(result).toEqual({ applied: [], failed: ['Ghost'] });
			expect(mockWorkflowDocumentStore.updateNodeProperties).not.toHaveBeenCalled();
		});

		it('records an already-managed node in failed and does not rewrite it', () => {
			const node = makeNode({
				credentials: { testApi: { id: null, name: '', __aiGatewayManaged: true } },
			});
			mockWorkflowDocumentStore.getNodeByName.mockReturnValue(node);
			gatewayState.managedNodeNames = new Set(['Node1']);

			const { applyToNodes } = useApplyGatewayCredential();
			const result = applyToNodes([makeOpportunity()]);

			expect(result).toEqual({ applied: [], failed: ['Node1'] });
			expect(mockWorkflowDocumentStore.updateNodeProperties).not.toHaveBeenCalled();
		});

		it('leaves the document dirty (does not disable markDirty)', () => {
			const node = makeNode();
			mockWorkflowDocumentStore.getNodeByName.mockReturnValue(node);

			const { applyToNodes } = useApplyGatewayCredential();
			applyToNodes([makeOpportunity()]);

			expect(mockWorkflowDocumentStore.updateNodeProperties).toHaveBeenCalledTimes(1);
			expect(mockWorkflowDocumentStore.updateNodeProperties.mock.calls[0]).toHaveLength(1);
		});

		it('applies and fails independently across multiple opportunities', () => {
			const node1 = makeNode({ name: 'Node1' });
			mockWorkflowDocumentStore.getNodeByName.mockImplementation((name: string) =>
				name === 'Node1' ? node1 : null,
			);

			const { applyToNodes } = useApplyGatewayCredential();
			const result = applyToNodes([
				makeOpportunity({ nodeName: 'Node1' }),
				makeOpportunity({ nodeName: 'Missing' }),
			]);

			expect(result).toEqual({ applied: ['Node1'], failed: ['Missing'] });
		});
	});

	describe('canApply', () => {
		it('is true when Gateway is enabled, the workflow is editable, and the balance is unknown or positive', () => {
			const { canApply } = useApplyGatewayCredential();
			expect(canApply.value).toBe(true);
		});

		it('is false when Gateway credits are disabled', () => {
			gatewayState.isAiGatewayEnabled = false;

			const { canApply } = useApplyGatewayCredential();
			expect(canApply.value).toBe(false);
		});

		it('is false when the user cannot update the workflow', () => {
			mockWorkflowDocumentStore.scopes = [];

			const { canApply } = useApplyGatewayCredential();
			expect(canApply.value).toBe(false);
		});

		it('is false when the workflow is archived', () => {
			mockWorkflowDocumentStore.isArchived = true;

			const { canApply } = useApplyGatewayCredential();
			expect(canApply.value).toBe(false);
		});

		it('is false when the source-control branch is read-only', () => {
			gatewayState.branchReadOnly = true;

			const { canApply } = useApplyGatewayCredential();
			expect(canApply.value).toBe(false);
		});

		it('is true for an unsaved workflow, which carries no scopes yet', () => {
			// Right after an import the workflow has no scopes, so a plain permission
			// check would read the user's own canvas as read-only.
			mockWorkflowDocumentStore.scopes = [];
			gatewayState.savedWorkflowIds = {};

			expect(useApplyGatewayCredential().canApply.value).toBe(true);
		});

		it('is false when the wallet balance is known and empty', () => {
			gatewayState.balance = 0;

			const { canApply } = useApplyGatewayCredential();
			expect(canApply.value).toBe(false);
		});

		it('is true when the wallet balance is unknown', () => {
			gatewayState.balance = undefined;

			const { canApply } = useApplyGatewayCredential();
			expect(canApply.value).toBe(true);
		});

		it('is true when the wallet balance is positive', () => {
			gatewayState.balance = 10;

			const { canApply } = useApplyGatewayCredential();
			expect(canApply.value).toBe(true);
		});
	});
});
