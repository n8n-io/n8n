import { computeVariableLimitFailure, dedupeCreationsByDestination } from '../variable.types';

describe('dedupeCreationsByDestination', () => {
	it('keeps creations that land in different destinations', () => {
		expect(
			dedupeCreationsByDestination([
				{ name: 'API_KEY', usedByWorkflows: ['wf-1'] },
				{ name: 'API_KEY', projectId: 'proj-a', usedByWorkflows: ['wf-1'] },
				{ name: 'API_KEY', projectId: 'proj-b', usedByWorkflows: ['wf-1'] },
			]),
		).toHaveLength(3);
	});

	it('collapses a destination planned by several scopes into one creation', () => {
		expect(
			dedupeCreationsByDestination([
				{ name: 'SHARED_URL', projectId: 'proj-a', usedByWorkflows: ['wf-1'] },
				{ name: 'SHARED_URL', projectId: 'proj-a', usedByWorkflows: ['wf-1'] },
			]),
		).toEqual([{ name: 'SHARED_URL', projectId: 'proj-a', usedByWorkflows: ['wf-1'] }]);
	});

	it('unions the workflows behind a collapsed destination', () => {
		expect(
			dedupeCreationsByDestination([
				{ name: 'SHARED_URL', usedByWorkflows: ['wf-2'] },
				{ name: 'SHARED_URL', usedByWorkflows: ['wf-1', 'wf-2'] },
			]),
		).toEqual([{ name: 'SHARED_URL', usedByWorkflows: ['wf-1', 'wf-2'] }]);
	});

	it('returns copies, so writing to the result cannot reach the plan it came from', () => {
		const planCreations = [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }];

		// Stands in for any later write to the returned creations; the plan is applied after this.
		const [returned] = dedupeCreationsByDestination(planCreations);
		returned.usedByWorkflows.push('wf-2');

		expect(planCreations[0].usedByWorkflows).toEqual(['wf-1']);
	});
});

describe('computeVariableLimitFailure', () => {
	const creation = (name: string, usedByWorkflows: string[]) => ({ name, usedByWorkflows });

	it('reports nothing when the licence grants an unlimited quota', () => {
		expect(computeVariableLimitFailure([creation('API_KEY', ['wf-1'])], null)).toBeUndefined();
	});

	it('reports nothing when there is nothing to create', () => {
		expect(computeVariableLimitFailure([], { limit: 5, remaining: 0 })).toBeUndefined();
	});

	it('reports nothing when the creations fit', () => {
		expect(
			computeVariableLimitFailure([creation('API_KEY', ['wf-1'])], { limit: 5, remaining: 1 }),
		).toBeUndefined();
	});

	it('reports the overrun with sorted, deduplicated names and workflows', () => {
		// Four of the five allowed rows already exist, so two more do not fit in the one left.
		expect(
			computeVariableLimitFailure(
				[creation('API_TOKEN', ['wf-2', 'wf-1']), creation('API_KEY', ['wf-1'])],
				{ limit: 5, remaining: 1 },
			),
		).toEqual({
			limit: 5,
			remaining: 1,
			requested: 2,
			names: ['API_KEY', 'API_TOKEN'],
			usedByWorkflows: ['wf-1', 'wf-2'],
		});
	});
});
