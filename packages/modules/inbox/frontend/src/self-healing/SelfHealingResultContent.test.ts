import type { WorkflowSuggestionActivity } from '@n8n/api-types';
import { VIEWS } from '@n8n/frontend-constants/views';
import { componentRegistry, type SlotWorkflowDiffProps } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
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

	it('offers publishing, the editor, and discard for a ready fix', async () => {
		const user = userEvent.setup();
		const { getByRole, getByTestId, queryByRole, queryByText, emitted } = renderContent({
			canChat: false,
		});

		expect(getByTestId('self-healing-status-card')).toHaveTextContent(/^StatusFix ready$/);

		await user.click(getByRole('button', { name: 'Apply and publish' }));
		await user.click(getByRole('button', { name: 'Apply and open in editor' }));
		await user.click(getByRole('button', { name: 'Discard' }));

		expect(queryByRole('button', { name: /open in chat/i })).not.toBeInTheDocument();
		expect(
			queryByText('Chat is unavailable. You can still review the report.'),
		).not.toBeInTheDocument();
		expect(emitted('action')).toEqual([['approve-and-publish'], ['editor'], ['dismiss']]);
	});

	it('keeps editing available when publication is not allowed', async () => {
		const user = userEvent.setup();
		const { getByRole, getByText, emitted } = renderContent({ canPublish: false });

		expect(getByRole('button', { name: 'Apply and publish' })).toBeDisabled();
		expect(getByText('Publish permission is required')).toBeInTheDocument();
		await user.click(getByRole('button', { name: 'Apply and open in editor' }));
		expect(emitted('action')).toEqual([['editor']]);
	});

	it('disables every fix decision while a decision is pending', async () => {
		const { getByRole, emitted } = renderContent({ pendingAction: 'editor' });

		for (const name of ['Apply and publish', 'Apply and open in editor', 'Discard']) {
			expect(getByRole('button', { name })).toBeDisabled();
		}
		await userEvent.click(getByRole('button', { name: 'Discard' }));
		expect(emitted('action')).toBeUndefined();
	});

	it.each([
		{ outcome: 'needs_you', proposal: null },
		{ outcome: 'needs_you', proposal: suggestion({ resultKind: 'needs_you' }) },
	] as const)(
		'offers chat and discard for $outcome and labels suggested changes explicitly',
		async ({ outcome, proposal }) => {
			const { getByRole, queryByRole, getByTestId, emitted } = renderContent({
				detail: result({ outcome, suggestion: proposal }),
			});

			expect(getByTestId('self-healing-outcome-notice')).toBeInTheDocument();
			expect(getByTestId('self-healing-status-card')).toHaveTextContent(
				outcome === 'needs_you' ? /^StatusNeeds attention$/ : /^StatusCould not fix$/,
			);
			expect(queryByRole('button', { name: 'Apply and publish' })).not.toBeInTheDocument();
			expect(queryByRole('button', { name: /open in editor/i })).not.toBeInTheDocument();
			expect(queryByRole('tab', { name: 'Changes' }) !== null).toBe(proposal !== null);
			await userEvent.click(
				getByRole('button', { name: proposal ? 'Apply and open in chat' : 'Open in chat' }),
			);
			await userEvent.click(getByRole('button', { name: 'Discard' }));
			expect(emitted('action')).toEqual([['chat'], ['dismiss']]);
		},
	);

	it('offers only chat for an automatically closed cannot-fix result', async () => {
		const { getByRole, getByTestId, queryByRole, emitted } = renderContent({
			detail: result({ outcome: 'could_not_fix', reviewState: 'closed', suggestion: null }),
		});
		expect(getByTestId('self-healing-status-card')).toHaveTextContent('Closed');
		expect(queryByRole('button', { name: 'Discard' })).not.toBeInTheDocument();
		await userEvent.click(getByRole('button', { name: 'Open in chat' }));
		expect(emitted('action')).toEqual([['chat']]);
	});

	it('shows a closed result in its status and activity', () => {
		const { getByTestId, getAllByText } = renderContent({
			detail: result({
				outcome: 'could_not_fix',
				suggestion: null,
				reviewState: 'dismissed',
				dismissedAt: '2026-10-09T09:01:00.000Z',
				dismissedById: 'human-1',
			}),
		});

		expect(getByTestId('self-healing-report')).toBeInTheDocument();
		expect(getByTestId('self-healing-activity')).not.toHaveTextContent('human-1');
		expect(getByTestId('self-healing-status-card')).toHaveTextContent('Closed');
		expect(getAllByText('Closed', { exact: true })).toHaveLength(1);
		expect(getByTestId('self-healing-activity')).toHaveTextContent('Completed the investigation');
		expect(getByTestId('self-healing-activity')).toHaveTextContent(
			/A user\s*\|\s*Closed the result/,
		);
	});

	it('retains the report and discard when chat is unavailable', () => {
		const { getByRole, getByText } = renderContent({
			detail: result({ outcome: 'needs_you', suggestion: null }),
			canChat: false,
		});

		expect(getByRole('button', { name: 'Open in chat' })).toBeDisabled();
		expect(getByRole('button', { name: 'Discard' })).toBeEnabled();
		expect(getByText('Chat is unavailable. You can still review the report.')).toBeInTheDocument();
	});

	it('does not claim that applied changes are published', () => {
		const { getByTestId, queryByTestId } = renderContent({
			detail: result({ reviewState: 'applied' }),
		});

		expect(getByTestId('self-healing-status-card')).toHaveTextContent('Applied');
		expect(getByTestId('self-healing-status-card')).not.toHaveTextContent(/Closed|Published/);
		expect(queryByTestId('self-healing-outdated-notice')).not.toBeInTheDocument();
	});

	it.each(['applied', 'outdated', 'discarded', 'dismissed'] as const)(
		'keeps %s results read-only',
		(reviewState) => {
			const { getByTestId, queryByTestId, queryByRole, queryByText } = renderContent({
				detail: result({ reviewState }),
				canPublish: false,
				canChat: false,
			});

			if (reviewState === 'outdated') {
				expect(getByTestId('self-healing-outdated-notice')).toBeInTheDocument();
			} else {
				expect(queryByTestId('self-healing-outdated-notice')).not.toBeInTheDocument();
			}
			expect(getByTestId('self-healing-report')).toBeInTheDocument();
			expect(getByTestId('self-healing-activity')).toBeInTheDocument();
			for (const name of [
				'Apply and publish',
				'Apply and open in editor',
				'Apply and open in chat',
				'Open in chat',
				'Discard',
			]) {
				expect(queryByRole('button', { name })).not.toBeInTheDocument();
			}
			expect(queryByText('Publish permission is required')).not.toBeInTheDocument();
			expect(
				queryByText('Chat is unavailable. You can still review the report.'),
			).not.toBeInTheDocument();
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

	it('keeps partial-apply chat available while reviewing the saved changes', async () => {
		const { getByRole, queryByRole, queryByTestId, emitted } = renderContent({
			detail: result({ outcome: 'needs_you', suggestion: suggestion({ resultKind: 'needs_you' }) }),
			tab: 'changes',
		});

		expect(queryByTestId('self-healing-activity-panel')).not.toBeInTheDocument();
		expect(queryByRole('button', { name: /open in editor/i })).not.toBeInTheDocument();
		await userEvent.click(getByRole('button', { name: 'Apply and open in chat' }));
		expect(emitted('action')).toEqual([['chat']]);
	});

	it('falls back to Activity when a linked Changes tab has no proposal', () => {
		const { getByTestId, queryByTestId } = renderContent({
			detail: result({ outcome: 'could_not_fix', suggestion: null }),
			tab: 'changes',
		});

		expect(getByTestId('self-healing-activity-panel')).toBeInTheDocument();
		expect(queryByTestId('saved-workflow-diff')).not.toBeInTheDocument();
	});

	it.each([
		{
			deployment: 'Cloud',
			isCloud: true,
			visible: ['credits'],
			hidden: ['promptTokens', 'totalTokens'],
		},
		{
			deployment: 'self-hosted',
			isCloud: false,
			visible: ['promptTokens', 'totalTokens'],
			hidden: ['credits'],
		},
	])('shows known $deployment usage, including zeroes', async ({ isCloud, visible, hidden }) => {
		useSettingsStore().settings.deployment = { type: isCloud ? 'cloud' : 'default' };
		const detail = result({
			usage: {
				turns: 3,
				durationSeconds: null,
				...(isCloud ? { credits: 0 } : { promptTokens: 0, completionTokens: null, totalTokens: 0 }),
			},
		});
		const { getByTestId, queryByTestId, rerender } = renderContent({ detail });

		for (const field of visible) {
			expect(getByTestId(`self-healing-usage-${field}`)).toHaveTextContent('0');
		}
		for (const field of [...hidden, 'turns', 'duration', 'completionTokens']) {
			expect(queryByTestId(`self-healing-usage-${field}`)).not.toBeInTheDocument();
		}

		await rerender({
			detail: result({
				usage: {
					turns: 3,
					durationSeconds: null,
					...(isCloud
						? { credits: null }
						: { promptTokens: null, completionTokens: null, totalTokens: null }),
				},
			}),
		});
		expect(queryByTestId('self-healing-usage')).not.toBeInTheDocument();
	});

	it.each(['cloud', 'default'] as const)(
		'shows saved usage and duration regardless of the %s deployment',
		(deployment) => {
			useSettingsStore().settings.deployment = { type: deployment };
			const { getByTestId, queryByTestId } = renderContent({
				detail: result({
					usage: {
						turns: 3,
						durationSeconds: 65,
						...(deployment === 'cloud'
							? { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
							: { credits: 1 }),
					},
				}),
			});

			expect(getByTestId('self-healing-usage-duration')).toBeInTheDocument();
			if (deployment === 'cloud') {
				expect(getByTestId('self-healing-usage-promptTokens')).toHaveTextContent('100');
				expect(getByTestId('self-healing-usage-completionTokens')).toHaveTextContent('50');
				expect(getByTestId('self-healing-usage-totalTokens')).toHaveTextContent('150');
				expect(queryByTestId('self-healing-usage-credits')).not.toBeInTheDocument();
			} else {
				expect(getByTestId('self-healing-usage-credits')).toHaveTextContent('1');
				for (const field of ['promptTokens', 'completionTokens', 'totalTokens']) {
					expect(queryByTestId(`self-healing-usage-${field}`)).not.toBeInTheDocument();
				}
			}
		},
	);

	it('links only an available original execution and preserves the report without it', async () => {
		const { getByText, getByTestId, queryByTestId, rerender } = renderContent();
		expect(getByText('View execution')).toBeInTheDocument();
		expect(getByTestId('self-healing-execution-link')).toHaveTextContent('Execution execution-1');
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

	it('emits tab changes without selecting a new item', async () => {
		const { getByRole, emitted } = renderContent();

		await userEvent.click(getByRole('tab', { name: 'Changes' }));

		expect(emitted('update:tab')).toEqual([['changes']]);
		expect(emitted('action')).toBeUndefined();
	});
});
