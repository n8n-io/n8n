import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryVersionSelect from './WorkflowHistoryVersionSelect.vue';
import { ref } from 'vue';

const shouldUpgrade = ref(false);
const evaluatedPruneTime = ref(0);

vi.mock('../workflowHistory.store', () => ({
	useWorkflowHistoryStore: () => ({
		shouldUpgrade,
		evaluatedPruneTime,
	}),
}));

vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual('@n8n/design-system');
	return {
		...actual,
		N8nSelect: {
			props: ['filterMethod'],
			template: `
				<div>
					<slot name="prefix" />
					<button data-test-id="apply-filter" @click="filterMethod?.('Two')" />
					<slot />
					<slot name="footer" />
				</div>
			`,
		},
	};
});

const renderComponent = createComponentRenderer(WorkflowHistoryVersionSelect, {
	global: {
		stubs: {
			ElOption: { template: '<div data-test-id="option"><slot /></div>' },
			N8nTooltip: {
				template: '<div data-test-id="tooltip"><slot /><slot name="content" /></div>',
			},
			ElOptionGroup: {
				props: ['label'],
				template: '<div><div data-test-id="group-label">{{ label }}</div><slot /></div>',
			},
			WorkflowHistoryVersionDot: {
				props: ['status'],
				template: '<span data-test-id="dot" :data-status="status" />',
			},
		},
	},
});

describe('WorkflowHistoryVersionSelect', () => {
	it('groups options by createdAt date label', () => {
		const rendered = renderComponent({
			props: {
				modelValue: 'v-1',
				dataTestId: 'workflow-history-version-select',
				options: [
					{
						value: 'v-1',
						label: 'Version One',
						status: 'latest',
						createdAt: '2026-02-25T16:19:43.000Z',
					},
					{
						value: 'v-2',
						label: 'Version Two',
						status: 'default',
						createdAt: '2026-02-25T17:19:43.000Z',
					},
					{
						value: 'v-3',
						label: 'Version Three',
						status: 'default',
						createdAt: '2026-02-27T10:00:00.000Z',
					},
				],
			},
		});

		// Two distinct day groups should be rendered
		expect(rendered.getAllByTestId('group-label')).toHaveLength(2);
	});

	it('formats tooltip using publishInfo when available', () => {
		const rendered = renderComponent({
			props: {
				modelValue: 'v-1',
				dataTestId: 'workflow-history-version-select',
				options: [
					{
						value: 'v-1',
						label: 'Published Version',
						status: 'active',
						createdAt: '2026-02-25T16:19:43.000Z',
						publishInfo: {
							publishedBy: 'John Doe',
							publishedAt: '2026-02-25T16:19:43.000Z',
						},
					},
				],
			},
		});

		expect(rendered.getAllByText(/Published by John Doe/)).toHaveLength(2);
	});

	it('filters options by search query while preserving grouping', async () => {
		const rendered = renderComponent({
			props: {
				modelValue: 'v-1',
				dataTestId: 'workflow-history-version-select',
				options: [
					{
						value: 'v-1',
						label: 'Version One',
						status: 'latest',
						createdAt: '2026-02-25T16:19:43.000Z',
					},
					{
						value: 'v-2',
						label: 'Version Two',
						status: 'default',
						createdAt: '2026-02-25T17:19:43.000Z',
					},
					{
						value: 'v-3',
						label: 'Version Three',
						status: 'default',
						createdAt: '2026-02-27T10:00:00.000Z',
					},
				],
			},
		});

		expect(rendered.getAllByTestId('option')).toHaveLength(3);
		expect(rendered.getAllByTestId('group-label')).toHaveLength(2);

		await userEvent.click(rendered.getByTestId('apply-filter'));

		expect(rendered.getAllByTestId('option')).toHaveLength(1);
		expect(rendered.getAllByTestId('group-label')).toHaveLength(1);
		expect(rendered.getByText('Version Two')).toBeInTheDocument();
	});

	it('shows upgrade footer and emits upgrade action', async () => {
		shouldUpgrade.value = true;
		evaluatedPruneTime.value = 48;

		const rendered = renderComponent({
			props: {
				modelValue: 'v-1',
				dataTestId: 'workflow-history-version-select',
				options: [
					{
						value: 'v-1',
						label: 'Version One',
						status: 'latest',
						createdAt: '2026-02-25T16:19:43.000Z',
					},
				],
			},
		});

		expect(rendered.getByTestId('prune-time-display')).toBeInTheDocument();

		await userEvent.click(rendered.getByRole('link'));

		expect(rendered.emitted('upgrade')).toHaveLength(1);

		shouldUpgrade.value = false;
		evaluatedPruneTime.value = 0;
	});
});
