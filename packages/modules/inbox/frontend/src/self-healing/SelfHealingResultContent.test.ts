import type { WorkflowSuggestionActivity } from '@n8n/api-types';
import { VIEWS } from '@n8n/frontend-constants/views';
import { componentRegistry, type SlotWorkflowDiffProps } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/vue';
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
			publishAccess: 'allowed',
			canChat: true,
			...props,
		},
	});
}

async function openMenu(name: 'Review' | 'Continue in…') {
	await userEvent.click(screen.getByRole('button', { name }));
	return await screen.findByRole('menu');
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

	it('offers publishing and both continuations for a ready fix', async () => {
		const { getByRole, getByTestId, emitted } = renderContent();

		expect(getByTestId('self-healing-status-card')).toHaveTextContent(/^StatusFix ready$/);
		const menu = await openMenu('Review');
		expect(
			within(menu)
				.getAllByRole('menuitem')
				.map((item) => item.textContent?.trim()),
		).toEqual(['Apply and publish', 'Continue with Assistant', 'Continue with Editor']);
		expect(menu).toHaveTextContent(
			'Continuing saves the changes to the workflow draft. It does not publish them.',
		);
		await userEvent.click(within(menu).getByRole('menuitem', { name: 'Apply and publish' }));
		await userEvent.click(getByRole('button', { name: 'Discard and close' }));

		expect(emitted('action')).toEqual([['approve-and-publish'], ['dismiss']]);
	});

	it.each([
		['Continue with Assistant', 'chat'],
		['Continue with Editor', 'editor'],
	])('emits %s from the Review menu', async (name, action) => {
		const { emitted } = renderContent();

		const menu = await openMenu('Review');
		await userEvent.click(within(menu).getByRole('menuitem', { name }));

		expect(emitted('action')).toEqual([[action]]);
	});

	it('disables publishing and explains why when publication is not allowed', async () => {
		renderContent({ publishAccess: 'denied' });

		const menu = await openMenu('Review');

		expect(within(menu).getByRole('menuitem', { name: 'Apply and publish' })).toHaveAttribute(
			'data-disabled',
		);
		expect(
			within(menu).getByRole('menuitem', { name: 'Continue with Editor' }),
		).not.toHaveAttribute('data-disabled');
		expect(menu).toHaveTextContent('Publish permission is required to apply and publish.');
	});

	it('disables publishing without a permission note while access is unknown', async () => {
		renderContent({ publishAccess: 'unknown' });

		const menu = await openMenu('Review');

		expect(within(menu).getByRole('menuitem', { name: 'Apply and publish' })).toHaveAttribute(
			'data-disabled',
		);
		expect(menu).not.toHaveTextContent('Publish permission is required');
	});

	it('disables every decision while a decision is pending', () => {
		const { getByRole } = renderContent({ pendingAction: 'editor' });

		expect(getByRole('button', { name: 'Discard and close' })).toBeDisabled();
		expect(getByRole('button', { name: /Review/ })).toBeDisabled();
	});

	it.each([
		{ pendingAction: null, icon: 'chevron-down', spin: false },
		{ pendingAction: 'chat', icon: 'loader', spin: true },
		{ pendingAction: 'dismiss', icon: 'chevron-down', spin: false },
	] as const)(
		'shows $icon in the review trigger while $pendingAction is pending',
		({ pendingAction, icon, spin }) => {
			const { getByRole } = renderContent({ pendingAction });
			const trigger = getByRole('button', { name: /Review/ });

			expect(trigger).not.toHaveAttribute('aria-busy');
			const triggerIcon = trigger.querySelector('[data-icon]');
			expect(triggerIcon).toHaveAttribute('data-icon', icon);
			expect(triggerIcon?.classList.contains('spin')).toBe(spin);
		},
	);

	it.each([
		{ proposal: null, notice: false },
		{ proposal: suggestion({ resultKind: 'needs_you' }), notice: true },
	])(
		'offers both continuations without publishing for Needs attention',
		async ({ proposal, notice }) => {
			const { getByRole, queryByRole, getByTestId, emitted } = renderContent({
				detail: result({ outcome: 'needs_you', suggestion: proposal }),
			});

			expect(getByTestId('self-healing-outcome-notice')).toHaveTextContent(
				'Assistant needs your feedback',
			);
			expect(getByTestId('self-healing-status-card')).toHaveTextContent(/^StatusNeeds attention$/);
			expect(queryByRole('button', { name: /Review/ })).not.toBeInTheDocument();
			expect(queryByRole('tab', { name: 'Changes' }) !== null).toBe(proposal !== null);

			const menu = await openMenu('Continue in…');
			expect(
				within(menu)
					.getAllByRole('menuitem')
					.map((item) => item.textContent?.trim()),
			).toEqual(['Continue with Assistant', 'Continue with Editor']);
			expect(menu.textContent?.includes('Continuing')).toBe(notice);
			await userEvent.click(within(menu).getByRole('menuitem', { name: 'Continue with Editor' }));
			await userEvent.click(getByRole('button', { name: 'Discard and close' }));

			expect(emitted('action')).toEqual([['editor'], ['dismiss']]);
		},
	);

	it('shows a closed Could not fix result without review actions', () => {
		const { getByTestId, queryByRole } = renderContent({
			detail: result({ outcome: 'could_not_fix', suggestion: null, reviewState: 'closed' }),
		});

		expect(getByTestId('self-healing-status-card')).toHaveTextContent(/^StatusCould not fix$/);
		expect(getByTestId('self-healing-outcome-notice')).toHaveTextContent('closed automatically');
		expect(getByTestId('self-healing-report')).toBeInTheDocument();
		expect(getByTestId('self-healing-activity')).toHaveTextContent(
			/System\s*\|\s*Closed automatically because no fix was possible/,
		);
		expect(queryByRole('button', { name: 'Discard and close' })).not.toBeInTheDocument();
		expect(queryByRole('button', { name: /Continue in|Review/ })).not.toBeInTheDocument();
		expect(queryByRole('tab', { name: 'Changes' })).not.toBeInTheDocument();
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

	it('keeps the editor and discard available when chat is unavailable', async () => {
		const { getByRole } = renderContent({
			detail: result({ outcome: 'needs_you', suggestion: null }),
			canChat: false,
		});

		expect(getByRole('button', { name: 'Discard and close' })).toBeEnabled();
		const menu = await openMenu('Continue in…');
		expect(within(menu).getByRole('menuitem', { name: 'Continue with Assistant' })).toHaveAttribute(
			'data-disabled',
		);
		expect(
			within(menu).getByRole('menuitem', { name: 'Continue with Editor' }),
		).not.toHaveAttribute('data-disabled');
		expect(menu).toHaveTextContent(
			'Assistant is unavailable. You can still continue in the editor.',
		);
	});

	it.each([
		{ reviewState: 'applied', label: 'Applied' },
		{ reviewState: 'dismissed', label: 'Closed' },
	] as const)('uses the closed status color for $reviewState results', ({ reviewState, label }) => {
		const { getByRole } = renderContent({ detail: result({ reviewState }) });

		expect(getByRole('img', { name: label }).className).toMatch(/closed/);
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
			const { getByTestId, queryByTestId, queryByRole } = renderContent({
				detail: result({ reviewState }),
				publishAccess: 'denied',
				canChat: false,
			});

			if (reviewState === 'outdated') {
				expect(getByTestId('self-healing-outdated-notice')).toBeInTheDocument();
			} else {
				expect(queryByTestId('self-healing-outdated-notice')).not.toBeInTheDocument();
			}
			expect(getByTestId('self-healing-report')).toBeInTheDocument();
			expect(getByTestId('self-healing-activity')).toBeInTheDocument();
			expect(queryByRole('button', { name: 'Discard and close' })).not.toBeInTheDocument();
			expect(queryByRole('button', { name: /Review/ })).not.toBeInTheDocument();
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

	it('keeps continuation available while reviewing the suggested changes', async () => {
		const { queryByTestId, emitted } = renderContent({
			detail: result({ outcome: 'needs_you', suggestion: suggestion({ resultKind: 'needs_you' }) }),
			tab: 'changes',
		});

		expect(queryByTestId('self-healing-activity-panel')).not.toBeInTheDocument();
		const menu = await openMenu('Continue in…');
		await userEvent.click(within(menu).getByRole('menuitem', { name: 'Continue with Assistant' }));
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
