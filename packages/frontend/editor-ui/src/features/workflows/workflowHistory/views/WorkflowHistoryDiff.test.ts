import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { IWorkflowDb } from '@/Interface';
import type { WorkflowHistory, WorkflowVersion } from '@n8n/rest-api-client/api/workflowHistory';
import { useWorkflowHistoryStore } from '../workflowHistory.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import WorkflowHistoryDiff from './WorkflowHistoryDiff.vue';
import { telemetry } from '@/app/plugins/telemetry';

vi.mock('@/app/plugins/telemetry', () => ({
	telemetry: { track: vi.fn() },
}));

const workflowId = 'wf-1';
const sourceVersionId = 'v-source';
const targetVersionId = 'v-target';
const otherVersionId = 'v-other';

const availableVersions: WorkflowHistory[] = [
	{
		versionId: sourceVersionId,
		createdAt: '2026-02-25T16:19:43.000Z',
		updatedAt: '2026-02-25T16:19:43.000Z',
		authors: 'User One',
		workflowPublishHistory: [],
		name: 'Source Version',
		description: null,
	},
	{
		versionId: targetVersionId,
		createdAt: '2026-02-25T17:19:43.000Z',
		updatedAt: '2026-02-25T17:19:43.000Z',
		authors: 'User Two',
		workflowPublishHistory: [],
		name: 'Target Version',
		description: null,
	},
	{
		versionId: otherVersionId,
		createdAt: '2026-02-25T18:19:43.000Z',
		updatedAt: '2026-02-25T18:19:43.000Z',
		authors: 'User Three',
		workflowPublishHistory: [],
		name: 'Other Version',
		description: null,
	},
];

const renderComponent = createComponentRenderer(WorkflowHistoryDiff, {
	global: {
		stubs: {
			WorkflowDiffView: defineComponent({
				template:
					'<div><slot name="sourceLabel" /><slot name="targetLabel" /><button data-test-id="diff-rendered" /></div>',
			}),
			WorkflowHistoryVersionSelect: defineComponent({
				props: {
					modelValue: { type: String, required: true },
					dataTestId: { type: String, required: true },
				},
				emits: ['update:modelValue'],
				template: `
					<div>
						<span :data-test-id="dataTestId + '-value'">{{ modelValue }}</span>
						<button
							:data-test-id="dataTestId + '-pick-collision'"
							@click="$emit('update:modelValue', dataTestId.includes('source') ? '${targetVersionId}' : '${sourceVersionId}')"
						/>
						<button
							:data-test-id="dataTestId + '-pick-other'"
							@click="$emit('update:modelValue', '${otherVersionId}')"
						/>
					</div>
				`,
			}),
			N8nText: { template: '<span><slot /></span>' },
		},
	},
});

const createWorkflowVersion = (versionId: string): WorkflowVersion => ({
	versionId,
	workflowId,
	createdAt: '2026-02-25T16:19:43.000Z',
	updatedAt: '2026-02-25T16:19:43.000Z',
	authors: 'User One',
	workflowPublishHistory: [],
	name: `Version ${versionId}`,
	description: null,
	nodes: [],
	connections: {},
});

describe('WorkflowHistoryDiff', () => {
	it('swaps source and target when source selection equals current target', async () => {
		const pinia = createTestingPinia();
		const workflowHistoryStore = useWorkflowHistoryStore();
		const workflowsListStore = useWorkflowsListStore();

		vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue({
			id: workflowId,
			versionId: sourceVersionId,
			activeVersionId: sourceVersionId,
		} as IWorkflowDb);
		vi.spyOn(workflowHistoryStore, 'getWorkflowVersion').mockImplementation(
			async (_workflowId, versionId) => {
				await Promise.resolve();
				return createWorkflowVersion(versionId);
			},
		);

		const rendered = renderComponent({
			pinia,
			props: {
				workflowId,
				sourceWorkflowVersionId: sourceVersionId,
				targetWorkflowVersionId: targetVersionId,
				availableVersions,
			},
		});

		await waitFor(() => expect(rendered.getByTestId('diff-rendered')).toBeInTheDocument());
		await userEvent.click(
			rendered.getByTestId('workflow-history-diff-source-version-pick-collision'),
		);

		await waitFor(() => {
			expect(rendered.getByTestId('workflow-history-diff-source-version-value')).toHaveTextContent(
				targetVersionId,
			);
			expect(rendered.getByTestId('workflow-history-diff-target-version-value')).toHaveTextContent(
				sourceVersionId,
			);
			expect(telemetry.track).toHaveBeenCalledWith('user_selects_version_in_diff', {
				instance_id: '',
				workflow_id: workflowId,
				version_id: targetVersionId,
				side: 'source',
				source: 'version_history',
			});
		});
	});

	it('swaps source and target when target selection equals current source', async () => {
		const pinia = createTestingPinia();
		const workflowHistoryStore = useWorkflowHistoryStore();
		const workflowsListStore = useWorkflowsListStore();

		vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue({
			id: workflowId,
			versionId: sourceVersionId,
			activeVersionId: sourceVersionId,
		} as IWorkflowDb);
		vi.spyOn(workflowHistoryStore, 'getWorkflowVersion').mockImplementation(
			async (_workflowId, versionId) => {
				await Promise.resolve();
				return createWorkflowVersion(versionId);
			},
		);

		const rendered = renderComponent({
			pinia,
			props: {
				workflowId,
				sourceWorkflowVersionId: sourceVersionId,
				targetWorkflowVersionId: targetVersionId,
				availableVersions,
			},
		});

		await waitFor(() => expect(rendered.getByTestId('diff-rendered')).toBeInTheDocument());
		await userEvent.click(
			rendered.getByTestId('workflow-history-diff-target-version-pick-collision'),
		);

		await waitFor(() => {
			expect(rendered.getByTestId('workflow-history-diff-source-version-value')).toHaveTextContent(
				targetVersionId,
			);
			expect(rendered.getByTestId('workflow-history-diff-target-version-value')).toHaveTextContent(
				sourceVersionId,
			);
			expect(telemetry.track).toHaveBeenCalledWith('user_selects_version_in_diff', {
				instance_id: '',
				workflow_id: workflowId,
				version_id: sourceVersionId,
				side: 'target',
				source: 'version_history',
			});
		});
	});

	it('updates only changed side on non-collision selection', async () => {
		const pinia = createTestingPinia();
		const workflowHistoryStore = useWorkflowHistoryStore();
		const workflowsListStore = useWorkflowsListStore();

		vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue({
			id: workflowId,
			versionId: sourceVersionId,
			activeVersionId: sourceVersionId,
		} as IWorkflowDb);
		vi.spyOn(workflowHistoryStore, 'getWorkflowVersion').mockImplementation(
			async (_workflowId, versionId) => {
				await Promise.resolve();
				return createWorkflowVersion(versionId);
			},
		);

		const rendered = renderComponent({
			pinia,
			props: {
				workflowId,
				sourceWorkflowVersionId: sourceVersionId,
				targetWorkflowVersionId: targetVersionId,
				availableVersions,
			},
		});

		await waitFor(() => expect(rendered.getByTestId('diff-rendered')).toBeInTheDocument());
		await userEvent.click(rendered.getByTestId('workflow-history-diff-source-version-pick-other'));

		await waitFor(() => {
			expect(rendered.getByTestId('workflow-history-diff-source-version-value')).toHaveTextContent(
				otherVersionId,
			);
			expect(rendered.getByTestId('workflow-history-diff-target-version-value')).toHaveTextContent(
				targetVersionId,
			);
			expect(telemetry.track).toHaveBeenCalledWith('user_selects_version_in_diff', {
				instance_id: '',
				workflow_id: workflowId,
				version_id: otherVersionId,
				side: 'source',
				source: 'version_history',
			});
		});
	});
});
