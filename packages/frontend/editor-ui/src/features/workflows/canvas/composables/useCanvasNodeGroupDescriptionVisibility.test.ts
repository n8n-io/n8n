import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IWorkflowGroup } from 'n8n-workflow';

import {
	useCanvasNodeGroupDescriptionVisibility,
	type UseCanvasNodeGroupDescriptionVisibilityDeps,
} from './useCanvasNodeGroupDescriptionVisibility';
import type { NodeGroupChangeEvent } from '@/app/stores/workflowDocument/useWorkflowDocumentNodeGroups';
import { CHANGE_ACTION } from '@/app/stores/workflowDocument/types';
import { LOCAL_STORAGE_CANVAS_GROUP_DESCRIPTION_PINNED } from '@/app/constants/localStorage';

function makeGroup(overrides: Partial<IWorkflowGroup> = {}): IWorkflowGroup {
	return { id: 'g1', name: 'G', nodeIds: [], description: 'desc', ...overrides };
}

function makeVisibility(deps: Partial<UseCanvasNodeGroupDescriptionVisibilityDeps> = {}) {
	return useCanvasNodeGroupDescriptionVisibility({
		workflowId: () => 'wf-1',
		getCurrentGroups: () => [],
		onNodeGroupsChange: () => ({ off: () => {} }),
		...deps,
	});
}

function setStore(store: Record<string, string[]>) {
	localStorage.setItem(LOCAL_STORAGE_CANVAS_GROUP_DESCRIPTION_PINNED, JSON.stringify(store));
}

describe('useCanvasNodeGroupDescriptionVisibility', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('reports groups as not visible by default', () => {
		const visibility = makeVisibility();
		expect(visibility.isVisible('g1')).toBe(false);
	});

	it('sets and toggles visibility', () => {
		const visibility = makeVisibility();

		visibility.setVisible('g1', true);
		expect(visibility.isVisible('g1')).toBe(true);

		visibility.toggleVisible('g1');
		expect(visibility.isVisible('g1')).toBe(false);
	});

	it('removes a deleted group from the visible set', () => {
		const visibility = makeVisibility();
		visibility.setVisible('g1', true);

		visibility.removeDeleted('g1');
		expect(visibility.isVisible('g1')).toBe(false);
	});

	it('persists pinned ids to localStorage per workflow', () => {
		const visibility = makeVisibility();
		visibility.setVisible('g1', true);

		const stored = JSON.parse(
			localStorage.getItem(LOCAL_STORAGE_CANVAS_GROUP_DESCRIPTION_PINNED) ?? '{}',
		);
		expect(stored).toEqual({ 'wf-1': ['g1'] });
	});

	it('restores persisted pins on init for groups present in the workflow', () => {
		setStore({ 'wf-1': ['g1', 'g2'] });

		// g2 is not present in the current workflow and should be pruned.
		const visibility = makeVisibility({ getCurrentGroups: () => [makeGroup({ id: 'g1' })] });

		expect(visibility.isVisible('g1')).toBe(true);
		expect(visibility.isVisible('g2')).toBe(false);
	});

	it('drops a persisted pin whose group no longer has a description', () => {
		setStore({ 'wf-1': ['g1'] });

		const visibility = makeVisibility({
			getCurrentGroups: () => [makeGroup({ id: 'g1', description: '' })],
		});

		expect(visibility.isVisible('g1')).toBe(false);
	});

	it('does not read another workflow’s pinned ids', () => {
		setStore({ 'wf-2': ['g1'] });

		const visibility = makeVisibility({ getCurrentGroups: () => [makeGroup({ id: 'g1' })] });

		expect(visibility.isVisible('g1')).toBe(false);
	});

	it('restores pins when the document groups are set', () => {
		setStore({ 'wf-1': ['g1'] });
		let handler: ((event: NodeGroupChangeEvent) => void) | undefined;
		const visibility = makeVisibility({
			onNodeGroupsChange: (h) => {
				handler = h;
				return { off: () => {} };
			},
		});

		expect(visibility.isVisible('g1')).toBe(false);

		handler?.({ action: CHANGE_ACTION.SET, payload: { groups: [makeGroup({ id: 'g1' })] } });

		expect(visibility.isVisible('g1')).toBe(true);
	});

	it('unpins a group whose description is cleared to empty', () => {
		let handler: ((event: NodeGroupChangeEvent) => void) | undefined;
		const visibility = makeVisibility({
			onNodeGroupsChange: (h) => {
				handler = h;
				return { off: () => {} };
			},
		});
		visibility.setVisible('g1', true);

		const group: IWorkflowGroup = { id: 'g1', name: 'G', nodeIds: [], description: '   ' };
		handler?.({ action: CHANGE_ACTION.UPDATE, payload: { group } });

		expect(visibility.isVisible('g1')).toBe(false);
	});

	it('keeps a group pinned when its description is updated but still present', () => {
		let handler: ((event: NodeGroupChangeEvent) => void) | undefined;
		const visibility = makeVisibility({
			onNodeGroupsChange: (h) => {
				handler = h;
				return { off: () => {} };
			},
		});
		visibility.setVisible('g1', true);

		const group: IWorkflowGroup = { id: 'g1', name: 'G', nodeIds: [], description: 'still here' };
		handler?.({ action: CHANGE_ACTION.UPDATE, payload: { group } });

		expect(visibility.isVisible('g1')).toBe(true);
	});

	it('unsubscribes and resubscribes on reinitialize', () => {
		const off = vi.fn();
		const onNodeGroupsChange = vi.fn(() => ({ off }));
		const visibility = makeVisibility({ onNodeGroupsChange });

		visibility.reinitialize();

		expect(off).toHaveBeenCalledTimes(1);
		expect(onNodeGroupsChange).toHaveBeenCalledTimes(2);
	});
});
