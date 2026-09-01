import { computed, reactive, ref, toValue } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InstanceAiAgentNode, InstanceAiSetupItem } from '@n8n/api-types';
import { useWorkflowSetupItems } from '@/features/setupPanel/composables/useWorkflowSetupItems';
import { isAgentEditingWorkflow } from '../canvasPreview.utils';
import {
	useSetupPanelState,
	type SetupPanelThreadSource,
} from '../composables/useSetupPanelState';

vi.mock('@/features/setupPanel/composables/useWorkflowSetupItems', () => ({
	useWorkflowSetupItems: vi.fn(),
}));
vi.mock('../canvasPreview.utils', () => ({
	isAgentEditingWorkflow: vi.fn(),
}));

const WORKFLOW_ID = 'wf-1';

const eventItem: InstanceAiSetupItem = {
	id: `${WORKFLOW_ID}:credential:slackApi`,
	workflowId: WORKFLOW_ID,
	kind: 'credential',
	credentialType: 'slackApi',
};

const derivedItem: InstanceAiSetupItem = {
	id: `${WORKFLOW_ID}:parameters:Sheets`,
	workflowId: WORKFLOW_ID,
	kind: 'parameters',
	nodeName: 'Sheets',
	parameterNames: ['documentId'],
};

function createHarness(
	options: {
		workflowId?: string;
		agentEditing?: boolean;
		workflowAvailable?: boolean;
		eventItems?: InstanceAiSetupItem[];
		derivedItems?: InstanceAiSetupItem[];
	} = {},
) {
	const workflowId = 'workflowId' in options ? options.workflowId : WORKFLOW_ID;
	const {
		agentEditing = false,
		workflowAvailable = false,
		eventItems = [eventItem],
		derivedItems = [derivedItem],
	} = options;
	const editing = ref(agentEditing);
	const available = ref(workflowAvailable);
	const derived = ref(derivedItems);
	const doneIds = ref(new Set<string>());

	vi.mocked(isAgentEditingWorkflow).mockImplementation(() => editing.value);
	vi.mocked(useWorkflowSetupItems).mockReturnValue({
		isWorkflowAvailable: computed(() => available.value),
		derivedItems: computed(() => derived.value),
		isItemDone: (item: InstanceAiSetupItem) => doneIds.value.has(item.id),
	});

	const thread: SetupPanelThreadSource = reactive({
		messages: [{ agentTree: {} as InstanceAiAgentNode }],
		setupItemsByWorkflowId: { [WORKFLOW_ID]: eventItems },
	});

	const state = useSetupPanelState({ thread, workflowId: () => workflowId });
	return { state, editing, available, doneIds };
}

describe('useSetupPanelState', () => {
	beforeEach(() => {
		vi.mocked(useWorkflowSetupItems).mockReset();
		vi.mocked(isAgentEditingWorkflow).mockReset();
	});

	it('uses agent events as the row source while the agent edits the workflow', () => {
		const { state } = createHarness({ agentEditing: true, workflowAvailable: true });

		expect(state.isAgentEditing.value).toBe(true);
		expect(state.rowSource.value).toBe('events');
		expect(state.rows.value.map((row) => row.item)).toEqual([eventItem]);
	});

	it('switches to the workflow derivation once the agent stops editing', () => {
		const { state, editing } = createHarness({ agentEditing: true, workflowAvailable: true });

		expect(state.rowSource.value).toBe('events');

		editing.value = false;

		expect(state.rowSource.value).toBe('derived');
		expect(state.rows.value.map((row) => row.item)).toEqual([derivedItem]);
	});

	it('keeps events as the row source while the workflow document is unavailable', () => {
		const { state } = createHarness({ agentEditing: false, workflowAvailable: false });

		expect(state.rowSource.value).toBe('events');
		expect(state.rows.value.map((row) => row.item)).toEqual([eventItem]);
	});

	it('recomputes row done-ness when completion state changes', () => {
		const { state, doneIds } = createHarness();

		expect(state.rows.value[0].isDone).toBe(false);

		doneIds.value = new Set([eventItem.id]);

		expect(state.rows.value[0].isDone).toBe(true);
	});

	it('produces no rows without an active artifact workflow', () => {
		const { state } = createHarness({ workflowId: undefined });

		expect(state.isAgentEditing.value).toBe(false);
		expect(state.rows.value).toEqual([]);
		expect(vi.mocked(isAgentEditingWorkflow)).not.toHaveBeenCalled();
	});

	it('passes isAgentEditing to the derivation as its paused signal', () => {
		const { editing } = createHarness({ agentEditing: true });

		const options = vi.mocked(useWorkflowSetupItems).mock.calls[0][1];
		expect(toValue(options?.paused)).toBe(true);

		editing.value = false;
		expect(toValue(options?.paused)).toBe(false);
	});

	it('reads no event items for a workflowId matching a prototype property', () => {
		const { state } = createHarness({ workflowId: 'constructor' });

		expect(state.rowSource.value).toBe('events');
		expect(state.rows.value).toEqual([]);
	});

	it('keeps settled event parameter rows visible in derived mode', () => {
		const settledParameters: InstanceAiSetupItem = {
			id: `${WORKFLOW_ID}:parameters:Old Sheets`,
			workflowId: WORKFLOW_ID,
			kind: 'parameters',
			nodeName: 'Old Sheets',
			parameterNames: ['documentId'],
		};
		const unresolvedParameters: InstanceAiSetupItem = {
			id: `${WORKFLOW_ID}:parameters:Ghost`,
			workflowId: WORKFLOW_ID,
			kind: 'parameters',
			nodeName: 'Ghost',
			parameterNames: ['url'],
		};
		const { state, doneIds } = createHarness({
			workflowAvailable: true,
			// The credential event row must not be re-added: credential rows
			// derive from workflow structure, so absence from the derivation
			// means the workflow no longer needs them.
			eventItems: [eventItem, settledParameters, unresolvedParameters],
			derivedItems: [derivedItem],
		});
		doneIds.value = new Set([settledParameters.id]);

		expect(state.rowSource.value).toBe('derived');
		expect(state.rows.value).toEqual([
			{ item: derivedItem, isDone: false },
			{ item: settledParameters, isDone: true },
		]);
	});
});
