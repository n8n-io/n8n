import { createComponentRenderer } from '@/__tests__/render';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	CANVAS_NODE_GROUP_TYPE,
	type CanvasEventBusEvents,
	type CanvasNode,
} from '@/features/workflows/canvas/canvas.types';
import type { EventBus } from '@n8n/utils/event-bus';
import { createTestingPinia } from '@pinia/testing';
import { defineComponent, h } from 'vue';

import InstanceAiWorkflowDraftPreview from '../components/InstanceAiWorkflowDraftPreview.vue';
import type { WorkflowDraft } from '../instanceAi.workflowDrafts';

const canvasProps = vi.hoisted(() => ({
	current: undefined as { nodes: CanvasNode[]; readOnly: boolean } | undefined,
	eventBus: undefined as EventBus<CanvasEventBusEvents> | undefined,
}));

vi.mock('@/features/workflows/canvas/components/Canvas.vue', () => ({
	default: defineComponent({
		props: ['id', 'nodes', 'connections', 'renderData', 'readOnly', 'eventBus', 'showNodeGroups'],
		setup(props) {
			return () => {
				canvasProps.current = { nodes: props.nodes, readOnly: props.readOnly };
				canvasProps.eventBus = props.eventBus;
				return h('div', { 'data-test-id': 'mock-canvas' });
			};
		},
	}),
}));

function node(name: string, x: number) {
	return {
		id: `id-${name}`,
		name,
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [x, 0] satisfies [number, number],
		parameters: {},
	};
}

function draft(names: string[], revision = 1): WorkflowDraft {
	return {
		filePath: 'src/workflows/demo.workflow.ts',
		revision,
		workflow: {
			name: 'Demo',
			nodes: names.map((name, index) => node(name, index * 200)),
			connections: {},
		},
	};
}

const renderComponent = createComponentRenderer(InstanceAiWorkflowDraftPreview);

function mockReducedMotion(reduce: boolean) {
	vi.stubGlobal(
		'matchMedia',
		vi.fn((query: string) => ({
			matches: reduce && query.includes('prefers-reduced-motion'),
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			onchange: null,
			dispatchEvent: vi.fn(),
		})),
	);
}

describe('InstanceAiWorkflowDraftPreview', () => {
	beforeEach(() => {
		canvasProps.current = undefined;
		canvasProps.eventBus = undefined;
		// Nodes show at once, so each test sees the full draft.
		mockReducedMotion(true);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('adds the nodes one at a time when motion is allowed', async () => {
		mockReducedMotion(false);
		vi.useFakeTimers();
		renderComponent({
			pinia: createTestingPinia({ stubActions: false }),
			props: { draft: draft(['Start', 'Set']), building: true },
		});

		expect(canvasProps.current?.nodes ?? []).toHaveLength(0);
		await vi.advanceTimersByTimeAsync(80);
		expect(canvasProps.current?.nodes.map((n) => n.data?.name)).toEqual(['Start']);
		await vi.advanceTimersByTimeAsync(80);
		expect(canvasProps.current?.nodes.map((n) => n.data?.name)).toEqual(['Start', 'Set']);
	});

	it('shows the step of the agent while it works', () => {
		const { getByTestId } = renderComponent({
			pinia: createTestingPinia({ stubActions: false }),
			props: { draft: draft(['Start']), building: true, statusText: 'Searching for gmail' },
		});

		expect(getByTestId('instance-ai-workflow-draft-status')).toHaveTextContent(
			'Searching for gmail',
		);
	});

	it('marks the nodes of the draft issues', () => {
		const withIssues: WorkflowDraft = {
			...draft(['Start', 'Set']),
			issues: [{ code: 'SET_INVALID_ASSIGNMENT', message: 'Missing id', nodeName: 'Set' }],
		};

		renderComponent({
			pinia: createTestingPinia({ stubActions: false }),
			props: { draft: withIssues, building: true },
		});

		const set = canvasProps.current?.nodes.find((n) => n.data?.name === 'Set');
		expect(set?.data?.issues.validation).toEqual([expect.stringContaining('Missing id')]);
	});

	it('renders the draft nodes on a read-only canvas', () => {
		renderComponent({
			pinia: createTestingPinia({ stubActions: false }),
			props: { draft: draft(['Start', 'Set']), building: true },
		});

		expect(canvasProps.current?.readOnly).toBe(true);
		expect(canvasProps.current?.nodes.map((n) => n.data?.name)).toEqual(['Start', 'Set']);
	});

	it('renders the node groups of the draft', () => {
		const grouped = draft(['Start', 'Set']);
		grouped.workflow.nodeGroups = [{ id: 'g-1', name: 'Intake', nodeIds: ['id-Start', 'id-Set'] }];

		renderComponent({
			pinia: createTestingPinia({ stubActions: false }),
			props: { draft: grouped, building: true },
		});

		expect(canvasProps.current?.nodes.map((n) => n.type)).toContain(CANVAS_NODE_GROUP_TYPE);
	});

	it('points to the chat when the run waits on the user', () => {
		const { getByTestId } = renderComponent({
			pinia: createTestingPinia({ stubActions: false }),
			props: {
				draft: draft(['Start']),
				building: true,
				statusText: 'Waiting on your answer',
				waiting: true,
			},
		});

		const status = getByTestId('instance-ai-workflow-draft-status');
		expect(status).toHaveAttribute('data-waiting', 'true');
		expect(status).toHaveTextContent('Waiting on your answer');
		expect(getByTestId('instance-ai-workflow-draft-waiting-arrow')).toBeInTheDocument();
	});

	it('labels the draft as building while the agent works', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			pinia: createTestingPinia({ stubActions: false }),
			props: { draft: draft(['Start']), building: true },
		});

		expect(getByTestId('instance-ai-workflow-draft-status')).toHaveTextContent(/building/i);
		expect(queryByTestId('instance-ai-workflow-draft-badge')).toBeNull();
	});

	it('labels the draft as not saved once the agent stops', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			pinia: createTestingPinia({ stubActions: false }),
			props: { draft: draft(['Start']), building: false },
		});

		expect(getByTestId('instance-ai-workflow-draft-badge')).toHaveTextContent(/not saved/i);
		// The status covers the canvas, so it goes when the agent stops.
		expect(queryByTestId('instance-ai-workflow-draft-status')).toBeNull();
	});

	it('fits the view when a new revision adds nodes', async () => {
		const { rerender } = renderComponent({
			pinia: createTestingPinia({ stubActions: false }),
			props: { draft: draft(['Start']), building: true },
		});
		const emit = vi.spyOn(canvasProps.eventBus!, 'emit');

		await rerender({ draft: draft(['Start', 'Set'], 2), building: true });

		expect(emit).toHaveBeenCalledWith('fitView');
		expect(canvasProps.current?.nodes).toHaveLength(2);
	});

	it('keeps the view when a new revision only changes existing nodes', async () => {
		const { rerender } = renderComponent({
			pinia: createTestingPinia({ stubActions: false }),
			props: { draft: draft(['Start', 'Set']), building: true },
		});
		const emit = vi.spyOn(canvasProps.eventBus!, 'emit');

		await rerender({ draft: draft(['Start', 'Set'], 2), building: true });

		expect(emit).not.toHaveBeenCalledWith('fitView');
	});

	it('never writes to the saved workflow document', () => {
		const pinia = createTestingPinia({ stubActions: false });
		renderComponent({ pinia, props: { draft: draft(['Start']), building: true } });

		const saved = useWorkflowDocumentStore(
			createWorkflowDocumentId('src/workflows/demo.workflow.ts'),
		);
		expect(saved.allNodes).toHaveLength(0);
	});
});
