import { billingPreview } from './__tests__/preview.fixtures';
import {
	buildSelectionGraph,
	groupCheck,
	resolveInclusion,
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
			const none = groupCheck(graph, resolveInclusion(graph, new Set()), workflows);
			expect(none).toMatchObject({ state: 'unchecked', included: 0, total: workflows.length });

			const some = groupCheck(graph, resolveInclusion(graph, new Set(['workflow:w2'])), workflows);
			expect(some).toMatchObject({ state: 'indeterminate', included: 1 });

			const all = groupCheck(graph, resolveInclusion(graph, new Set(workflows)), workflows);
			expect(all).toMatchObject({ state: 'checked', included: workflows.length });
		});

		it('should count a dependency that a selected workflow needs, although the group is read-only', () => {
			const { graph, members } = graphOf();
			const inclusion = resolveInclusion(graph, new Set(['workflow:w1']));

			expect(groupCheck(graph, inclusion, members('group:credential'))).toEqual({
				state: 'indeterminate',
				included: 1,
				total: 2,
				canToggle: false,
			});
		});

		it('should not let users toggle a group whose resources are all blocked', () => {
			const { graph, members } = graphOf();
			const workflows = members('section:workflows');

			const check = groupCheck(
				graph,
				resolveInclusion(graph, new Set()),
				workflows,
				new Set(workflows),
			);

			expect(check.canToggle).toBe(false);
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

		it('should keep a credential included while a selected workflow needs it, after the group is cleared', () => {
			const { graph, members } = graphOf({ selectableCredentials: true });
			const credentials = members('group:credential');
			const toggle = (current: SelectionState) =>
				toggleGroup(current, graph, resolveInclusion(graph, current.selected), credentials);

			// "Stripe" is needed by the selected workflow, "Currency API" is not.
			let current = toggle(state('workflow:w1'));
			// The header leaves the locked credential alone and selects the other one.
			expect(current.selected).toEqual(new Set(['workflow:w1', 'credential:c2']));

			current = toggle(current);
			expect(current.selected).toEqual(new Set(['workflow:w1']));
			expect(resolveInclusion(graph, current.selected).included.has('credential:c1')).toBe(true);
			expect(resolveInclusion(graph, current.selected).included.has('credential:c2')).toBe(false);
		});
	});

	describe('locked resources', () => {
		it('should lock a credential that a selected workflow needs, even when the user selected it too', () => {
			const { graph } = graphOf({ selectableCredentials: true });
			const selected = new Set(['workflow:w1', 'credential:c1']);
			const inclusion = resolveInclusion(graph, selected);
			const stripe = graph.resources.get('credential:c1')!;

			expect(
				selectionCheck(graph, stripe, { selected, inclusion, disabled: new Set(), locked: false }),
			).toEqual({ checked: true, indeterminate: false, disabled: true });
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
});
