import type { WorkflowSuggestionActivity } from '@n8n/api-types';
import { VIEWS } from '@n8n/frontend-constants/views';
import { componentRegistry, type SlotWorkflowDiffProps } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';
import { defineComponent } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import SelfHealingResultContent from './SelfHealingResultContent.vue';
import { result, suggestion } from './selfHealingResults.test.utils';

let diffProps: SlotWorkflowDiffProps | undefined;
const DiffView = defineComponent({
	props: [
		'sourceSnapshot',
		'targetSnapshot',
		'workflowId',
		'workflowName',
		'sourceLabel',
		'targetLabel',
	],
	setup(props) {
		diffProps = props as SlotWorkflowDiffProps;
	},
	template: '<div data-test-id="saved-workflow-diff" />',
});

const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{ path: '/workflow/:workflowId', name: VIEWS.WORKFLOW, component: { template: '<div />' } },
		{
			path: '/workflow/:workflowId/executions/:executionId',
			name: VIEWS.EXECUTION_PREVIEW,
			component: { template: '<div />' },
		},
	],
});
const renderComponent = createComponentRenderer(SelfHealingResultContent, {
	global: { plugins: [router], stubs: { RouterLink: false } },
});

function renderContent(
	props: Partial<InstanceType<typeof SelfHealingResultContent>['$props']> = {},
) {
	return renderComponent({
		props: {
			detail: result(),
			workflowName: 'Daily report',
			tab: 'activity',
			pendingAction: null,
			canPublish: true,
			canChat: true,
			...props,
		},
	});
}

beforeEach(() => {
	diffProps = undefined;
	componentRegistry.register('workflow-diff', DiffView);
});
afterEach(() => componentRegistry.clear());

describe('SelfHealingResultContent', () => {
	it('renders the saved report as read-only Markdown', () => {
		const { getByRole, getByTestId, queryByRole } = renderContent({
			detail: result({
				report: '**Diagnosis**\n\n- [ ] Check the connection\n\n<script>example()</script>',
			}),
		});

		expect(getByRole('heading', { name: 'Restore the last step' })).toBeInTheDocument();
		const report = getByTestId('self-healing-report');
		expect(report.querySelector('strong')).toHaveTextContent('Diagnosis');
		expect(within(report).getByRole('checkbox')).toBeDisabled();
		expect(report.querySelector('script')).toBeNull();
		expect(report).toHaveTextContent('<script>example()</script>');
		expect(queryByRole('textbox')).not.toBeInTheDocument();
		expect(queryByRole('tab', { name: 'Trace' })).not.toBeInTheDocument();
	});

	it('offers publishing, both continuation destinations, and discard', async () => {
		const user = userEvent.setup();
		const { getByRole, emitted } = renderContent();

		await user.click(getByRole('button', { name: 'Approve and publish' }));
		await user.click(getByRole('button', { name: 'Apply and open in editor' }));
		await user.click(getByRole('button', { name: 'Apply and open in chat' }));
		await user.click(getByRole('button', { name: 'Discard' }));

		expect(emitted('action')).toEqual([['approve-and-publish'], ['editor'], ['chat'], ['dismiss']]);
	});

	it('keeps editing available when publication is not allowed', async () => {
		const user = userEvent.setup();
		const { getByRole, getByText, emitted } = renderContent({ canPublish: false });

		expect(getByRole('button', { name: 'Approve and publish' })).toBeDisabled();
		expect(getByText('Publish permission is required')).toBeInTheDocument();
		await user.click(getByRole('button', { name: 'Apply and open in editor' }));
		expect(emitted('action')).toEqual([['editor']]);
	});

	it('disables every fix decision while a decision is pending', async () => {
		const { getByRole, emitted } = renderContent({ pendingAction: 'editor' });

		for (const name of [
			'Approve and publish',
			'Apply and open in editor',
			'Apply and open in chat',
			'Discard',
		]) {
			expect(getByRole('button', { name })).toBeDisabled();
		}
		await userEvent.click(getByRole('button', { name: 'Discard' }));
		expect(emitted('action')).toBeUndefined();
	});

	it.each([
		{ outcome: 'needs_you', proposal: null },
		{ outcome: 'needs_you', proposal: suggestion({ resultKind: 'needs_you' }) },
		{ outcome: 'could_not_fix', proposal: null },
	] as const)(
		'offers both destinations for $outcome and labels pending changes explicitly',
		async ({ outcome, proposal }) => {
			const { getByRole, queryByRole, getByTestId, emitted } = renderContent({
				detail: result({ outcome, suggestion: proposal }),
			});

			expect(getByTestId('self-healing-outcome-notice')).toBeInTheDocument();
			expect(queryByRole('button', { name: 'Approve and publish' })).not.toBeInTheDocument();
			expect(queryByRole('tab', { name: 'Changes' }) !== null).toBe(proposal !== null);
			await userEvent.click(
				getByRole('button', { name: proposal ? 'Apply and open in editor' : 'Open in editor' }),
			);
			await userEvent.click(
				getByRole('button', { name: proposal ? 'Apply and open in chat' : 'Open in chat' }),
			);
			await userEvent.click(getByRole('button', { name: 'Dismiss' }));
			expect(emitted('action')).toEqual([['editor'], ['chat'], ['dismiss']]);
		},
	);

	it('keeps a dismissed report available for a new private chat', async () => {
		const { getByRole, queryByRole, getByTestId, emitted } = renderContent({
			detail: result({
				outcome: 'could_not_fix',
				suggestion: null,
				reviewState: 'dismissed',
				dismissedAt: '2026-10-09T09:01:00.000Z',
				dismissedById: 'human-1',
			}),
		});

		expect(getByTestId('self-healing-report')).toBeInTheDocument();
		expect(queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
		await userEvent.click(getByRole('button', { name: 'Open in chat' }));
		expect(emitted('action')).toEqual([['chat']]);
		expect(getByTestId('self-healing-activity')).toHaveTextContent('Completed the investigation');
		expect(getByTestId('self-healing-activity')).toHaveTextContent(
			/A user\s*\|\s*Dismissed the result/,
		);
	});

	it('retains the report and dismissal when chat is unavailable', () => {
		const { getByRole, getByText } = renderContent({
			detail: result({ outcome: 'needs_you', suggestion: null }),
			canChat: false,
		});

		expect(getByRole('button', { name: 'Open in chat' })).toBeDisabled();
		expect(getByRole('button', { name: 'Dismiss' })).toBeEnabled();
		expect(getByText('Chat is unavailable. You can still review the report.')).toBeInTheDocument();
	});

	it('opens an applied result without applying it again or claiming publication', async () => {
		const { getByRole, queryByRole, getByTestId, emitted } = renderContent({
			detail: result({ reviewState: 'applied' }),
		});

		expect(getByTestId('self-healing-status-card')).toHaveTextContent('Closed | Applied');
		expect(getByTestId('self-healing-closed-notice')).toHaveTextContent(
			"Check the workflow's publication status",
		);
		expect(queryByRole('button', { name: 'Approve and publish' })).not.toBeInTheDocument();
		expect(queryByRole('button', { name: 'Discard' })).not.toBeInTheDocument();
		await userEvent.click(getByRole('button', { name: 'Open in editor' }));
		expect(emitted('action')).toEqual([['editor']]);
	});

	it.each(['outdated', 'discarded'] as const)(
		'keeps navigation available for %s suggestions without applying changes',
		(reviewState) => {
			const { getByTestId, queryByRole } = renderContent({ detail: result({ reviewState }) });

			expect(getByTestId('self-healing-closed-notice')).toBeInTheDocument();
			expect(queryByRole('button', { name: 'Open in editor' })).toBeInTheDocument();
			expect(queryByRole('button', { name: 'Open in chat' })).toBeInTheDocument();
			expect(queryByRole('button', { name: 'Apply and open in editor' })).not.toBeInTheDocument();
			expect(queryByRole('button', { name: 'Discard' })).not.toBeInTheDocument();
		},
	);

	it('renders the exact stored snapshots even after a suggestion is outdated', () => {
		const proposal = suggestion({ state: 'closed', closedReason: 'outdated' });
		proposal.payload.original.settings = { executionOrder: 'v1' };
		const { getByTestId } = renderContent({
			detail: result({ suggestion: proposal, reviewState: 'outdated' }),
			tab: 'changes',
		});

		expect(getByTestId('saved-workflow-diff')).toBeInTheDocument();
		expect(diffProps).toMatchObject({
			sourceSnapshot: proposal.payload.original,
			targetSnapshot: proposal.payload.proposed,
			workflowId: 'workflow-1',
			workflowName: 'Daily report',
			sourceLabel: 'Original',
			targetLabel: 'Suggested changes',
		});
		expect(diffProps?.sourceSnapshot).not.toHaveProperty('versionId');
		expect(diffProps?.targetSnapshot).not.toHaveProperty('createdAt');
	});

	it('keeps partial-apply actions available while reviewing the saved changes', async () => {
		const { getByRole, queryByTestId, emitted } = renderContent({
			detail: result({ outcome: 'needs_you', suggestion: suggestion({ resultKind: 'needs_you' }) }),
			tab: 'changes',
		});

		expect(queryByTestId('self-healing-activity-panel')).not.toBeInTheDocument();
		await userEvent.click(getByRole('button', { name: 'Apply and open in editor' }));
		await userEvent.click(getByRole('button', { name: 'Apply and open in chat' }));
		expect(emitted('action')).toEqual([['editor'], ['chat']]);
	});

	it('falls back to Activity when a linked Changes tab has no proposal', () => {
		const { getByTestId, queryByTestId } = renderContent({
			detail: result({ outcome: 'could_not_fix', suggestion: null }),
			tab: 'changes',
		});

		expect(getByTestId('self-healing-activity-panel')).toBeInTheDocument();
		expect(queryByTestId('saved-workflow-diff')).not.toBeInTheDocument();
	});

	it('shows unknown measurements separately from measured zeroes', () => {
		const detail = result({
			usage: {
				credits: 0,
				turns: null,
				durationSeconds: null,
				promptTokens: 0,
				completionTokens: null,
				totalTokens: null,
			},
		});
		const { getByTestId } = renderContent({ detail });

		expect(getByTestId('self-healing-usage-credits')).toHaveTextContent('Credits0');
		expect(getByTestId('self-healing-usage-promptTokens')).toHaveTextContent('Input tokens0');
		for (const field of ['turns', 'duration', 'completionTokens', 'totalTokens']) {
			expect(getByTestId(`self-healing-usage-${field}`)).toHaveTextContent('Not available');
		}
	});

	it('links only an available original execution and preserves the report without it', async () => {
		const { getByTestId, queryByTestId, rerender } = renderContent();
		expect(getByTestId('self-healing-workflow-link')).toHaveAttribute(
			'href',
			'/workflow/workflow-1',
		);
		expect(getByTestId('self-healing-execution-link')).toHaveAttribute(
			'href',
			'/workflow/workflow-1/executions/execution-1',
		);

		await rerender({ detail: result({ execution: { status: 'unavailable' } }) });

		expect(queryByTestId('self-healing-execution-link')).not.toBeInTheDocument();
		expect(getByTestId('self-healing-execution-unavailable')).toHaveTextContent(
			'Execution unavailable',
		);
		expect(getByTestId('self-healing-report')).toBeInTheDocument();
	});

	it('distinguishes Assistant, human, and system activity without exposing actor IDs', () => {
		const activity: WorkflowSuggestionActivity[] = [
			{
				id: 'later',
				action: 'discarded',
				author: 'human',
				actorId: 'human-private-id',
				createdAt: '2026-10-09T10:00:00.000Z',
			},
			...suggestion().activity,
			{
				id: 'outdated',
				action: 'outdated',
				author: 'system',
				actorId: null,
				createdAt: '2026-10-09T09:30:00.000Z',
			},
		];
		const { getAllByTestId, getByTestId } = renderContent({
			detail: result({ suggestion: suggestion({ activity }) }),
		});
		const entries = getAllByTestId('self-healing-activity-entry');

		expect(entries[0]).toHaveTextContent(/n8n Assistant\s*\|\s*Submitted a suggestion/);
		expect(entries[1]).toHaveTextContent(/System\s*\|\s*Marked the suggestion as outdated/);
		expect(entries[2]).toHaveTextContent(/A user\s*\|\s*Discarded the suggested changes/);
		expect(getByTestId('self-healing-activity')).not.toHaveTextContent('human-private-id');
	});

	it.each(['editor', 'chat'] as const)(
		'shows the saved %s continuation in activity',
		(destination) => {
			const { getByTestId } = renderContent({
				detail: result({
					suggestion: null,
					outcome: 'could_not_fix',
					reviewState: 'continued',
					continuedAt: '2026-10-09T10:00:00.000Z',
					continuedById: 'private-user-id',
					continuationDestination: destination,
				}),
			});

			expect(getByTestId('self-healing-status-card')).toHaveTextContent('Closed | Continued');
			expect(getByTestId('self-healing-activity')).toHaveTextContent(
				destination === 'editor' ? 'Continued in the editor' : 'Continued in chat',
			);
			expect(getByTestId('self-healing-activity')).not.toHaveTextContent('private-user-id');
		},
	);

	it('emits tab changes without selecting a new item', async () => {
		const { getByRole, emitted } = renderContent();

		await userEvent.click(getByRole('tab', { name: 'Changes' }));

		expect(emitted('update:tab')).toEqual([['changes']]);
		expect(emitted('action')).toBeUndefined();
	});
});
