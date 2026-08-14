import { configure, fireEvent } from '@testing-library/vue';
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { renderComponent } from '@/__tests__/render';
import NodesAttachmentChips from '../NodesAttachmentChips.vue';
import type { InstanceAiNodesAttachment } from '@n8n/api-types';

// This project's default test-id attribute is `data-test-id`; this component
// (and the legacy chip components it mirrors) use `data-testid` per the brief.
configure({ testIdAttribute: 'data-testid' });

const att = (sets: InstanceAiNodesAttachment['sets']): InstanceAiNodesAttachment => ({
	type: 'nodes',
	workflowId: 'w1',
	sets,
});
const nodeRefs = (...names: string[]) => names.map((name, i) => ({ id: `n${i}`, name }));

describe('NodesAttachmentChips', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('one set, size 1, no group → single named chip', () => {
		const { getAllByTestId, queryAllByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A') }]), isRemovable: true },
		});
		expect(getAllByTestId('nodes-chip-node')).toHaveLength(1);
		expect(queryAllByTestId('nodes-chip-bundle')).toHaveLength(0);
	});

	it('one set, size 3 (below threshold) → 3 per-node chips, each removable', () => {
		const { getAllByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C') }]), isRemovable: true },
		});
		expect(getAllByTestId('nodes-chip-node')).toHaveLength(3);
		expect(getAllByTestId('nodes-chip-remove')).toHaveLength(3);
	});

	it('one set, size 4 (>= threshold) → single bundled chip, no per-node chips', () => {
		const { getAllByTestId, queryAllByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C', 'D') }]), isRemovable: true },
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

	it('removing one per-node chip emits update:attachment without that node', async () => {
		const { getAllByTestId, emitted } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C') }]), isRemovable: true },
		});
		await fireEvent.click(getAllByTestId('nodes-chip-remove')[1]); // remove 'B'
		const events = emitted<[InstanceAiNodesAttachment]>()['update:attachment'];
		expect(events).toBeTruthy();
		const updated = events[0][0];
		expect(updated.sets[0].nodes.map((n) => n.name)).toEqual(['A', 'C']);
	});

	it('caret opens the node-name panel and it stays open until re-click', async () => {
		const { getByTestId, queryByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C', 'D') }]), isRemovable: true },
		});
		expect(queryByTestId('nodes-chip-panel')).toBeNull();
		await fireEvent.click(getByTestId('nodes-chip-expand'));
		expect(getByTestId('nodes-chip-panel')).toBeTruthy(); // still open (no mouseout close)
		await fireEvent.click(getByTestId('nodes-chip-expand'));
		expect(queryByTestId('nodes-chip-panel')).toBeNull();
	});

	it('collapsing many sets shows a total-count summary chip, not a bare toggle', async () => {
		// 7 lone sets (> COLLAPSE_CHIP_THRESHOLD) → collapse toggle appears.
		const sets = nodeRefs('A', 'B', 'C', 'D', 'E', 'F', 'G').map((n) => ({ nodes: [n] }));
		const { getByTestId, queryByTestId, getAllByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att(sets), isRemovable: true },
		});
		expect(getAllByTestId('nodes-chip-node')).toHaveLength(7);
		expect(queryByTestId('nodes-chips-collapsed-summary')).toBeNull();

		await fireEvent.click(getByTestId('nodes-chips-collapse'));

		// Collapsed: individual chips gone, one summary chip with the total count.
		expect(queryByTestId('nodes-chip-node')).toBeNull();
		const summary = getByTestId('nodes-chips-collapsed-summary');
		expect(summary.textContent).toContain('7 nodes');
	});

	it('the collapsed summary X clears all sets at once (emits remove-all)', async () => {
		const sets = nodeRefs('A', 'B', 'C', 'D', 'E', 'F', 'G').map((n) => ({ nodes: [n] }));
		const { getByTestId, emitted } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att(sets), isRemovable: true },
		});
		await fireEvent.click(getByTestId('nodes-chips-collapse'));
		await fireEvent.click(getByTestId('nodes-chips-collapsed-remove'));
		expect(emitted()['remove-all']).toBeTruthy();
	});

	it('removing a node from the bundle expand panel emits update:attachment without it', async () => {
		const { getByTestId, getAllByTestId, emitted } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C', 'D') }]), isRemovable: true },
		});
		await fireEvent.click(getByTestId('nodes-chip-expand'));
		const rows = getAllByTestId('nodes-chip-panel-remove');
		expect(rows).toHaveLength(4);
		await fireEvent.click(rows[1]); // remove 'B'
		const events = emitted<[InstanceAiNodesAttachment]>()['update:attachment'];
		expect(events).toBeTruthy();
		const updated = events[0][0];
		expect(updated.sets[0].nodes.map((n) => n.name)).toEqual(['A', 'C', 'D']);
	});
});
