import { billingPreview, billingResources } from './__tests__/preview.fixtures';
import {
	applyPreview,
	buildSelectionGraph,
	clearSelection,
	containerCheckState,
	includedChangeCount,
	initialSelectionState,
	resolveInclusion,
	toggleContainer,
	toggleSelection,
	type SelectionState,
} from './promotionPreview.selection';

const { reconciliation, reminders, kpiReport, formatCurrency } = billingResources;
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

	it('should include every changed folder on Apply, also one without a selected workflow', () => {
		const incoming = buildSelectionGraph(
			billingPreview({
				resources: [
					billingResources.project,
					{ ...reconciliation, parentKey: 'project:p1' },
					{ ...billingResources.reports, change: 'added' },
					kpiReport,
				],
				dependencies: [],
			}),
			'apply',
		);

		const inclusion = resolveInclusion(incoming, new Set([reconciliation.key]));

		// Apply creates every new folder of the project, but imports only the selected workflows.
		expect(inclusion.included).toEqual(new Set([reconciliation.key, billingResources.reports.key]));
	});

	it('should select or clear every workflow inside a folder from the folder checkbox', () => {
		let state = selectedState(reconciliation.key);
		expect(containerCheckState(graph, state.selected, 'folder:f1')).toBe('indeterminate');

		state = toggleContainer(state, graph, 'folder:f1');
		expect(state.selected).toEqual(new Set([reconciliation.key, reminders.key]));
		expect(containerCheckState(graph, state.selected, 'folder:f1')).toBe('checked');

		state = toggleContainer(state, graph, 'folder:f1');
		expect(state.selected.size).toBe(0);
		expect(containerCheckState(graph, state.selected, 'project:p1')).toBe('unchecked');
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
});
