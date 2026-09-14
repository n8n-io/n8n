import { fireEvent } from '@testing-library/vue';
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';
import { renderComponent } from '@/__tests__/render';
import NodesAttachmentChips from '../NodesAttachmentChips.vue';
import type { InstanceAiNodesAttachment } from '@n8n/api-types';
import { sleep } from '@n8n/utils/sleep';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

const att = (sets: InstanceAiNodesAttachment['sets']): InstanceAiNodesAttachment => ({
	type: 'nodes',
	workflowId: 'w1',
	sets,
});
const nodeRefs = (...names: string[]) => names.map((name, i) => ({ id: `n${i}`, name }));
// Flushes the macrotask handlePanelFocusOut defers its close check to.
const flushFocusOutCheck = () => sleep(0);

describe('NodesAttachmentChips', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('one set, size 1, no group → single named chip', () => {
		const { getAllByTestId, queryAllByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A') }]), isRemovable: true },
		});
		expect(getAllByTestId('nodes-chip-node')).toHaveLength(1);
		expect(queryAllByTestId('nodes-chip-bundle')).toHaveLength(0);
	});

	it('one set, size > 1 → single bundled chip, no per-node chips', () => {
		const { getAllByTestId, queryAllByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C') }]), isRemovable: true },
		});
		expect(getAllByTestId('nodes-chip-bundle')).toHaveLength(1);
		expect(queryAllByTestId('nodes-chip-node')).toHaveLength(0);
	});

	it('two sets (size 1 + size 2) → exactly two chips, never exploded to 3', () => {
		const { queryAllByTestId } = renderComponent(NodesAttachmentChips, {
			props: {
				attachment: att([{ nodes: nodeRefs('A') }, { nodes: nodeRefs('B', 'C') }]),
				isRemovable: true,
			},
		});
		const named = queryAllByTestId('nodes-chip-node').length;
		const bundled = queryAllByTestId('nodes-chip-bundle').length;
		expect(named + bundled).toBe(2);
	});

	it('a grouped set → group chip with the group name and no expand caret', () => {
		const { getByTestId, queryByTestId } = renderComponent(NodesAttachmentChips, {
			props: {
				attachment: att([
					{ nodes: nodeRefs('A', 'B'), canvasGroupId: 'g1', canvasGroupName: 'My Group 1' },
				]),
				isRemovable: true,
			},
		});
		expect(getByTestId('nodes-chip-group').textContent).toContain('My Group 1');
		expect(queryByTestId('nodes-chip-expand')).toBeNull();
	});

	it('clicking the bundle chip opens the node-name panel and it stays open until re-click', async () => {
		const { getByTestId, queryByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C', 'D') }]), isRemovable: true },
		});
		expect(queryByTestId('nodes-chip-panel')).toBeNull();
		await fireEvent.click(getByTestId('nodes-chip-bundle'));
		expect(getByTestId('nodes-chip-panel')).toBeTruthy();
		await fireEvent.click(getByTestId('nodes-chip-bundle'));
		expect(queryByTestId('nodes-chip-panel')).toBeNull();
	});

	it('expand panel shows each node type icon from the attachment workflow', async () => {
		useNodeTypesStore().setNodeTypes([
			mock<INodeTypeDescription>({
				version: 1,
				name: 'n8n-nodes-base.set',
				displayName: 'Edit Fields',
				iconUrl: 'icons/n8n-nodes-base/dist/nodes/Set/set.svg',
			}),
		]);
		useWorkflowDocumentStore(createWorkflowDocumentId('w1')).setNodes(
			nodeRefs('A', 'B', 'C', 'D').map((node) => ({
				id: node.id,
				name: node.name,
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
			})),
		);

		const { getByTestId, getAllByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C', 'D') }]), isRemovable: true },
		});
		await fireEvent.click(getByTestId('nodes-chip-bundle'));

		const rows = getAllByTestId('nodes-chip-panel-row');
		expect(rows).toHaveLength(4);
		for (const row of rows) {
			expect(row.querySelector('[data-icon="crosshair"]')).toBeNull();
			expect(row.querySelector('.n8n-node-icon img')).toBeTruthy();
		}
	});

	it('collapsing many sets shows a total-count summary chip, not a bare toggle', async () => {
		const sets = nodeRefs('A', 'B', 'C', 'D', 'E', 'F', 'G').map((n) => ({ nodes: [n] }));
		const { getByTestId, queryByTestId, getAllByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att(sets), isRemovable: true },
		});
		expect(getAllByTestId('nodes-chip-node')).toHaveLength(7);
		expect(queryByTestId('nodes-chips-collapsed-summary')).toBeNull();

		await fireEvent.click(getByTestId('nodes-chips-collapse'));

		expect(queryByTestId('nodes-chip-node')).toBeNull();
		const summary = getByTestId('nodes-chips-collapsed-summary');
		expect(summary.textContent).toContain('7 nodes');
		// No expand caret on the summary — "Expand" is the only toggle. (Vue casts
		// an omitted `boolean | null` prop to false, so it must be passed null.)
		expect(queryByTestId('nodes-chip-expand')).toBeNull();
	});

	it('the collapsed summary X clears all sets at once (emits remove-all)', async () => {
		const sets = nodeRefs('A', 'B', 'C', 'D', 'E', 'F', 'G').map((n) => ({ nodes: [n] }));
		const { getByTestId, emitted } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att(sets), isRemovable: true },
		});
		await fireEvent.click(getByTestId('nodes-chips-collapse'));
		await fireEvent.click(getByTestId('nodes-chip-remove'));
		expect(emitted()['remove-all']).toBeTruthy();
	});

	it('removing a node from the bundle expand panel emits update:attachment without it', async () => {
		const { getByTestId, getAllByTestId, emitted } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C', 'D') }]), isRemovable: true },
		});
		await fireEvent.click(getByTestId('nodes-chip-bundle'));
		const rows = getAllByTestId('nodes-chip-panel-remove');
		expect(rows).toHaveLength(4);
		await fireEvent.click(rows[1]); // remove 'B'
		const events = emitted<[InstanceAiNodesAttachment]>()['update:attachment'];
		expect(events).toBeTruthy();
		const updated = events[0][0];
		expect(updated.sets[0].nodes.map((n) => n.name)).toEqual(['A', 'C', 'D']);
	});

	it('ArrowDown on a collapsed bundle chip opens the panel and focuses the first row', async () => {
		const { getByTestId, getAllByTestId, queryByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C', 'D') }]), isRemovable: true },
		});
		expect(queryByTestId('nodes-chip-panel')).toBeNull();
		await fireEvent.keyDown(getByTestId('nodes-chip-bundle'), { key: 'ArrowDown' });
		expect(getByTestId('nodes-chip-panel')).toBeTruthy();
		expect(document.activeElement).toBe(getAllByTestId('nodes-chip-panel-row')[0]);
	});

	it('ArrowDown/ArrowUp move focus between panel rows, clamped at the edges', async () => {
		const { getByTestId, getAllByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C', 'D') }]), isRemovable: true },
		});
		await fireEvent.keyDown(getByTestId('nodes-chip-bundle'), { key: 'ArrowDown' });
		const rows = getAllByTestId('nodes-chip-panel-row');
		expect(document.activeElement).toBe(rows[0]);

		await fireEvent.keyDown(rows[0], { key: 'ArrowUp' });
		expect(document.activeElement).toBe(rows[0]);

		await fireEvent.keyDown(rows[0], { key: 'ArrowDown' });
		expect(document.activeElement).toBe(rows[1]);
		await fireEvent.keyDown(rows[1], { key: 'ArrowDown' });
		await fireEvent.keyDown(rows[2], { key: 'ArrowDown' });
		expect(document.activeElement).toBe(rows[3]);

		await fireEvent.keyDown(rows[3], { key: 'ArrowDown' });
		expect(document.activeElement).toBe(rows[3]);
	});

	it('Escape on a panel row closes the panel and refocuses the chip', async () => {
		const { getByTestId, getAllByTestId, queryByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C', 'D') }]), isRemovable: true },
		});
		const chip = getByTestId('nodes-chip-bundle');
		await fireEvent.keyDown(chip, { key: 'ArrowDown' });
		const rows = getAllByTestId('nodes-chip-panel-row');

		await fireEvent.keyDown(rows[1], { key: 'Escape' });
		expect(queryByTestId('nodes-chip-panel')).toBeNull();
		expect(document.activeElement).toBe(chip);
	});

	// The component doesn't own its `attachment` — a real parent re-renders it
	// with the emitted update. Wiring 'onUpdate:attachment' to `rerender` here
	// simulates that parent loop so the removal's DOM update actually happens.
	function renderWithSyncUpdates(attachment: InstanceAiNodesAttachment) {
		let rerenderRef: ReturnType<typeof renderComponent>['rerender'];
		const utils = renderComponent(NodesAttachmentChips, {
			props: {
				attachment,
				isRemovable: true,
				'onUpdate:attachment': (updated: InstanceAiNodesAttachment) => {
					void rerenderRef({ attachment: updated, isRemovable: true });
				},
			},
		});
		rerenderRef = utils.rerender;
		return utils;
	}

	it('removing a panel row via keyboard focuses the row that took its place', async () => {
		// 5 nodes, not 4 — removing one must stay >= the bundle threshold so the
		// panel survives the removal instead of exploding into per-node chips.
		const { getByTestId, getAllByTestId } = renderWithSyncUpdates(
			att([{ nodes: nodeRefs('A', 'B', 'C', 'D', 'E') }]),
		);
		await fireEvent.keyDown(getByTestId('nodes-chip-bundle'), { key: 'ArrowDown' });
		const rows = getAllByTestId('nodes-chip-panel-row');

		await fireEvent.keyDown(rows[1], { key: 'Delete' }); // remove 'B'

		const remainingRows = getAllByTestId('nodes-chip-panel-row');
		expect(remainingRows.map((row) => row.getAttribute('aria-label'))).toEqual([
			'A',
			'C',
			'D',
			'E',
		]);
		expect(document.activeElement).toBe(remainingRows[1]); // 'C' took B's slot
	});

	it('removing the last panel row via keyboard focuses the new last row', async () => {
		const { getByTestId, getAllByTestId } = renderWithSyncUpdates(
			att([{ nodes: nodeRefs('A', 'B', 'C', 'D', 'E') }]),
		);
		await fireEvent.keyDown(getByTestId('nodes-chip-bundle'), { key: 'ArrowDown' });
		const rows = getAllByTestId('nodes-chip-panel-row');

		await fireEvent.keyDown(rows[4], { key: 'Delete' }); // remove 'E', the last row

		const remainingRows = getAllByTestId('nodes-chip-panel-row');
		expect(document.activeElement).toBe(remainingRows[remainingRows.length - 1]); // now 'D'
	});

	it('focus leaving the chip+panel entirely closes the panel', async () => {
		const { getByTestId, getAllByTestId, queryByTestId } = renderComponent(NodesAttachmentChips, {
			props: {
				attachment: att([{ nodes: nodeRefs('A') }, { nodes: nodeRefs('B', 'C', 'D', 'E') }]),
				isRemovable: true,
			},
		});
		await fireEvent.keyDown(getByTestId('nodes-chip-bundle'), { key: 'ArrowDown' });
		expect(getByTestId('nodes-chip-panel')).toBeTruthy();

		// Named chip for the size-1 set lives outside the bundle's chip+panel anchor.
		getAllByTestId('nodes-chip-node')[0].focus();
		await flushFocusOutCheck();

		expect(queryByTestId('nodes-chip-panel')).toBeNull();
	});

	it('removing a panel row via keyboard keeps the panel open', async () => {
		const { getByTestId, getAllByTestId } = renderWithSyncUpdates(
			att([{ nodes: nodeRefs('A', 'B', 'C', 'D', 'E') }]),
		);
		await fireEvent.keyDown(getByTestId('nodes-chip-bundle'), { key: 'ArrowDown' });

		await fireEvent.keyDown(getAllByTestId('nodes-chip-panel-row')[1], { key: 'Delete' });
		await flushFocusOutCheck();

		expect(getByTestId('nodes-chip-panel')).toBeTruthy();
	});

	it('Escape on the chip itself closes an already-open panel', async () => {
		const { getByTestId, queryByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C', 'D') }]), isRemovable: true },
		});
		const chip = getByTestId('nodes-chip-bundle');
		await fireEvent.click(getByTestId('nodes-chip-bundle'));
		expect(getByTestId('nodes-chip-panel')).toBeTruthy();

		await fireEvent.keyDown(chip, { key: 'Escape' });
		expect(queryByTestId('nodes-chip-panel')).toBeNull();
	});
});
