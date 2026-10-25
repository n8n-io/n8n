// Experiment cleanup (124_workflow_previews_above_assistant)
import { describe, expect, it } from 'vitest';
import type { BaseTextKey } from '@n8n/i18n';

import { GRID_SIZE } from '@/app/utils/nodeViewUtils';

import {
	CARD_NATIVE_WIDTH,
	CARD_SCALE,
	NODE_HALF_SIZE,
	NODE_LABEL_HEIGHT,
	NODE_SIZE,
	PREVIEW_SCALE,
	computePreviewLayout,
	getRenderScale,
	getReservedPreviewHeight,
} from './layout';
import type { WorkflowPreviewExample } from './types';

const CARD_WIDTH = CARD_NATIVE_WIDTH * CARD_SCALE;
const CARD_GAP = GRID_SIZE * 2;
const TEXT_KEY: BaseTextKey =
	'experiments.workflowPreviewsAboveAssistant.examples.scoreMyLeads.title';

function createExample(overrides: Partial<WorkflowPreviewExample> = {}): WorkflowPreviewExample {
	return {
		id: 'example',
		titleKey: TEXT_KEY,
		promptKey: TEXT_KEY,
		nodes: [
			{ id: 'trigger', labelKey: TEXT_KEY, icon: 'bolt', position: { x: 0, y: 0 } },
			{ id: 'action', labelKey: TEXT_KEY, icon: 'bolt', position: { x: 200, y: 0 } },
		],
		connections: [{ source: 'trigger', target: 'action' }],
		...overrides,
	};
}

const salesforceCard = {
	type: 'salesforce-card',
	icon: 'salesforce',
	titleKey: TEXT_KEY,
	subtitleKey: TEXT_KEY,
} as const;

describe('computePreviewLayout', () => {
	it('treats nodes that are never a connection target as triggers', () => {
		const { triggerNodeIds } = computePreviewLayout(createExample());

		expect([...triggerNodeIds]).toEqual(['trigger']);
	});

	it('pads the graph bounds by half a node on each side and the label below', () => {
		const { graphBounds } = computePreviewLayout(createExample());

		expect(graphBounds).toEqual({
			minX: -NODE_HALF_SIZE,
			minY: -NODE_HALF_SIZE,
			width: 200 + NODE_SIZE,
			height: NODE_SIZE + NODE_LABEL_HEIGHT,
		});
	});

	it('uses the graph bounds as the stage when there are no visualizations', () => {
		const { graphBounds, stageBounds, inputCardBox, outputCardBoxes } = computePreviewLayout(
			createExample(),
		);

		expect(inputCardBox).toBeUndefined();
		expect(outputCardBoxes).toEqual([]);
		expect(stageBounds).toEqual({
			left: 0,
			top: 0,
			width: graphBounds.width,
			height: graphBounds.height,
		});
	});

	it('places the input card left of the trigger and widens the stage to fit it', () => {
		const { graphBounds, inputCardBox, stageBounds } = computePreviewLayout(
			createExample({ inputVisualization: salesforceCard }),
		);

		expect(inputCardBox?.left).toBeCloseTo(-CARD_GAP - CARD_WIDTH);
		expect(inputCardBox?.top).toBeCloseTo(0);
		expect(stageBounds.left).toBeCloseTo(-CARD_GAP - CARD_WIDTH);
		expect(stageBounds.width).toBeCloseTo(graphBounds.width + CARD_GAP + CARD_WIDTH);
	});

	it('places output cards right of their target node', () => {
		const { graphBounds, outputCardBoxes, stageBounds } = computePreviewLayout(
			createExample({ outputVisualizations: [{ ...salesforceCard, targetNodeId: 'action' }] }),
		);

		expect(outputCardBoxes[0].left).toBeCloseTo(graphBounds.width + CARD_GAP);
		expect(stageBounds.width).toBeCloseTo(graphBounds.width + CARD_GAP + CARD_WIDTH);
	});

	it('pushes overlapping output cards apart by the output gap', () => {
		const { outputCardBoxes } = computePreviewLayout(
			createExample({
				outputVisualizations: [
					{ ...salesforceCard, targetNodeId: 'action' },
					{
						type: 'slack-message',
						senderKey: TEXT_KEY,
						messageKey: TEXT_KEY,
						targetNodeId: 'action',
					},
				],
			}),
		);
		const [upper, lower] = [...outputCardBoxes].sort((a, b) => a.top - b.top);

		expect(lower.top).toBeCloseTo(upper.top + upper.height + GRID_SIZE);
	});
});

describe('getRenderScale', () => {
	it('falls back to the preview scale before the container is measured', () => {
		expect(getRenderScale(1000, 0)).toBe(PREVIEW_SCALE);
	});

	it('never scales above the preview scale in a wide container', () => {
		expect(getRenderScale(100, 1000)).toBe(PREVIEW_SCALE);
	});

	it('shrinks the stage to fit a narrow container', () => {
		expect(getRenderScale(1000, 500)).toBe(0.5);
	});
});

describe('getReservedPreviewHeight', () => {
	it('reserves no height without examples', () => {
		expect(getReservedPreviewHeight([], 1000)).toBe(0);
	});

	it('reserves the tallest scaled stage across the examples', () => {
		const short = createExample();
		const tall = createExample({
			nodes: [
				{ id: 'trigger', labelKey: TEXT_KEY, icon: 'bolt', position: { x: 0, y: 0 } },
				{ id: 'action', labelKey: TEXT_KEY, icon: 'bolt', position: { x: 200, y: 300 } },
			],
		});
		const tallHeight = computePreviewLayout(tall).stageBounds.height;

		expect(getReservedPreviewHeight([short, tall], 10_000)).toBeCloseTo(tallHeight * PREVIEW_SCALE);
	});

	it('reserves less height when the container gets narrower', () => {
		const examples = [createExample({ inputVisualization: salesforceCard })];

		expect(getReservedPreviewHeight(examples, 200)).toBeLessThan(
			getReservedPreviewHeight(examples, 10_000),
		);
	});
});
