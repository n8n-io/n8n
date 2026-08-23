import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { NodeDiffStatus } from 'n8n-workflow';

import { renderComponent } from '@/__tests__/render';
import ChatVersionCard from './ChatVersionCard.vue';
import type { NodeChangeEntry } from '@/features/ai/assistant/composables/useReviewChanges';
import type { INode } from 'n8n-workflow';
import type { SimplifiedNodeType } from '@/Interface';

vi.mock('@vueuse/core', async () => {
	const actual = await vi.importActual('@vueuse/core');
	return {
		...actual,
		onClickOutside: vi.fn(),
		useElementBounding: () => ({
			bottom: { value: 100 },
			right: { value: 200 },
		}),
	};
});

const sampleNodeChanges: NodeChangeEntry[] = [
	{
		status: NodeDiffStatus.Added,
		node: { id: 'node-1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' } as INode,
		nodeType: {
			displayName: 'HTTP Request',
			name: 'n8n-nodes-base.httpRequest',
			icon: 'file:httprequest.svg',
		} as unknown as SimplifiedNodeType,
	},
	{
		status: NodeDiffStatus.Modified,
		node: { id: 'node-2', name: 'Set', type: 'n8n-nodes-base.set' } as INode,
		nodeType: {
			displayName: 'Set',
			name: 'n8n-nodes-base.set',
			icon: 'fa:pen',
		} as unknown as SimplifiedNodeType,
	},
];

function render(
	overrides: Partial<{
		versionId: string;
		isCurrent: boolean;
		nodeChanges: NodeChangeEntry[];
		pruneTimeHours: number;
		versionIndex: number;
		versionExists: boolean;
	}> = {},
) {
	return renderComponent(ChatVersionCard, {
		props: {
			versionId: overrides.versionId ?? 'version-1',
			isCurrent: overrides.isCurrent ?? false,
			nodeChanges: overrides.nodeChanges ?? sampleNodeChanges,
			pruneTimeHours: overrides.pruneTimeHours,
			versionIndex: overrides.versionIndex ?? 1,
			versionExists: overrides.versionExists ?? true,
		},
		global: {
			stubs: {
				N8nActionDropdown: {
					template: '<div data-test-id="version-card-menu"><slot /></div>',
					props: ['items', 'activatorIcon', 'activatorSize', 'placement', 'teleported'],
					emits: ['select'],
				},
				ElDropdown: true,
				ElDropdownMenu: true,
				ElDropdownItem: true,
				NodeIcon: {
					template: '<span data-test-id="node-icon-stub" />',
					props: ['nodeType', 'size'],
				},
				DiffBadge: { template: '<span data-test-id="diff-badge-stub" />', props: ['type'] },
				RestoreVersionConfirm: {
					template:
						'<div data-test-id="restore-confirm-stub"><button data-test-id="confirm-btn" @click="$emit(\'confirm\')">Confirm</button><button data-test-id="cancel-btn" @click="$emit(\'cancel\')">Cancel</button></div>',
					props: ['versionId', 'pruneTimeHours'],
					emits: ['confirm', 'cancel', 'showVersion'],
				},
				Teleport: { template: '<div><slot /></div>' },
			},
		},
	});
}

describe('ChatVersionCard', () => {
	describe('basic rendering', () => {
		it('should render the version card container', () => {
			const { getByTestId } = render();
			expect(getByTestId('version-card')).toBeTruthy();
		});

		it('should render the version label', () => {
			const { getByText } = render();
			expect(getByText('Version #1')).toBeTruthy();
		});

		it('should not show changes list when collapsed', () => {
			const { queryAllByTestId } = render();
			expect(queryAllByTestId('version-card-change-item')).toHaveLength(0);
		});
	});

	describe('current version styling', () => {
		it('should not apply current class for non-current version', () => {
			const { getByTestId } = render({ isCurrent: false });
			const container = getByTestId('version-card');
			expect(container.className).not.toContain('current');
		});

		it('should apply current class for current version', () => {
			const { getByTestId } = render({ isCurrent: true });
			const container = getByTestId('version-card');
			expect(container.className).toContain('current');
		});
	});

	describe('expand/collapse', () => {
		it('should show changes list when header is clicked', async () => {
			const { getByTestId, queryAllByTestId } = render();
			const header = getByTestId('version-card').querySelector('[role="button"]')!;

			await fireEvent.click(header);

			expect(queryAllByTestId('version-card-change-item')).toHaveLength(2);
		});

		it('should hide changes list when header is clicked again', async () => {
			const { getByTestId, queryAllByTestId } = render();
			const header = getByTestId('version-card').querySelector('[role="button"]')!;

			await fireEvent.click(header);
			expect(queryAllByTestId('version-card-change-item')).toHaveLength(2);

			await fireEvent.click(header);
			expect(queryAllByTestId('version-card-change-item')).toHaveLength(0);
		});

		it('should render node names in expanded list', async () => {
			const { getByTestId, getByText } = render();
			const header = getByTestId('version-card').querySelector('[role="button"]')!;

			await fireEvent.click(header);

			expect(getByText('HTTP Request')).toBeTruthy();
			expect(getByText('Set')).toBeTruthy();
		});
	});

	describe('node change click', () => {
		it('should emit selectNode when a change item is clicked', async () => {
			const { getByTestId, getAllByTestId, emitted } = render();
			const header = getByTestId('version-card').querySelector('[role="button"]')!;

			await fireEvent.click(header);

			const changeItems = getAllByTestId('version-card-change-item');
			await fireEvent.click(changeItems[0]);

			expect(emitted('selectNode')).toEqual([['node-1']]);
		});
	});

	describe('menu actions', () => {
		it('should render the action dropdown menu', () => {
			const { getByTestId } = render();
			expect(getByTestId('version-card-menu')).toBeTruthy();
		});
	});

	describe('restore confirmation', () => {
		it('should not show restore confirm dialog initially', () => {
			const { queryByTestId } = render();
			expect(queryByTestId('restore-confirm-stub')).toBeFalsy();
		});
	});

	describe('empty changes', () => {
		it('should render with empty changes list', async () => {
			const { getByTestId, queryAllByTestId } = render({ nodeChanges: [] });
			const header = getByTestId('version-card').querySelector('[role="button"]')!;

			await fireEvent.click(header);

			expect(queryAllByTestId('version-card-change-item')).toHaveLength(0);
		});
	});
});
