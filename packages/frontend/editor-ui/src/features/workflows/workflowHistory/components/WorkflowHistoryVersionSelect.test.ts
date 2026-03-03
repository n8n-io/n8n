import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryVersionSelect from './WorkflowHistoryVersionSelect.vue';

const renderComponent = createComponentRenderer(WorkflowHistoryVersionSelect, {
	global: {
		stubs: {
			ElSelect: { template: '<div><slot name="prefix" /><slot /></div>' },
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

		expect(rendered.getByText(/Published by John Doe/)).toBeInTheDocument();
	});
});
