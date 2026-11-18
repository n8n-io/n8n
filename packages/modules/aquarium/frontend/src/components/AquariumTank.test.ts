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
		setRegions() {}
		render() {}
	},
}));

// jsdom has no layout, so the tank has no real size. The tank under the pointer is the first one.
vi.mock('../engine/layout', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../engine/layout')>();
	return { ...actual, regionAt: vi.fn((regions: unknown[]) => regions[0]) };
});

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

	it('shows the build, the error workflow and paused runs of a workflow', async () => {
		const { move, getByTestId } = await setup({
			...workflow,
			metrics: { ...workflow.metrics, executionCount: 10, waitingCount: 4, finishedCount: 0 },
			design: {
				nodeCount: 6,
				codeNodeCount: 4,
				branchNodeCount: 0,
				disabledNodeCount: 0,
				duplicateNodeCount: 0,
				subWorkflowCallCount: 0,
				waitNodeCount: 1,
				hasErrorWorkflow: true,
			},
		});

		await move('creature');
		const popup = getByTestId('aquarium-tooltip');

		expect(popup).toHaveTextContent('Maintainability88/100');
		expect(popup).toHaveTextContent('Main issueMany Code nodes');
		expect(popup).toHaveTextContent('Error workflowYes');
		expect(popup).toHaveTextContent('Paused runs4');
	});

	it('reports a workflow whose runs are all paused', async () => {
		const { move, getByTestId } = await setup({
			...workflow,
			metrics: { ...workflow.metrics, executionCount: 5, waitingCount: 5, finishedCount: 0 },
		});

		await move('creature');

		expect(getByTestId('aquarium-tooltip')).toHaveTextContent('StateAll runs paused, not broken');
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

	describe('project view', () => {
		const project = (id: string, name: string) => ({ id, name, type: 'team' });
		const inProject = (key: string, p?: { id: string; name: string; type: string }) => ({
			...workflow,
			key: `workflow:${key}`,
			id: key,
			...(p ? { project: p } : {}),
		});

		beforeEach(() => {
			// jsdom has no layout, so give the tank a real size.
			vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200);
			vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
		});

		it('shows one labelled tank for each project, and one for entities without a project', async () => {
			const entities = [
				inProject('1', project('p1', 'Sales')),
				inProject('2', project('p1', 'Sales')),
				inProject('3', project('p2', 'Data')),
				inProject('4'),
			];
			const { findAllByTestId } = render(AquariumTank, {
				props: { entities, grouping: 'project' },
			});

			const labels = (await findAllByTestId('aquarium-project-label')).map((l) =>
				l.textContent?.trim(),
			);

			expect(labels.sort()).toEqual(['Data', 'No project', 'Sales']);
		});

		it('shows no labels in the single tank', async () => {
			const { queryAllByTestId } = render(AquariumTank, {
				props: { entities: [inProject('1', project('p1', 'Sales'))], grouping: 'single' },
			});

			expect(queryAllByTestId('aquarium-project-label')).toHaveLength(0);
		});

		it('shows the project in the popup', async () => {
			pointAt('creature');
			const { getByTestId } = render(AquariumTank, {
				props: { entities: [inProject('1', project('p1', 'Sales'))], grouping: 'project' },
			});

			await fireEvent.pointerMove(getByTestId('aquarium-canvas'), { clientX: 10, clientY: 10 });

			expect(getByTestId('aquarium-tooltip')).toHaveTextContent('Sales');
		});
	});
});
