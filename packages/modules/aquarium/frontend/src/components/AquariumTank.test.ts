import { fireEvent, render } from '@testing-library/vue';

import type { AquariumEntity } from '../aquarium.types';
import { findCreatureAt } from '../engine/simulation';
import { emptyMetrics } from '../sources/source.utils';
import AquariumTank from './AquariumTank.vue';

// jsdom has no 2D canvas context.
const viewSizes = vi.hoisted(() => [] as Array<{ width: number; height: number }>);

vi.mock('../engine/renderer', () => ({
	AquariumRenderer: class {
		setViewSize(size: { width: number; height: number }) {
			viewSizes.push(size);
		}
		setWorld() {}
		render() {}
	},
}));

vi.mock('../engine/simulation', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../engine/simulation')>();
	return { ...actual, findCreatureAt: vi.fn() };
});

const workflow: AquariumEntity = {
	key: 'workflow:1',
	id: '1',
	kind: 'workflow',
	name: 'Lead enrichment',
	route: { name: 'NodeViewExisting', params: { workflowId: '1' } },
	metrics: { ...emptyMetrics(), complexity: 3 },
};

/** Makes the next pointer move land on the first creature, or on water. */
function pointAt(target: 'creature' | 'water') {
	vi.mocked(findCreatureAt).mockImplementation((creatures) =>
		target === 'creature' ? creatures[0] : undefined,
	);
}

async function setup(entity: AquariumEntity = workflow) {
	const result = render(AquariumTank, { props: { entities: [entity] } });
	const canvas = result.getByTestId('aquarium-canvas');
	const move = async (target: 'creature' | 'water') => {
		pointAt(target);
		await fireEvent.pointerMove(canvas, { clientX: 10, clientY: 10 });
	};
	return { ...result, canvas, move };
}

describe('AquariumTank', () => {
	it('shows a popup on hover, without the open button', async () => {
		const { move, getByTestId, queryByTestId } = await setup();

		await move('creature');

		expect(getByTestId('aquarium-tooltip')).toHaveTextContent('Lead enrichment');
		expect(queryByTestId('aquarium-tooltip-open')).not.toBeInTheDocument();
	});

	it('pins the popup on click, and keeps it when the pointer leaves', async () => {
		const { move, canvas, getByTestId } = await setup();

		await move('creature');
		await fireEvent.click(canvas);
		await move('water');

		expect(getByTestId('aquarium-tooltip')).toHaveTextContent('Lead enrichment');
		expect(getByTestId('aquarium-tooltip-open')).toBeInTheDocument();
	});

	it('emits select when the open button is clicked', async () => {
		const { move, canvas, getByTestId, emitted } = await setup();

		await move('creature');
		await fireEvent.click(canvas);
		await fireEvent.click(getByTestId('aquarium-tooltip-open'));

		expect(emitted('select')).toEqual([[workflow]]);
	});

	it('does not navigate on a click on the creature', async () => {
		const { move, canvas, emitted } = await setup();

		await move('creature');
		await fireEvent.click(canvas);

		expect(emitted('select')).toBeUndefined();
	});

	it('closes the pinned popup on a click on the water', async () => {
		const { move, canvas, queryByTestId } = await setup();

		await move('creature');
		await fireEvent.click(canvas);
		await move('water');
		await fireEvent.click(canvas);

		expect(queryByTestId('aquarium-tooltip')).not.toBeInTheDocument();
	});

	it('closes the pinned popup on Escape', async () => {
		const { move, canvas, queryByTestId } = await setup();

		await move('creature');
		await fireEvent.click(canvas);
		await move('water');
		await fireEvent.keyDown(document, { key: 'Escape' });

		expect(queryByTestId('aquarium-tooltip')).not.toBeInTheDocument();
	});

	it('has no open button for an entity without a route', async () => {
		const { move, canvas, getByTestId, queryByTestId } = await setup({
			...workflow,
			route: undefined,
		});

		await move('creature');
		await fireEvent.click(canvas);

		expect(getByTestId('aquarium-tooltip')).toBeInTheDocument();
		expect(queryByTestId('aquarium-tooltip-open')).not.toBeInTheDocument();
	});

	it('rounds the average run time to whole milliseconds', async () => {
		const { move, getByTestId } = await setup({
			...workflow,
			metrics: { ...workflow.metrics, executionCount: 3, averageRunTimeMs: 3033.4133 },
		});

		await move('creature');

		expect(getByTestId('aquarium-tooltip')).toHaveTextContent('3.033s');
	});

	describe('zoom and pan', () => {
		beforeEach(() => {
			viewSizes.length = 0;
		});

		it('does not pin a popup after a drag', async () => {
			const { move, canvas, queryByTestId } = await setup();
			await move('creature');

			await fireEvent.pointerDown(canvas, { button: 0, buttons: 1, clientX: 10, clientY: 10 });
			await fireEvent.pointerMove(canvas, { buttons: 1, clientX: 60, clientY: 40 });
			await fireEvent.pointerUp(canvas, { button: 0 });
			await fireEvent.click(canvas);
			await move('water');

			expect(queryByTestId('aquarium-tooltip')).not.toBeInTheDocument();
		});

		it('still pins on a click with a small pointer movement', async () => {
			const { move, canvas, getByTestId } = await setup();
			await move('creature');

			await fireEvent.pointerDown(canvas, { button: 0, buttons: 1, clientX: 10, clientY: 10 });
			pointAt('creature');
			await fireEvent.pointerMove(canvas, { buttons: 1, clientX: 11, clientY: 11 });
			await fireEvent.pointerUp(canvas, { button: 0 });
			await fireEvent.click(canvas);

			expect(getByTestId('aquarium-tooltip-open')).toBeInTheDocument();
		});

		it('zooms in with the wheel and the buttons, and back out to show all', async () => {
			const { canvas, getByTestId } = await setup();
			const widthNow = () => viewSizes.at(-1)?.width ?? 0;
			const start = widthNow();

			await fireEvent.wheel(canvas, { deltaY: -100, clientX: 10, clientY: 10 });
			const afterWheel = widthNow();
			await fireEvent.click(getByTestId('aquarium-zoom-in'));
			const afterButton = widthNow();
			await fireEvent.click(getByTestId('aquarium-zoom-fit'));

			// A higher zoom shows fewer logical pixels.
			expect(afterWheel).toBeLessThan(start);
			expect(afterButton).toBeLessThan(afterWheel);
			expect(widthNow()).toBeCloseTo(start);
		});
	});
});
