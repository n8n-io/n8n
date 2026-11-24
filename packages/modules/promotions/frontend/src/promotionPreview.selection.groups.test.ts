import { billingPreview } from './__tests__/preview.fixtures';
import {
	buildSelectionGraph,
	groupCheck,
	resolveInclusion,
	rowHint,
	selectionCheck,
	toggleGroup,
	type SelectionState,
} from './promotionPreview.selection';
import { buildPreviewTree } from './promotionPreview.tree';

/** The fixture has two credentials that no user can select, so one variant makes them selectable. */
function graphOf({ selectableCredentials = false } = {}) {
	const preview = billingPreview();
	const withCredentials = {
		...preview,
		resources: preview.resources.map((resource) =>
			resource.type === 'credential'
				? { ...resource, change: 'added' as const, selectable: selectableCredentials }
				: resource,
		),
	};
	const graph = buildSelectionGraph(withCredentials, 'promote');
	const tree = buildPreviewTree(withCredentials, { workflows: 'Workflows', group: (id) => id });
	const members = (id: string) => tree.find((item) => item.id === id)?.memberKeys ?? [];
	return { graph, members };
}

const state = (...keys: string[]): SelectionState => ({ mode: 'custom', selected: new Set(keys) });

describe('promotion preview groups', () => {
	describe('groupCheck', () => {
		it('should count the included workflows and leave projects and folders out', () => {
			const { graph, members } = graphOf();
			const workflows = members('section:workflows');

			expect(workflows.every((key) => key.startsWith('workflow:'))).toBe(true);
			const none = groupCheck(resolveInclusion(graph, new Set()), workflows);
			expect(none).toMatchObject({ state: 'unchecked', included: 0, total: workflows.length });

			const some = groupCheck(resolveInclusion(graph, new Set(['workflow:w2'])), workflows);
			expect(some).toMatchObject({ state: 'indeterminate', included: 1 });

			const all = groupCheck(resolveInclusion(graph, new Set(workflows)), workflows);
			expect(all).toMatchObject({ state: 'checked', included: workflows.length });
		});

		it('should count a dependency that a selected workflow needs, although the group is read-only', () => {
			const { graph, members } = graphOf();
			const inclusion = resolveInclusion(graph, new Set(['workflow:w1']));

			expect(groupCheck(inclusion, members('group:credential'))).toEqual({
				state: 'indeterminate',
				included: 1,
				total: 2,
			});
		});
	});

	describe('toggleGroup', () => {
		it('should select every workflow, then clear them all when every one is included', () => {
			const { graph, members } = graphOf();
			const workflows = members('section:workflows');
			const toggle = (current: SelectionState) =>
				toggleGroup(current, graph, resolveInclusion(graph, current.selected), workflows);

			const selected = toggle(state());
			expect(selected.selected).toEqual(new Set(workflows));

			expect(toggle(selected).selected.size).toBe(0);
		});

		it('should select the rest of a partly selected group', () => {
			const { graph, members } = graphOf();
			const workflows = members('section:workflows');
			const current = state('workflow:w2');

			const next = toggleGroup(
				current,
				graph,
				resolveInclusion(graph, current.selected),
				workflows,
			);

			expect(next.selected).toEqual(new Set(workflows));
		});

		it('should not add a blocked workflow', () => {
			const { graph, members } = graphOf();
			const workflows = members('section:workflows');
			const blocked = new Set(['workflow:w2']);

			const next = toggleGroup(
				state(),
				graph,
				resolveInclusion(graph, new Set()),
				workflows,
				blocked,
			);

			expect(next.selected.has('workflow:w2')).toBe(false);
			expect(next.selected.has('workflow:w1')).toBe(true);
		});

		it('should clear the workflows that need a group of dependencies, when its box is cleared', () => {
			const { graph, members } = graphOf();
			const current = state('workflow:w1');

			const next = toggleGroup(
				current,
				graph,
				resolveInclusion(graph, current.selected),
				members('group:credential'),
			);

			expect(next.selected.has('workflow:w1')).toBe(false);
		});

		it('should change nothing in a group of dependencies that nothing needs', () => {
			const { graph, members } = graphOf();
			const current = state();

			const next = toggleGroup(
				current,
				graph,
				resolveInclusion(graph, current.selected),
				members('group:credential'),
			);

			expect(next).toBe(current);
		});

		it('should keep a credential included while a selected workflow needs it, after the group is cleared', () => {
			const { graph, members } = graphOf({ selectableCredentials: true });
			const credentials = members('group:credential');
			const toggle = (current: SelectionState) =>
				toggleGroup(current, graph, resolveInclusion(graph, current.selected), credentials);

			// "Stripe" is needed by the selected workflow, "Currency API" is not.
			let current = toggle(state('workflow:w1'));
			expect(current.selected).toEqual(new Set(['workflow:w1', ...credentials]));

			current = toggle(current);
			expect(current.selected).toEqual(new Set(['workflow:w1']));
			expect(resolveInclusion(graph, current.selected).included.has('credential:c1')).toBe(true);
			expect(resolveInclusion(graph, current.selected).included.has('credential:c2')).toBe(false);
		});
	});

	describe('locked resources', () => {
		it('should keep a credential checked while a selected workflow needs it, even when the user selected it too', () => {
			const { graph } = graphOf({ selectableCredentials: true });
			const selected = new Set(['workflow:w1', 'credential:c1']);
			const inclusion = resolveInclusion(graph, selected);
			const stripe = graph.resources.get('credential:c1')!;

			expect(
				selectionCheck(graph, stripe, { selected, inclusion, disabled: new Set(), locked: false }),
			).toEqual({ checked: true, indeterminate: false, disabled: false });
		});

		it('should unlock the credential when no selected workflow needs it any more', () => {
			const { graph } = graphOf({ selectableCredentials: true });
			const selected = new Set(['credential:c1']);
			const inclusion = resolveInclusion(graph, selected);
			const stripe = graph.resources.get('credential:c1')!;

			expect(
				selectionCheck(graph, stripe, { selected, inclusion, disabled: new Set(), locked: false }),
			).toEqual({ checked: true, indeterminate: false, disabled: false });
		});
	});

	describe('rowHint', () => {
		const hintOf = (key: string, ...selected: string[]) => {
			const { graph } = graphOf();
			return rowHint(graph, resolveInclusion(graph, new Set(selected)), graph.resources.get(key)!);
		};

		it('should name what needs a locked resource', () => {
			expect(hintOf('dataTable:t1', 'workflow:w1')).toEqual({
				kind: 'requiredBy',
				names: ['Invoice reconciliation'],
				more: 0,
			});
		});

		it('should name two resources and count the others', () => {
			const { graph } = graphOf();
			// Three selected workflows need the same table.
			const extended = buildSelectionGraph(
				{
					resources: [...graph.resources.values()],
					dependencies: [
						{ workflowKey: 'workflow:w1', resourceKey: 'dataTable:t1', included: true },
						{ workflowKey: 'workflow:w2', resourceKey: 'dataTable:t1', included: true },
						{ workflowKey: 'workflow:w3', resourceKey: 'dataTable:t1', included: true },
					],
				},
				'promote',
			);
			const selected = new Set(['workflow:w1', 'workflow:w2', 'workflow:w3']);

			expect(
				rowHint(
					extended,
					resolveInclusion(extended, selected),
					extended.resources.get('dataTable:t1')!,
				),
			).toMatchObject({ kind: 'requiredBy', names: expect.any(Array), more: 1 });
		});

		it('should say how many dependencies a workflow uses', () => {
			expect(hintOf('workflow:w1')).toEqual({ kind: 'uses', count: 3 });
		});

		it('should give a resource without dependencies no hint', () => {
			expect(hintOf('workflow:w9')).toBeUndefined();
		});
	});
});
