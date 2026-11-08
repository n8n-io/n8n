import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import type { IWorkflowDb } from '@/Interface';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { sleep } from '@n8n/utils/sleep';

import AssistantAtMentionPicker from './AssistantAtMentionPicker.vue';
import type {
	AssistantMentionPickerOpenMetrics,
	AssistantMentionSelection,
} from './assistantAtMentions.types';

const getWorkflow = vi.hoisted(() => vi.fn());

vi.mock('@/app/api/workflows', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/app/api/workflows')>()),
	getWorkflow,
}));

const renderComponent = createComponentRenderer(AssistantAtMentionPicker);

// The host reads the exposed metrics through a template ref; this harness does
// the same so the test sees exactly what the dismissal event would receive.
let readOpenMetrics: (() => AssistantMentionPickerOpenMetrics | undefined) | undefined;
const PickerHarness = defineComponent({
	name: 'PickerHarness',
	props: {
		modelValue: { type: Boolean, required: true },
		query: { type: String, required: true },
		projectId: { type: String, default: undefined },
		artifacts: { type: Array, default: () => [] },
	},
	setup(props) {
		const picker = ref<InstanceType<typeof AssistantAtMentionPicker> | null>(null);
		readOpenMetrics = () => picker.value?.getOpenMetrics();
		return () =>
			h(AssistantAtMentionPicker, {
				ref: picker,
				modelValue: props.modelValue,
				query: props.query,
				projectId: props.projectId,
				artifacts: props.artifacts as Array<{ id: string; name: string }>,
			});
	},
});
const renderHarness = createComponentRenderer(PickerHarness);

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((resolver) => {
		resolve = resolver;
	});
	return { promise, resolve };
}

describe('AssistantAtMentionPicker', () => {
	beforeEach(() => {
		getWorkflow.mockReset();
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.mocked(useNodeTypesStore().loadNodeTypesIfNotLoaded).mockResolvedValue();
	});

	it('renders artifact browse roots and emits a workflow selection', async () => {
		const input = document.createElement('textarea');
		const reference = document.createElement('div');
		document.body.append(input, reference);
		const { findByText, emitted } = renderComponent({
			props: {
				modelValue: true,
				query: '',
				projectId: undefined,
				artifacts: [{ id: 'w1', name: 'Orders' }],
				inputElement: input,
				reference,
			},
		});
		const workflowItem = await findByText('Orders');
		expect(document.querySelector('[data-icon="workflow"]')).toBeVisible();
		await userEvent.click(workflowItem);

		const selection = (emitted().select as unknown[][] | undefined)?.[0]?.[0] as
			| AssistantMentionSelection
			| undefined;
		expect(selection).toMatchObject({
			item: { kind: 'workflow', workflowId: 'w1', label: 'Orders' },
			attachment: { type: 'workflow', id: 'w1', name: 'Orders' },
			telemetry: { mode: 'browse', resultPosition: 1, queryLength: 0 },
		});
	});

	it('reports privacy-safe search interaction metadata', async () => {
		const input = document.createElement('textarea');
		const reference = document.createElement('div');
		document.body.append(input, reference);
		const pinia = createTestingPinia({ stubActions: true });
		setActivePinia(pinia);
		const { useWorkflowsListStore } = await import('@/app/stores/workflowsList.store');
		vi.mocked(useWorkflowsListStore().searchWorkflows).mockResolvedValue([
			{ id: 'w1', name: 'Orders' },
		] as never);
		const { findByText, emitted } = renderComponent({
			props: {
				modelValue: true,
				query: 'ord',
				projectId: 'project-1',
				inputElement: input,
				reference,
			},
		});

		await userEvent.click(await findByText('Orders'));

		const selection = (emitted().select as unknown[][] | undefined)?.[0]?.[0] as
			| AssistantMentionSelection
			| undefined;
		expect(selection?.telemetry).toEqual({
			mode: 'search',
			resultPosition: 1,
			queryLength: 3,
		});
		expect(selection?.item).not.toHaveProperty('query');
	});

	it('emits open state from the mention button', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: false, query: '' },
		});

		await userEvent.click(getByTestId('instance-ai-mention-button'));
		expect(emitted()['update:modelValue']?.[0]).toEqual([true]);
	});

	it('disables the real mention button when the picker is disabled', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: false, query: '', disabled: true },
		});

		expect(getByTestId('instance-ai-mention-button')).toBeDisabled();
	});

	it('shows the empty state without section headers when nothing is mentionable', async () => {
		const { findByText, queryByText } = renderComponent({
			props: { modelValue: true, query: '', projectId: undefined },
		});

		expect(await findByText('No recent workflows')).toBeVisible();
		expect(queryByText('Workflows')).toBeNull();
		expect(queryByText('Artifacts')).toBeNull();
	});

	it('hides the workflows section when only artifacts are available', async () => {
		const { findByText, queryByText } = renderComponent({
			props: {
				modelValue: true,
				query: '',
				projectId: undefined,
				artifacts: [{ id: 'w1', name: 'Orders' }],
			},
		});

		expect(await findByText('Orders')).toBeVisible();
		expect(await findByText('Artifacts')).toBeVisible();
		expect(queryByText('Workflows')).toBeNull();
		expect(queryByText('No recent workflows')).toBeNull();
	});

	it('renders ten skeleton rows while workflows load', async () => {
		setActivePinia(createTestingPinia());
		const { useRecentWorkflowsStore } = await import('@/app/stores/recentWorkflows.store');
		const { useWorkflowsListStore } = await import('@/app/stores/workflowsList.store');
		const response = deferred<IWorkflowDb[]>();
		vi.mocked(useRecentWorkflowsStore().resolveRecentWorkflows).mockReturnValue(response.promise);
		vi.mocked(useWorkflowsListStore().searchWorkflows).mockResolvedValue([]);
		renderComponent({
			props: { modelValue: true, query: '', projectId: 'project-1' },
		});

		await waitFor(() => expect(document.querySelectorAll('.n8n-loading')).toHaveLength(10));
		expect(document.body).not.toHaveTextContent('Loading workflows');
		response.resolve([]);
	});

	it('renders group and resolved node icons in artifact search results', async () => {
		const input = document.createElement('textarea');
		const reference = document.createElement('div');
		document.body.append(input, reference);
		const nodeTypesStore = mockedStore(useNodeTypesStore);
		const getNodeType = vi.fn().mockReturnValue({
			displayName: 'If',
			name: 'n8n-nodes-base.if',
			icon: 'fa:map-signs',
		} as never);
		nodeTypesStore.getNodeType = getNodeType;
		getWorkflow.mockResolvedValue({
			id: 'w1',
			name: 'Orders',
			versionId: 'version-1',
			nodes: [
				{
					id: 'if-node',
					name: 'If',
					type: 'n8n-nodes-base.if',
					typeVersion: 2.2,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
			nodeGroups: [{ id: 'group-1', name: 'If checks', nodeIds: ['if-node'] }],
		} as never);

		const { findByRole } = renderComponent({
			props: {
				modelValue: true,
				query: 'if',
				artifacts: [{ id: 'w1', name: 'Orders' }],
				inputElement: input,
				reference,
			},
		});

		const groupResult = await findByRole('menuitem', { name: 'Orders > If checks' });
		const nodeResult = await findByRole('menuitem', { name: 'Orders > If checks > If' });
		expect(groupResult.querySelector('[data-icon="group"]')).toBeVisible();
		expect(nodeResult.querySelector('.n8n-node-icon')).toBeVisible();
		expect(
			[...nodeResult.querySelectorAll('[class*="breadcrumbAncestor"]')].map((element) =>
				element.textContent?.trim(),
			),
		).toEqual(['Orders', '>', 'If checks', '>']);
		expect(getNodeType).toHaveBeenCalledWith('n8n-nodes-base.if', 2.2);
		expect(nodeTypesStore.loadNodeTypesIfNotLoaded).toHaveBeenCalled();
	});

	it('shows a retry footer when one search provider fails with partial results', async () => {
		getWorkflow.mockResolvedValue({
			id: 'w1',
			name: 'Orders',
			versionId: 'version-1',
			nodes: [],
			connections: {},
		} as never);
		const { useWorkflowsListStore } = await import('@/app/stores/workflowsList.store');
		vi.mocked(useWorkflowsListStore().searchWorkflows).mockRejectedValue(
			new Error('Workflow search unavailable'),
		);

		const { findByText } = renderComponent({
			props: {
				modelValue: true,
				query: 'ord',
				projectId: 'project-1',
				artifacts: [{ id: 'w1', name: 'Orders' }],
			},
		});

		expect(await findByText('Orders')).toBeVisible();
		expect(await findByText("Workflows couldn't load. Try again.")).toBeVisible();
		expect(await findByText('Retry')).toBeVisible();
	});

	it('shows node counts next to expandable workflow and group chevrons', async () => {
		const input = document.createElement('textarea');
		const reference = document.createElement('div');
		document.body.append(input, reference);
		getWorkflow.mockResolvedValue({
			id: 'w1',
			name: 'Orders',
			versionId: 'version-1',
			nodes: [
				{
					id: 'node-1',
					name: 'First',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'node-2',
					name: 'Second',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'node-3',
					name: 'Third',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
			nodeGroups: [{ id: 'group-1', name: 'Review group', nodeIds: ['node-1', 'node-2'] }],
		} as never);

		const { findByText } = renderComponent({
			props: {
				modelValue: true,
				query: '',
				artifacts: [{ id: 'w1', name: 'Orders' }],
				inputElement: input,
				reference,
			},
		});
		const workflowRow = (await findByText('Orders')).closest('[role="menuitem"]');
		const workflowOpenAction = workflowRow?.querySelector('[data-sub-menu-action="open"]');
		expect(workflowOpenAction).not.toBeNull();
		await userEvent.click(workflowOpenAction as HTMLElement);

		const groupRow = (await findByText('Review group')).closest('[role="menuitem"]');
		expect(workflowOpenAction).toHaveTextContent('3');
		expect(groupRow?.querySelector('[data-sub-menu-action="open"]')).toHaveTextContent('2');
	});

	it('shows node counts for every artifact without opening a sub-menu', async () => {
		const input = document.createElement('textarea');
		const reference = document.createElement('div');
		document.body.append(input, reference);
		const artifacts = [
			{ id: 'w1', name: 'Odd numbers', nodeCount: 1 },
			{ id: 'w2', name: 'Even numbers', nodeCount: 2 },
		];
		getWorkflow.mockImplementation(async (_context: unknown, workflowId: string) => {
			const artifact = artifacts.find(({ id }) => id === workflowId);
			return {
				id: workflowId,
				name: artifact?.name,
				versionId: `${workflowId}-version`,
				nodes: Array.from({ length: artifact?.nodeCount ?? 0 }, (_, index) => ({
					id: `${workflowId}-node-${index + 1}`,
					name: `Node ${index + 1}`,
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				})),
				connections: {},
			};
		});

		const { getByText } = renderComponent({
			props: {
				modelValue: true,
				query: '',
				artifacts: artifacts.map(({ id, name }) => ({ id, name })),
				inputElement: input,
				reference,
			},
		});
		const openActionFor = (label: string) =>
			getByText(label).closest('[role="menuitem"]')?.querySelector('[data-sub-menu-action="open"]');

		await waitFor(() => {
			expect(openActionFor('Odd numbers')).toHaveTextContent('1');
			expect(openActionFor('Even numbers')).toHaveTextContent('2');
		});
		expect(getWorkflow).toHaveBeenCalledTimes(2);
	});

	it('exposes search metrics that count rows the user could not tell apart', async () => {
		setActivePinia(createTestingPinia({ stubActions: true }));
		const { useWorkflowsListStore } = await import('@/app/stores/workflowsList.store');
		vi.mocked(useWorkflowsListStore().searchWorkflows).mockResolvedValue([
			{ id: 'w1', name: 'Orders' },
			{ id: 'w2', name: 'Orders' },
			{ id: 'w3', name: 'Order archive' },
		] as never);

		const { getAllByRole } = renderHarness({
			props: { modelValue: true, query: 'ord', projectId: 'project-1' },
		});
		await waitFor(() => expect(getAllByRole('menuitem')).toHaveLength(3));

		expect(readOpenMetrics?.()).toEqual({
			mode: 'search',
			queryLength: 3,
			resultCount: 3,
			ambiguousResultCount: 2,
			submenuOpenCount: 0,
		});
	});

	it('counts sub-menu opens per picker open', async () => {
		getWorkflow.mockResolvedValue({
			id: 'w1',
			name: 'Orders',
			versionId: 'version-1',
			nodes: [
				{
					id: 'node-1',
					name: 'First',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		} as never);

		const { findByText, rerender } = renderHarness({
			props: { modelValue: true, query: '', artifacts: [{ id: 'w1', name: 'Orders' }] },
		});
		const workflowRow = (await findByText('Orders')).closest('[role="menuitem"]');
		await userEvent.click(
			workflowRow?.querySelector('[data-sub-menu-action="open"]') as HTMLElement,
		);
		await findByText('First');

		expect(readOpenMetrics?.()).toEqual({
			mode: 'browse',
			queryLength: 0,
			resultCount: 1,
			ambiguousResultCount: 0,
			submenuOpenCount: 1,
		});

		await rerender({ modelValue: false });
		await rerender({ modelValue: true });
		expect(readOpenMetrics?.()).toMatchObject({ submenuOpenCount: 0 });
	});

	it('shows a retry action when workflow browse fails', async () => {
		setActivePinia(createTestingPinia());
		const { useRecentWorkflowsStore } = await import('@/app/stores/recentWorkflows.store');
		const recentWorkflowsStore = useRecentWorkflowsStore();
		vi.mocked(recentWorkflowsStore.resolveRecentWorkflows).mockRejectedValue(
			new Error('Request failed'),
		);
		const { findByText, getByRole } = renderComponent({
			props: {
				modelValue: true,
				query: '',
				projectId: 'project-1',
				artifacts: [{ id: 'w1', name: 'Orders' }],
			},
		});

		expect(await findByText('Orders')).toBeVisible();
		expect(await findByText("Workflows couldn't load. Try again.")).toBeVisible();
		await userEvent.click(getByRole('menuitem', { name: 'Retry' }));
		expect(recentWorkflowsStore.resolveRecentWorkflows).toHaveBeenCalledTimes(2);
	});

	describe('empty search reporting', () => {
		// Shrinks the search debounce and the settle delay to a few milliseconds so a
		// test observes the settled state without waiting out a real second.
		const DEBOUNCE_MULTIPLIER = 0.02;
		const settle = async () => await sleep(DEBOUNCE_MULTIPLIER * 1000 * 3);

		async function renderEmptySearch(query: string) {
			sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', String(DEBOUNCE_MULTIPLIER));
			setActivePinia(createTestingPinia());
			const { useWorkflowsListStore } = await import('@/app/stores/workflowsList.store');
			vi.mocked(useWorkflowsListStore().searchWorkflows).mockResolvedValue([]);
			return renderComponent({ props: { modelValue: true, query, projectId: 'project-1' } });
		}

		afterEach(() => sessionStorage.removeItem('N8N_DEBOUNCE_MULTIPLIER'));

		it('reports a query once its empty state settles, and each distinct query once per open', async () => {
			const { emitted, rerender } = await renderEmptySearch('zzz');

			await waitFor(() => expect(emitted()['empty-search']).toEqual([['zzz']]));

			await rerender({ query: 'zz' });
			await waitFor(() => expect(emitted()['empty-search']).toEqual([['zzz'], ['zz']]));

			await rerender({ query: 'zzz' });
			await settle();
			expect(emitted()['empty-search']).toEqual([['zzz'], ['zz']]);
		});

		it('skips a prefix the user typed straight through', async () => {
			const { emitted, rerender } = await renderEmptySearch('z');

			await rerender({ query: 'zz' });
			await waitFor(() => expect(emitted()['empty-search']).toEqual([['zz']]));
			await settle();

			expect(emitted()['empty-search']).toEqual([['zz']]);
		});

		it('reports an empty state the picker closes on before it settles', async () => {
			const { emitted, rerender, findByText } = await renderEmptySearch('zzz');
			await findByText('No results');

			await rerender({ modelValue: false });

			expect(emitted()['empty-search']).toEqual([['zzz']]);
		});
	});
});
