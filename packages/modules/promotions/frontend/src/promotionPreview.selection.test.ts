import { billingPreview, billingResources } from './__tests__/preview.fixtures';
import {
	applyPreview,
	buildSelectionGraph,
	clearSelection,
	includedChangeCount,
	initialSelectionState,
	resolveInclusion,
	selectionCheck,
	toggleContainer,
	toggleSelection,
	type SelectionState,
} from './promotionPreview.selection';

const { reconciliation, reminders, kpiReport, formatCurrency, payments } = billingResources;
const graph = buildSelectionGraph(billingPreview(), 'promote');
const selectedState = (...keys: string[]): SelectionState => ({
	mode: 'custom',
	selected: new Set(keys),
});

describe('promotion preview selection', () => {
	it('should include a shared table once and keep it while any workflow that uses it is selected', () => {
		let state = selectedState(reconciliation.key, reminders.key);
		let inclusion = resolveInclusion(graph, state.selected);
		expect(inclusion.reasons.get('dataTable:t1')).toEqual({
			kind: 'required',
			by: [reconciliation.key, reminders.key],
		});
		// Both workflows, their folder, the table, the credential and the tag.
		expect(inclusion.included.size).toBe(6);
		// The workflow, the folder rename and the table.
		expect(includedChangeCount(graph, inclusion)).toBe(3);

		state = toggleSelection(state, graph, reconciliation.key);
		inclusion = resolveInclusion(graph, state.selected);
		expect(inclusion.reasons.get('dataTable:t1')).toEqual({
			kind: 'required',
			by: [reminders.key],
		});
		expect(inclusion.included).toEqual(new Set([reminders.key, 'folder:f1', 'dataTable:t1']));
	});

	it('should leave a called sub-workflow and its dependencies out until the user selects it', () => {
		let state = selectedState(reconciliation.key);
		let inclusion = resolveInclusion(graph, state.selected);
		expect(inclusion.reasons.get(formatCurrency.key)).toEqual({
			kind: 'calledOnly',
			by: [reconciliation.key],
		});
		expect(inclusion.included).toEqual(
			new Set([reconciliation.key, 'folder:f1', 'dataTable:t1', 'credential:c1', 'tag:g1']),
		);

		state = toggleSelection(state, graph, formatCurrency.key);
		state = toggleSelection(state, graph, reconciliation.key);
		inclusion = resolveInclusion(graph, state.selected);
		expect(inclusion.reasons.get(formatCurrency.key)).toEqual({ kind: 'selected' });
		expect(inclusion.reasons.get('credential:c2')).toEqual({
			kind: 'required',
			by: [formatCurrency.key],
		});
		expect(inclusion.reasons.get('workflow:w9')).toEqual({
			kind: 'calledOnly',
			by: [formatCurrency.key],
		});
	});

	it('should include a changed folder with a selected workflow inside it, but not an unchanged one', () => {
		const inclusion = resolveInclusion(graph, new Set([reconciliation.key, kpiReport.key]));

		expect(inclusion.reasons.get('folder:f1')).toEqual({
			kind: 'container',
			by: [reconciliation.key],
		});
		// "Reports" holds the selected KPI report but does not change, so it stays structure only.
		expect(inclusion.included).toEqual(
			new Set([
				reconciliation.key,
				kpiReport.key,
				'folder:f1',
				'dataTable:t1',
				'credential:c1',
				'tag:g1',
				'variable:global:API_URL',
			]),
		);
	});

	it('should include a new or renamed folder on Apply only with a selected workflow inside it', () => {
		const incoming = buildSelectionGraph(
			billingPreview({
				resources: [
					billingResources.project,
					payments,
					{ ...reconciliation, parentKey: 'project:p1' },
					{ ...billingResources.reports, change: 'added' },
					kpiReport,
				],
				dependencies: [],
			}),
			'apply',
		);

		const inclusion = resolveInclusion(incoming, new Set([reconciliation.key]));

		// The selected workflow is at the project root, so Apply neither creates "Reports" nor renames
		// "Payments".
		expect(inclusion.included).toEqual(new Set([reconciliation.key]));
	});

	it('should select a renamed folder with its workflows, and keep only the folder when its workflows are cleared', () => {
		const renamedFolder = { ...payments, selectable: true };
		const withFolder = buildSelectionGraph(
			billingPreview({
				resources: billingPreview().resources.map((r) =>
					r.key === payments.key ? renamedFolder : r,
				),
			}),
			'promote',
		);
		const check = (selected: ReadonlySet<string>) =>
			selectionCheck(withFolder, renamedFolder, {
				selected,
				inclusion: resolveInclusion(withFolder, selected),
				disabled: new Set(),
				locked: false,
			});

		let state = selectedState(reconciliation.key);
		expect(check(state.selected)).toMatchObject({ checked: false, indeterminate: true });

		state = toggleContainer(state, withFolder, payments.key);
		expect(state.selected).toEqual(new Set([payments.key, reconciliation.key, reminders.key]));
		expect(check(state.selected)).toMatchObject({ checked: true, indeterminate: false });

		state = toggleSelection(state, withFolder, reconciliation.key);
		state = toggleSelection(state, withFolder, reminders.key);
		expect(state.selected).toEqual(new Set([payments.key]));
		expect(check(state.selected)).toMatchObject({ checked: false, indeterminate: true });
	});

	it('should include a renamed project with any selection, on Promote and on Apply', () => {
		const renamedProject = {
			...billingResources.project,
			previousName: 'Old billing',
			change: 'modified' as const,
			selectable: true,
		};
		const preview = billingPreview({
			resources: billingPreview().resources.map((r) =>
				r.key === renamedProject.key ? renamedProject : r,
			),
		});

		for (const direction of ['promote', 'apply'] as const) {
			const inclusion = resolveInclusion(
				buildSelectionGraph(preview, direction),
				new Set([kpiReport.key]),
			);
			expect(inclusion.included.has(renamedProject.key)).toBe(true);
		}
	});

	it('should select every workflow on load until the user changes the selection', () => {
		const { state } = applyPreview(initialSelectionState, graph);

		expect(state.selected).toEqual(
			new Set([reconciliation.key, reminders.key, kpiReport.key, formatCurrency.key]),
		);

		const smallerGraph = buildSelectionGraph(
			billingPreview({
				resources: billingPreview().resources.filter((r) => r.key !== kpiReport.key),
			}),
			'promote',
		);
		expect(applyPreview(state, smallerGraph).state.selected).toEqual(
			new Set([reconciliation.key, reminders.key, formatCurrency.key]),
		);
	});

	it('should keep the user selection on refresh and report workflows that are no longer listed', () => {
		const refreshed = buildSelectionGraph(
			billingPreview({
				resources: billingPreview().resources.filter((r) => r.key !== reminders.key),
			}),
			'promote',
		);

		const result = applyPreview(selectedState(reconciliation.key, reminders.key), refreshed);
		expect(result.state.selected).toEqual(new Set([reconciliation.key]));
		expect(result.dropped).toEqual([reminders.key]);

		expect(applyPreview(clearSelection(), refreshed).state.selected.size).toBe(0);
	});

	it('should leave a blocked workflow out until its blockers are resolved, and never remove a selected one', () => {
		const blocked = new Set([kpiReport.key]);

		let { state } = applyPreview(initialSelectionState, graph, blocked);
		expect(state.selected.has(kpiReport.key)).toBe(false);
		expect(toggleSelection(state, graph, kpiReport.key, blocked)).toBe(state);
		// The project counts only the workflows that users can add, so they are all selected and a click clears them.
		expect(toggleContainer(state, graph, 'project:p1', blocked).selected).toEqual(new Set());

		// The user created the missing credential, and the refreshed check has no blockers.
		state = applyPreview(state, graph).state;
		expect(state.selected.has(kpiReport.key)).toBe(true);

		// A later refresh blocks it again. It stays selected until the user clears it.
		state = applyPreview(state, graph, blocked).state;
		expect(state.selected.has(kpiReport.key)).toBe(true);
		state = toggleSelection(state, graph, kpiReport.key, blocked);
		expect(state.selected.has(kpiReport.key)).toBe(false);
	});

	it('should keep the checkbox of a selected workflow clearable after it becomes blocked, and lock every checkbox while the operation runs', () => {
		const selected = new Set([reconciliation.key, kpiReport.key]);
		const state = {
			selected,
			inclusion: resolveInclusion(graph, selected),
			disabled: new Set([kpiReport.key]),
			locked: false,
		};
		expect(selectionCheck(graph, kpiReport, state)).toEqual({
			checked: true,
			indeterminate: false,
			disabled: false,
		});

		const locked = { ...state, locked: true };
		expect(selectionCheck(graph, kpiReport, locked).disabled).toBe(true);
		expect(selectionCheck(graph, payments, locked).disabled).toBe(true);
	});
});
