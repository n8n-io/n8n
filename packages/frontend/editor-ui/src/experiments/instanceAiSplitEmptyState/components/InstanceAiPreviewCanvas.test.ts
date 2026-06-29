import { fireEvent } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { scoreMyLeadsWorkflow } from '@/experiments/instanceAiWorkflowPreviewSuggestions/workflows/score-my-leads';
import InstanceAiPreviewCanvas from './InstanceAiPreviewCanvas.vue';

const telemetryTrack = vi.fn();

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

// First node of scoreMyLeadsWorkflow: { id: 'salesforce-trigger', label: 'New lead' }.
const NODE_TEST_ID = 'instance-ai-preview-node-salesforce-trigger';
const HOVERED_EVENT = 'AI Assistant preview node hovered';
const CLICKED_EVENT = 'AI Assistant preview node clicked';

const renderComponent = createComponentRenderer(InstanceAiPreviewCanvas, {
	props: { workflow: scoreMyLeadsWorkflow, suggestionId: 'score-my-leads', animating: false },
});

describe('InstanceAiPreviewCanvas', () => {
	beforeEach(() => {
		telemetryTrack.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the canvas root element', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('instance-ai-preview-canvas')).toBeInTheDocument();
	});

	it('renders node labels from the workflow', () => {
		const { getAllByText } = renderComponent();
		expect(getAllByText('New lead').length).toBeGreaterThan(0);
	});

	it('tracks a node hover with fractional dwell seconds once it settles', async () => {
		const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000);
		const { getByTestId } = renderComponent();
		const node = getByTestId(NODE_TEST_ID);

		await fireEvent.mouseEnter(node);
		nowSpy.mockReturnValue(1_500); // 500ms later
		await fireEvent.mouseLeave(node);

		expect(telemetryTrack).toHaveBeenCalledWith(HOVERED_EVENT, {
			node_id: 'salesforce-trigger',
			node_label: 'New lead',
			suggestion_id: 'score-my-leads',
			seconds: 0.5,
		});
	});

	it('does not track hovers shorter than the settle threshold', async () => {
		const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000);
		const { getByTestId } = renderComponent();
		const node = getByTestId(NODE_TEST_ID);

		await fireEvent.mouseEnter(node);
		nowSpy.mockReturnValue(1_200); // 200ms < 300ms
		await fireEvent.mouseLeave(node);

		expect(telemetryTrack).not.toHaveBeenCalled();
	});

	it('tracks a node click and flushes the open hover before it', async () => {
		const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000);
		const { getByTestId } = renderComponent();
		const node = getByTestId(NODE_TEST_ID);

		await fireEvent.mouseEnter(node);
		nowSpy.mockReturnValue(1_400); // 400ms
		await fireEvent.click(node);

		expect(telemetryTrack).toHaveBeenCalledWith(HOVERED_EVENT, {
			node_id: 'salesforce-trigger',
			node_label: 'New lead',
			suggestion_id: 'score-my-leads',
			seconds: 0.4,
		});
		expect(telemetryTrack).toHaveBeenCalledWith(CLICKED_EVENT, {
			node_id: 'salesforce-trigger',
			node_label: 'New lead',
			suggestion_id: 'score-my-leads',
		});

		// A later mouseleave must not emit a second hover (the hover was already flushed).
		telemetryTrack.mockClear();
		await fireEvent.mouseLeave(node);
		expect(telemetryTrack).not.toHaveBeenCalled();
	});

	it('tracks a click with no prior settled hover as click-only', async () => {
		const { getByTestId } = renderComponent();
		const node = getByTestId(NODE_TEST_ID);

		await fireEvent.click(node);

		expect(telemetryTrack).toHaveBeenCalledTimes(1);
		expect(telemetryTrack).toHaveBeenCalledWith(CLICKED_EVENT, {
			node_id: 'salesforce-trigger',
			node_label: 'New lead',
			suggestion_id: 'score-my-leads',
		});
	});

	it('flushes an open hover when the canvas unmounts', async () => {
		const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000);
		const { getByTestId, unmount } = renderComponent();
		const node = getByTestId(NODE_TEST_ID);

		await fireEvent.mouseEnter(node);
		nowSpy.mockReturnValue(1_900); // 900ms
		unmount();

		expect(telemetryTrack).toHaveBeenCalledWith(HOVERED_EVENT, {
			node_id: 'salesforce-trigger',
			node_label: 'New lead',
			suggestion_id: 'score-my-leads',
			seconds: 0.9,
		});
	});

	it('marks interactive nodes with pointer-events auto', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId(NODE_TEST_ID).style.pointerEvents).toBe('auto');
	});
});
