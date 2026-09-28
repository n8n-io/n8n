import type { PackageWorkflowRequirement } from '../../../spec/requirements.schema';
import { orderBySubWorkflowDependencies } from '../sub-workflow-ordering';

/** Minimal shape the orderer needs; ids double as names for readable assertions. */
const wf = (sourceWorkflowId: string) => ({ sourceWorkflowId });

/** `parent` depends on (calls) each id in `subWorkflowIds`. */
const requiredBy = (id: string, ...parents: string[]): PackageWorkflowRequirement => ({
	id,
	name: id,
	usedByWorkflows: parents,
});

const idsOf = (workflows: Array<{ sourceWorkflowId: string }>) =>
	workflows.map((w) => w.sourceWorkflowId);

describe('orderBySubWorkflowDependencies', () => {
	it('returns the input unchanged when there are no requirements', () => {
		const workflows = [wf('A'), wf('B')];

		expect(orderBySubWorkflowDependencies(workflows, undefined)).toBe(workflows);
		expect(orderBySubWorkflowDependencies(workflows, [])).toBe(workflows);
	});

	it('places a sub-workflow before the workflow that calls it', () => {
		// CHEDDAR (listed first) calls BRIE.
		const ordered = orderBySubWorkflowDependencies(
			[wf('CHEDDAR'), wf('BRIE')],
			[requiredBy('BRIE', 'CHEDDAR')],
		);

		expect(idsOf(ordered)).toEqual(['BRIE', 'CHEDDAR']);
	});

	it('orders a multi-level dependency chain deepest-first', () => {
		// A calls B, B calls C.
		const ordered = orderBySubWorkflowDependencies(
			[wf('A'), wf('B'), wf('C')],
			[requiredBy('B', 'A'), requiredBy('C', 'B')],
		);

		expect(idsOf(ordered)).toEqual(['C', 'B', 'A']);
	});

	it('places a shared dependency before every workflow that calls it', () => {
		// A calls B and C; B and C both call D.
		const ordered = orderBySubWorkflowDependencies(
			[wf('A'), wf('B'), wf('C'), wf('D')],
			[requiredBy('B', 'A'), requiredBy('C', 'A'), requiredBy('D', 'B', 'C')],
		);

		const positions = idsOf(ordered);
		expect(positions.indexOf('D')).toBeLessThan(positions.indexOf('B'));
		expect(positions.indexOf('D')).toBeLessThan(positions.indexOf('C'));
		expect(positions.indexOf('B')).toBeLessThan(positions.indexOf('A'));
		expect(positions.indexOf('C')).toBeLessThan(positions.indexOf('A'));
	});

	it('tolerates a workflow that calls itself', () => {
		const ordered = orderBySubWorkflowDependencies([wf('BRIE')], [requiredBy('BRIE', 'BRIE')]);

		expect(idsOf(ordered)).toEqual(['BRIE']);
	});

	it('tolerates a mutual cycle without looping or dropping workflows', () => {
		// A calls B and B calls A.
		const ordered = orderBySubWorkflowDependencies(
			[wf('A'), wf('B')],
			[requiredBy('B', 'A'), requiredBy('A', 'B')],
		);

		expect(idsOf(ordered).sort()).toEqual(['A', 'B']);
	});

	it('ignores requirements for workflows outside the batch', () => {
		// A depends on GOUDA, which is not part of this import.
		const ordered = orderBySubWorkflowDependencies([wf('A'), wf('B')], [requiredBy('GOUDA', 'A')]);

		expect(idsOf(ordered)).toEqual(['A', 'B']);
	});
});
