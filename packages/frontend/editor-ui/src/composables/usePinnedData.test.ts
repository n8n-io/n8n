import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { usePinnedData } from '@/composables/usePinnedData';
import type { INodeUi } from '@/Interface';
import { HTTP_REQUEST_NODE_TYPE, IF_NODE_TYPE, MAX_PINNED_DATA_SIZE } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { NodeConnectionTypes, STICKY_NODE_TYPE } from 'n8n-workflow';
import type { NodeConnectionType, INodeTypeDescription } from 'n8n-workflow';

vi.mock('@/composables/useToast', () => ({ useToast: vi.fn(() => ({ showError: vi.fn() })) }));
vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn(() => ({ baseText: vi.fn((key) => key) })),
}));
vi.mock('@/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn(() => ({
		run: vi.fn(),
	})),
}));

const getNodeType = vi.fn();
vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType,
	})),
}));

describe('usePinnedData', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('isValidJSON()', () => {
		it('should return true for valid JSON', () => {
			const { isValidJSON } = usePinnedData(ref(null));

			expect(isValidJSON('{"key":"value"}')).toBe(true);
		});

		it('should return false for invalid JSON', () => {
			const { isValidJSON } = usePinnedData(ref(null));
			const result = isValidJSON('invalid json');

			expect(result).toBe(false);
		});
	});

	describe('isValidSize()', () => {
		it('should return true when data size is at upper limit', () => {
			const { isValidSize } = usePinnedData(ref({ name: 'testNode' } as INodeUi));
			const largeData = new Array(MAX_PINNED_DATA_SIZE + 1).join('a');

			expect(isValidSize(largeData)).toBe(true);
		});

		it('should return false when data size is too large', () => {
			const { isValidSize } = usePinnedData(ref({ name: 'testNode' } as INodeUi));
			const largeData = new Array(MAX_PINNED_DATA_SIZE + 2).join('a');

			expect(isValidSize(largeData)).toBe(false);
		});
	});

	describe('setData()', () => {
		it('should throw if data is not valid JSON', () => {
			const { setData } = usePinnedData(ref({ name: 'testNode' } as INodeUi));

			expect(() => setData('invalid json', 'pin-icon-click')).toThrow();
		});

		it('should throw if data size is too large', () => {
			const { setData } = usePinnedData(ref({ name: 'testNode' } as INodeUi));
			const largeData = new Array(MAX_PINNED_DATA_SIZE + 2).join('a');

			expect(() => setData(largeData, 'pin-icon-click')).toThrow();
		});

		it('should set data correctly for valid inputs', () => {
			const workflowsStore = useWorkflowsStore();
			const node = ref({ name: 'testNode' } as INodeUi);
			const { setData } = usePinnedData(node);
			const testData = [{ json: { key: 'value' } }];

			expect(() => setData(testData, 'pin-icon-click')).not.toThrow();
			expect(workflowsStore.workflow.pinData?.[node.value.name]).toEqual(testData);
		});
	});

	describe('unsetData()', () => {
		it('should unset data correctly', () => {
			const workflowsStore = useWorkflowsStore();
			const node = ref({ name: 'testNode' } as INodeUi);
			const { setData, unsetData } = usePinnedData(node);
			const testData = [{ json: { key: 'value' } }];

			setData(testData, 'pin-icon-click');
			unsetData('context-menu');

			expect(workflowsStore.workflow.pinData?.[node.value.name]).toBeUndefined();
		});
	});

	describe('onSetDataSuccess()', () => {
		it('should trigger telemetry on successful data setting', async () => {
			const telemetry = useTelemetry();
			const spy = vi.spyOn(telemetry, 'track');
			const pinnedData = usePinnedData(ref({ name: 'testNode', type: 'someType' } as INodeUi), {
				displayMode: ref('json'),
				runIndex: ref(0),
			});

			pinnedData.onSetDataSuccess({ source: 'pin-icon-click' });
			expect(spy).toHaveBeenCalled();
		});
	});

	describe('onSetDataError()', () => {
		it('should trigger telemetry tracking on error in data setting', () => {
			const telemetry = useTelemetry();
			const spy = vi.spyOn(telemetry, 'track');
			const pinnedData = usePinnedData(ref({ name: 'testNode', type: 'someType' } as INodeUi), {
				displayMode: ref('json'),
				runIndex: ref(0),
			});

			pinnedData.onSetDataError({ errorType: 'data-too-large', source: 'pin-icon-click' });
			expect(spy).toHaveBeenCalled();
		});
	});

	describe('onUnsetData()', () => {
		it('should trigger telemetry on successful data unsetting', async () => {
			const telemetry = useTelemetry();
			const spy = vi.spyOn(telemetry, 'track');
			const pinnedData = usePinnedData(ref({ name: 'testNode', type: 'someType' } as INodeUi), {
				displayMode: ref('json'),
				runIndex: ref(0),
			});

			pinnedData.onUnsetData({ source: 'context-menu' });
			expect(spy).toHaveBeenCalled();
		});
	});

	describe('canPinData()', () => {
		afterEach(() => {
			vi.clearAllMocks();
		});

		it('allows pin on single output', async () => {
			const node = ref({
				name: 'single output node',
				typeVersion: 1,
				type: HTTP_REQUEST_NODE_TYPE,

				parameters: {},
				onError: 'stopWorkflow',
			} as INodeUi);
			getNodeType.mockReturnValue(makeNodeType([NodeConnectionTypes.Main], HTTP_REQUEST_NODE_TYPE));

			const { canPinNode } = usePinnedData(node);

			expect(canPinNode()).toBe(true);
			expect(canPinNode(false, 0)).toBe(true);
			// validate out of range index
			expect(canPinNode(false, 1)).toBe(false);
			expect(canPinNode(false, -1)).toBe(false);
		});

		it('allows pin on one main and one error output', async () => {
			const node = ref({
				name: 'single output node',
				typeVersion: 1,
				type: HTTP_REQUEST_NODE_TYPE,
				parameters: {},
				onError: 'continueErrorOutput',
			} as INodeUi);
			getNodeType.mockReturnValue(makeNodeType([NodeConnectionTypes.Main], HTTP_REQUEST_NODE_TYPE));

			const { canPinNode } = usePinnedData(node);

			expect(canPinNode()).toBe(true);
			expect(canPinNode(false, 0)).toBe(true);
			expect(canPinNode(false, 1)).toBe(false);
			// validate out of range index
			expect(canPinNode(false, 2)).toBe(false);
			expect(canPinNode(false, -1)).toBe(false);
		});

		it('does not allow pin on two main outputs', async () => {
			const node = ref({
				name: 'single output node',
				typeVersion: 1,
				type: IF_NODE_TYPE,
				parameters: {},
				onError: 'stopWorkflow',
			} as INodeUi);
			getNodeType.mockReturnValue(
				makeNodeType([NodeConnectionTypes.Main, NodeConnectionTypes.Main], IF_NODE_TYPE),
			);

			const { canPinNode } = usePinnedData(node);

			expect(canPinNode()).toBe(false);
			expect(canPinNode(false, 0)).toBe(false);
			expect(canPinNode(false, 1)).toBe(false);
			// validate out of range index
			expect(canPinNode(false, 2)).toBe(false);
			expect(canPinNode(false, -1)).toBe(false);
		});

		it('does not allow pin on denylisted node', async () => {
			const node = ref({
				name: 'single output node',
				typeVersion: 1,
				type: STICKY_NODE_TYPE,
			} as INodeUi);
			const { canPinNode } = usePinnedData(node);

			expect(canPinNode()).toBe(false);
			expect(canPinNode(false, 0)).toBe(false);
		});

		it('does not allow pin with checkDataEmpty and no pin', async () => {
			const node = ref({
				name: 'single output node',
				typeVersion: 1,
				type: HTTP_REQUEST_NODE_TYPE,
			} as INodeUi);
			getNodeType.mockReturnValue(makeNodeType([NodeConnectionTypes.Main], HTTP_REQUEST_NODE_TYPE));

			const { canPinNode } = usePinnedData(node);

			expect(canPinNode(true)).toBe(false);
			expect(canPinNode(true, 0)).toBe(false);
		});

		it('does not allow pin without output', async () => {
			const node = ref({
				name: 'zero output node',
				typeVersion: 1,
				type: 'n8n-nodes-base.stopAndError',
			} as INodeUi);
			getNodeType.mockReturnValue(makeNodeType([], 'n8n-nodes-base.stopAndError'));

			const { canPinNode } = usePinnedData(node);

			expect(canPinNode()).toBe(false);
			expect(canPinNode(false, 0)).toBe(false);
			expect(canPinNode(false, -1)).toBe(false);
			expect(canPinNode(false, 1)).toBe(false);
		});
	});
});

const makeNodeType = (outputs: NodeConnectionType[], name: string) =>
	({
		displayName: name,
		name,
		version: [1],
		inputs: [],
		outputs,
		properties: [],
		defaults: { color: '', name: '' },
		group: [],
		description: '',
	}) as INodeTypeDescription;
