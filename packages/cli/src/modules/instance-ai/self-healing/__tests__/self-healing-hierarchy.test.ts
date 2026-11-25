import { pruneWorkflowHierarchy } from '../self-healing-hierarchy';

const call = (callerWorkflowId: string, calledWorkflowId: string) => ({
	callerWorkflowId,
	calledWorkflowId,
});

describe('pruneWorkflowHierarchy', () => {
	it('returns only the triggering workflow without calls', () => {
		expect(pruneWorkflowHierarchy('root', [], new Set(['root']))).toEqual({
			workflowIds: ['root'],
			calls: [],
		});
	});

	it('keeps a changed child of a changed triggering workflow', () => {
		expect(
			pruneWorkflowHierarchy('root', [call('root', 'child')], new Set(['root', 'child'])),
		).toEqual({ workflowIds: ['root', 'child'], calls: [call('root', 'child')] });
	});

	it('keeps unchanged workflows on the path to a nested change', () => {
		const calls = [call('root', 'middle'), call('middle', 'leaf')];

		expect(pruneWorkflowHierarchy('root', calls, new Set(['leaf']))).toEqual({
			workflowIds: ['root', 'middle', 'leaf'],
			calls,
		});
	});

	it('lists a shared child once with a call from each caller', () => {
		const calls = [call('root', 'b'), call('root', 'a'), call('a', 'shared'), call('b', 'shared')];

		expect(pruneWorkflowHierarchy('root', calls, new Set(['shared']))).toEqual({
			workflowIds: ['root', 'a', 'b', 'shared'],
			calls: [call('root', 'a'), call('root', 'b'), call('a', 'shared'), call('b', 'shared')],
		});
	});

	it('keeps the calls of a cycle on the path to a change', () => {
		const calls = [call('root', 'a'), call('a', 'b'), call('b', 'a')];

		expect(pruneWorkflowHierarchy('root', calls, new Set(['b']))).toEqual({
			workflowIds: ['root', 'a', 'b'],
			calls,
		});
	});

	it('drops branches without a change', () => {
		const calls = [call('root', 'changed'), call('root', 'other'), call('other', 'deeper')];

		expect(pruneWorkflowHierarchy('root', calls, new Set(['changed']))).toEqual({
			workflowIds: ['root', 'changed'],
			calls: [call('root', 'changed')],
		});
	});

	it('lists a changed workflow without a path last and without a caller', () => {
		const calls = [call('root', 'child')];

		expect(pruneWorkflowHierarchy('root', calls, new Set(['child', 'detached']))).toEqual({
			workflowIds: ['root', 'child', 'detached'],
			calls: [call('root', 'child')],
		});
	});

	it('removes duplicate calls', () => {
		const calls = [call('root', 'child'), call('root', 'child')];

		expect(pruneWorkflowHierarchy('root', calls, new Set(['child'])).calls).toEqual([
			call('root', 'child'),
		]);
	});
});
