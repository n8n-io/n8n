// Experiment cleanup (124_workflow_previews_above_assistant)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, nextTick, ref } from 'vue';
import { useElementSize, usePreferredReducedMotion } from '@vueuse/core';

import { createComponentRenderer } from '@/__tests__/render';

import { WORKFLOW_PREVIEW_EXAMPLES } from '../examples';
import type { WorkflowPreviewExample as WorkflowPreviewExampleData } from '../types';
import WorkflowPreviewExample from './WorkflowPreviewExample.vue';

vi.mock('@vueuse/core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@vueuse/core')>();
	return {
		...actual,
		useElementSize: vi.fn(),
		usePreferredReducedMotion: vi.fn(),
	};
});

const [scoreMyLeads, scheduleSocialPosts, processInvoices] = WORKFLOW_PREVIEW_EXAMPLES;

const noCardsExample: WorkflowPreviewExampleData = {
	id: 'no-cards',
	titleKey: processInvoices.titleKey,
	promptKey: processInvoices.promptKey,
	nodes: [
		{
			id: 'start',
			labelKey: processInvoices.nodes[0].labelKey,
			icon: 'clock',
			position: { x: 48, y: 168 },
		},
		{
			id: 'end',
			labelKey: processInvoices.nodes[1].labelKey,
			icon: 'if',
			position: { x: 1168, y: 168 },
		},
	],
	connections: [{ source: 'start', target: 'end' }],
};

const START_DELAY_MS = 120;
const LAYER_INTERVAL_MS = 200;
const NODE_FADE_MS = 400;
const EDGES_START_GAP_MS = 100;
const EDGE_DRAW_MS = 220;
const BUILD_SETTLE_MS = 200;
// SalesforceCardVisualization: 200ms appear + 600ms before `complete`.
const INPUT_CARD_DURATION_MS = 800;
const NODE_RUNNING_DURATION_MS = 250;
// InvoiceSpreadsheetVisualization is the slowest output: 200 + 450 + 350 + 650.
const OUTPUT_DURATION_MS = 1650;
// SalesforceCardVisualization and SlackMessageVisualization: 200ms appear + 600ms.
const CARD_OUTPUT_DURATION_MS = 800;
const ICON_CYCLE_INITIAL_DELAY_MS = 500;
const ICON_CYCLE_INTERVAL_MS = 1400;

function getEdgesStartMs(layerCount: number) {
	return (layerCount - 1) * LAYER_INTERVAL_MS + NODE_FADE_MS + EDGES_START_GAP_MS;
}

function getBuildDurationMs(layerCount: number) {
	return (
		START_DELAY_MS + getEdgesStartMs(layerCount) + (layerCount - 1) * EDGE_DRAW_MS + BUILD_SETTLE_MS
	);
}

function getRevealDelay(element: HTMLElement) {
	return element.style.getPropertyValue('--reveal-delay');
}

const renderComponent = createComponentRenderer(WorkflowPreviewExample, {
	props: { example: processInvoices },
});

function mockElementSize(width: number) {
	vi.mocked(useElementSize).mockReturnValue({
		width: ref(width),
		height: ref(0),
	} as unknown as ReturnType<typeof useElementSize>);
}

function mockReducedMotion(value: 'reduce' | 'no-preference') {
	vi.mocked(usePreferredReducedMotion).mockReturnValue(computed(() => value));
}

describe('WorkflowPreviewExample', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		mockElementSize(0);
		mockReducedMotion('no-preference');
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('builds the workflow left to right before anything else happens', async () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'building');
		expect(getByTestId('workflow-preview-stage').className).not.toContain('revealed');
		expect(getRevealDelay(getByTestId('workflow-preview-node-gmail-trigger'))).toBe('0ms');
		expect(getRevealDelay(getByTestId('workflow-preview-node-claude'))).toBe('200ms');
		expect(getRevealDelay(getByTestId('workflow-preview-node-flag-invoice'))).toBe('600ms');
		expect(getRevealDelay(getByTestId('workflow-preview-node-add-calendar'))).toBe('600ms');
		expect(getRevealDelay(getByTestId('workflow-preview-connection-gmail-trigger-claude'))).toBe(
			'1100ms',
		);
		expect(getRevealDelay(getByTestId('workflow-preview-connection-claude-if-discrepancy'))).toBe(
			'1320ms',
		);
		expect(
			getRevealDelay(getByTestId('workflow-preview-connection-if-discrepancy-add-calendar')),
		).toBe('1540ms');
		// the sketch outline appears with its node, on the node's 96px box
		expect(getRevealDelay(getByTestId('workflow-preview-outline-claude'))).toBe('200ms');
		expect(getByTestId('workflow-preview-outline-claude').getAttribute('d')).toContain(
			'M 232 120 H 312',
		);

		await vi.advanceTimersByTimeAsync(START_DELAY_MS);

		expect(getByTestId('workflow-preview-stage').className).toContain('revealed');
		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'building');
		expect(getByTestId('workflow-preview-node-gmail-trigger')).toHaveAttribute(
			'data-state',
			'idle',
		);
	});

	it('rests as an unexecuted sketch once built, with hidden cards and no names', async () => {
		const { getByTestId, emitted } = renderComponent();

		await vi.advanceTimersByTimeAsync(getBuildDurationMs(4) - 1);
		expect(emitted()).not.toHaveProperty('built');

		await vi.advanceTimersByTimeAsync(1);

		expect(emitted()).toHaveProperty('built', [[]]);
		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'idle');
		expect(getByTestId('workflow-preview-stage').className).toContain('built');
		expect(getByTestId('workflow-preview-stage').className).not.toContain('hovered');
		expect(getByTestId('workflow-preview-input').className).toContain('cardSlotHidden');
		expect(getByTestId('workflow-preview-output-flag-invoice').className).toContain(
			'cardSlotHidden',
		);
		expect(getByTestId('workflow-preview-node-gmail-trigger')).toHaveAttribute(
			'data-state',
			'idle',
		);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('shows the input card on hover and keeps the nodes idle until it completes', async () => {
		const { getByTestId, rerender } = renderComponent();

		await vi.advanceTimersByTimeAsync(getBuildDurationMs(4));
		await rerender({ example: processInvoices, hovered: true });

		expect(getByTestId('workflow-preview-stage').className).toContain('hovered');
		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'input');
		expect(getByTestId('workflow-preview-input').className).not.toContain('cardSlotHidden');
		expect(getByTestId('workflow-preview-node-gmail-trigger')).toHaveAttribute(
			'data-state',
			'idle',
		);
	});

	it('waits for the build to finish when hovered early', async () => {
		const { getByTestId, rerender } = renderComponent();

		await vi.advanceTimersByTimeAsync(START_DELAY_MS);
		await rerender({ example: processInvoices, hovered: true });

		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'building');

		await vi.advanceTimersByTimeAsync(getBuildDurationMs(4) - START_DELAY_MS);

		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'input');
	});

	it('resets to the unexecuted state when the pointer leaves, and replays on re-hover', async () => {
		const { getByTestId, rerender } = renderComponent();

		await vi.advanceTimersByTimeAsync(getBuildDurationMs(4));
		await rerender({ example: processInvoices, hovered: true });
		await vi.advanceTimersByTimeAsync(INPUT_CARD_DURATION_MS + NODE_RUNNING_DURATION_MS);

		expect(getByTestId('workflow-preview-node-gmail-trigger')).toHaveAttribute(
			'data-state',
			'success',
		);

		await rerender({ example: processInvoices, hovered: false });

		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'idle');
		expect(getByTestId('workflow-preview-node-gmail-trigger')).toHaveAttribute(
			'data-state',
			'idle',
		);
		expect(getByTestId('workflow-preview-connection-gmail-trigger-claude')).toHaveAttribute(
			'data-active',
			'false',
		);
		expect(getByTestId('workflow-preview-input').className).toContain('cardSlotHidden');
		expect(vi.getTimerCount()).toBe(0);

		await rerender({ example: processInvoices, hovered: true });

		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'input');
	});

	it('runs the nodes layer by layer once the input card completes', async () => {
		const { getByTestId, rerender } = renderComponent();

		await vi.advanceTimersByTimeAsync(getBuildDurationMs(4));
		await rerender({ example: processInvoices, hovered: true });
		await vi.advanceTimersByTimeAsync(INPUT_CARD_DURATION_MS);

		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'nodes');
		expect(getByTestId('workflow-preview-node-gmail-trigger')).toHaveAttribute(
			'data-state',
			'running',
		);
		expect(getByTestId('workflow-preview-node-claude')).toHaveAttribute('data-state', 'idle');

		await vi.advanceTimersByTimeAsync(NODE_RUNNING_DURATION_MS);

		expect(getByTestId('workflow-preview-node-gmail-trigger')).toHaveAttribute(
			'data-state',
			'success',
		);
		expect(getByTestId('workflow-preview-connection-gmail-trigger-claude')).toHaveAttribute(
			'data-active',
			'true',
		);
		expect(getByTestId('workflow-preview-node-claude')).toHaveAttribute('data-state', 'running');
		expect(getByTestId('workflow-preview-connection-claude-if-discrepancy')).toHaveAttribute(
			'data-active',
			'false',
		);

		await vi.advanceTimersByTimeAsync(NODE_RUNNING_DURATION_MS * 2);

		expect(getByTestId('workflow-preview-node-flag-invoice')).toHaveAttribute(
			'data-state',
			'running',
		);
		expect(getByTestId('workflow-preview-node-add-calendar')).toHaveAttribute(
			'data-state',
			'running',
		);
	});

	it('shows the outputs after the last layer and finishes when they complete', async () => {
		const { getByTestId, rerender } = renderComponent();

		await vi.advanceTimersByTimeAsync(getBuildDurationMs(4));
		await rerender({ example: processInvoices, hovered: true });
		await vi.advanceTimersByTimeAsync(INPUT_CARD_DURATION_MS + NODE_RUNNING_DURATION_MS * 4);

		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'output');
		expect(getByTestId('workflow-preview-output-flag-invoice')).toBeInTheDocument();
		expect(getByTestId('workflow-preview-output-add-calendar')).toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(OUTPUT_DURATION_MS);

		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'done');
		expect(vi.getTimerCount()).toBe(0);
	});

	it('starts the node run right away on hover for examples without an input card', async () => {
		const { getByTestId, queryByTestId, rerender } = renderComponent({
			props: { example: noCardsExample },
		});

		await vi.advanceTimersByTimeAsync(getBuildDurationMs(2));
		await rerender({ example: noCardsExample, hovered: true });

		expect(queryByTestId('workflow-preview-input')).not.toBeInTheDocument();
		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'nodes');
		expect(getByTestId('workflow-preview-node-start')).toHaveAttribute('data-state', 'running');

		await vi.advanceTimersByTimeAsync(NODE_RUNNING_DURATION_MS * 2);

		expect(getByTestId('workflow-preview-node-end')).toHaveAttribute('data-state', 'success');
		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'done');
		expect(vi.getTimerCount()).toBe(0);
	});

	it('renders a Slack message output and cycles the CRM icons once done', async () => {
		const { getByTestId, getByText, rerender } = renderComponent({
			props: { example: scoreMyLeads },
		});
		const getNodeIconSrc = (nodeId: string) =>
			getByTestId(`workflow-preview-node-${nodeId}`).querySelector('img')?.getAttribute('src');

		await vi.advanceTimersByTimeAsync(getBuildDurationMs(5));
		await rerender({ example: scoreMyLeads, hovered: true });
		await vi.advanceTimersByTimeAsync(INPUT_CARD_DURATION_MS + NODE_RUNNING_DURATION_MS * 5);

		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'output');
		expect(getByTestId('workflow-preview-output-notify-sales')).toBeInTheDocument();
		expect(getByText('New qualified lead')).toBeInTheDocument();
		expect(getByText('New hot lead: John Doe')).toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(CARD_OUTPUT_DURATION_MS);

		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'done');
		const salesforceIconSrc = getNodeIconSrc('salesforce-trigger');
		expect(getNodeIconSrc('update-lead')).toBe(salesforceIconSrc);

		await vi.advanceTimersByTimeAsync(ICON_CYCLE_INITIAL_DELAY_MS);

		const pipedriveIconSrc = getNodeIconSrc('salesforce-trigger');
		expect(pipedriveIconSrc).not.toBe(salesforceIconSrc);
		expect(getNodeIconSrc('update-lead')).toBe(pipedriveIconSrc);
		expect(getNodeIconSrc('lemlist')).not.toBe(pipedriveIconSrc);
		expect(getByTestId('workflow-preview-input').querySelector('img')?.getAttribute('src')).toBe(
			pipedriveIconSrc,
		);
		expect(
			getByTestId('workflow-preview-output-update-lead').querySelector('img')?.getAttribute('src'),
		).toBe(pipedriveIconSrc);

		await vi.advanceTimersByTimeAsync(ICON_CYCLE_INTERVAL_MS * 3);

		expect(getNodeIconSrc('salesforce-trigger')).toBe(pipedriveIconSrc);

		await rerender({ example: scoreMyLeads, hovered: false });

		expect(getNodeIconSrc('salesforce-trigger')).toBe(salesforceIconSrc);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('lays out three output cards without overlap for the social posts example', async () => {
		const { getByTestId, queryByTestId, rerender } = renderComponent({
			props: { example: scheduleSocialPosts },
		});
		const getTop = (testId: string) =>
			Number.parseFloat(
				/top: ([\d.]+)px/.exec(getByTestId(testId).getAttribute('style') ?? '')?.[1] ?? '0',
			);

		expect(queryByTestId('workflow-preview-input')).not.toBeInTheDocument();
		const xTop = getTop('workflow-preview-output-post-x');
		const linkedinTop = getTop('workflow-preview-output-post-linkedin');
		const redditTop = getTop('workflow-preview-output-post-reddit');
		expect(linkedinTop).toBeGreaterThan(xTop);
		expect(redditTop).toBeGreaterThan(linkedinTop);

		await vi.advanceTimersByTimeAsync(getBuildDurationMs(5));
		await rerender({ example: scheduleSocialPosts, hovered: true });
		await vi.advanceTimersByTimeAsync(NODE_RUNNING_DURATION_MS * 5 + CARD_OUTPUT_DURATION_MS);

		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'done');
		expect(getByTestId('workflow-preview-node-post-x').querySelector('img')?.className).toContain(
			'lightInvert',
		);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('skips the build and the execution animation when reduced motion is preferred', async () => {
		mockReducedMotion('reduce');

		const { getByTestId, rerender, emitted } = renderComponent();
		await nextTick();

		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'idle');
		expect(getByTestId('workflow-preview-stage').className).toContain('revealed');
		expect(emitted()).toHaveProperty('built', [[]]);
		expect(vi.getTimerCount()).toBe(0);

		await rerender({ example: processInvoices, hovered: true });

		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'done');
		expect(getByTestId('workflow-preview-node-add-calendar')).toHaveAttribute(
			'data-state',
			'success',
		);
		expect(getByTestId('workflow-preview-connection-if-discrepancy-flag-invoice')).toHaveAttribute(
			'data-active',
			'true',
		);
	});

	it('clears the active animation timer when unmounted', async () => {
		const { unmount } = renderComponent();

		await vi.advanceTimersByTimeAsync(START_DELAY_MS);
		expect(vi.getTimerCount()).toBe(1);

		unmount();

		expect(vi.getTimerCount()).toBe(0);
	});

	it('scales the stage down to the available width, capped at the preview scale', () => {
		mockElementSize(2000);
		const wide = renderComponent();
		expect(wide.getByTestId('workflow-preview-stage').getAttribute('style')).toContain(
			'scale(0.75)',
		);
		wide.unmount();

		mockElementSize(608);
		const narrow = renderComponent({ props: { example: noCardsExample } });
		// no cards: the stage is the 1216px graph → 608 / 1216
		expect(narrow.getByTestId('workflow-preview-stage').getAttribute('style')).toContain(
			'scale(0.5)',
		);
	});

	it('fills a reserved height and centres the stage in it', () => {
		mockElementSize(2000);
		const { getByTestId } = renderComponent({
			props: { example: noCardsExample, reservedHeight: 500 },
		});

		const stage = getByTestId('workflow-preview-stage');
		expect(stage.parentElement?.style.height).toBe('500px');

		const renderedHeight = Number.parseFloat(stage.style.height) * 0.75;
		expect(renderedHeight).toBeLessThan(500);
		expect(Number.parseFloat(stage.style.top)).toBeCloseTo((500 - renderedHeight) / 2);
	});

	it('grows the stage to contain the cards around the graph', () => {
		const { getByTestId } = renderComponent();

		const getPx = (style: string, property: string) =>
			Number.parseFloat(new RegExp(`${property}: ([\\d.]+)px`).exec(style)?.[1] ?? '0');
		const stageStyle = getByTestId('workflow-preview-stage').getAttribute('style') ?? '';
		const graphStyle = getByTestId('workflow-preview-graph').getAttribute('style') ?? '';

		const graphTop = getPx(graphStyle, 'top');
		expect(graphTop).toBeGreaterThan(0);
		expect(getPx(stageStyle, 'height')).toBeCloseTo(getPx(graphStyle, 'height') + graphTop);
	});
});
