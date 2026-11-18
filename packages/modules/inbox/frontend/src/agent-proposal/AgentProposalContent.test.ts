import { AGENT_VIEW } from '@n8n/frontend-constants/agents';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import { arm, caseResult, proposal } from './agentProposal.test.utils';
import AgentProposalContent from './AgentProposalContent.vue';

// Another track owns the two tab components. These stubs show the props that they get.
vi.mock('./AgentProposalChanges.vue', () => ({
	default: {
		props: ['edits', 'evalCases'],
		template:
			'<div data-test-id="changes-stub" :data-edits="edits.length" :data-cases="evalCases.length" />',
	},
}));
vi.mock('./AgentProposalEvalResults.vue', () => ({
	default: {
		props: ['evidence'],
		template: '<div data-test-id="evals-stub" :data-cases="evidence.cases.length" />',
	},
}));

const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{
			path: '/projects/:projectId/agents/:agentId',
			name: AGENT_VIEW,
			component: { template: '<div />' },
		},
	],
});
const renderComponent = createComponentRenderer(AgentProposalContent, {
	global: { plugins: [router], stubs: { RouterLink: false } },
});

function renderContent(props: Partial<InstanceType<typeof AgentProposalContent>['$props']> = {}) {
	return renderComponent({
		props: { detail: proposal(), tab: 'activity', pendingAction: null, ...props },
	});
}

function activity(view: ReturnType<typeof renderContent>) {
	return view
		.getAllByTestId('agent-proposal-activity-entry')
		.map((entry) => [entry.getAttribute('data-action'), entry.textContent]);
}

describe('AgentProposalContent', () => {
	it('opens on Activity with the report as read-only Markdown', () => {
		const view = renderContent({
			detail: proposal({
				report: '**What we found**\n\nThe agent used the wrong tool.\n\n<script>example()</script>',
			}),
		});

		expect(view.getByRole('heading', { name: 'Clarify the lookup tools' })).toBeInTheDocument();
		const report = view.getByTestId('agent-proposal-report');
		expect(report.querySelector('strong')).toHaveTextContent('What we found');
		expect(report.querySelector('script')).toBeNull();
		// Each blank line starts a new paragraph.
		expect(report.querySelectorAll('p').length).toBeGreaterThanOrEqual(3);
		expect(view.queryByTestId('changes-stub')).not.toBeInTheDocument();
		expect(view.queryByTestId('evals-stub')).not.toBeInTheDocument();
	});

	it('shows the three tabs with the number of changes', async () => {
		const view = renderContent();

		expect(view.getAllByRole('tab').map((tab) => tab.textContent?.trim())).toEqual([
			'Activity',
			'Changes 2',
			'Eval results',
		]);
		await userEvent.click(view.getByRole('tab', { name: /Eval results/ }));
		await userEvent.click(view.getByRole('tab', { name: /Changes/ }));
		expect(view.emitted('update:tab')).toEqual([['evals'], ['changes']]);
	});

	it('gives the edits and the eval cases to the Changes tab', () => {
		const view = renderContent({ tab: 'changes' });

		expect(view.getByTestId('changes-stub')).toHaveAttribute('data-edits', '1');
		expect(view.getByTestId('changes-stub')).toHaveAttribute('data-cases', '1');
		expect(view.queryByTestId('agent-proposal-metadata')).not.toBeInTheDocument();
	});

	it('gives the evidence to the Eval results tab', () => {
		const view = renderContent({ tab: 'evals' });

		expect(view.getByTestId('evals-stub')).toHaveAttribute('data-cases', '1');
	});

	it('hides the Eval results tab and shows Activity when the proposal has no evidence', () => {
		const view = renderContent({ tab: 'evals', detail: proposal({ evidence: null }) });

		expect(view.queryByRole('tab', { name: /Eval results/ })).not.toBeInTheDocument();
		expect(view.getByTestId('agent-proposal-activity-panel')).toBeInTheDocument();
	});

	it('offers Apply and Discard while the proposal is open', async () => {
		const view = renderContent();

		await userEvent.click(view.getByRole('button', { name: 'Apply' }));
		await userEvent.click(view.getByRole('button', { name: 'Discard' }));
		expect(view.emitted('action')).toEqual([['apply'], ['dismiss']]);
	});

	it('disables both actions while one is pending', () => {
		const view = renderContent({ pendingAction: 'apply' });

		expect(view.getByTestId('agent-proposal-apply')).toBeDisabled();
		expect(view.getByTestId('agent-proposal-discard')).toBeDisabled();
	});

	it.each(['applied', 'dismissed', 'outdated'] as const)(
		'keeps the report and hides the actions for a proposal that is %s',
		(reviewState) => {
			const view = renderContent({
				detail: proposal({ reviewState, closedAt: '2026-10-10T09:00:00.000Z' }),
			});

			expect(view.getByTestId('agent-proposal-report')).toBeInTheDocument();
			expect(view.queryByTestId('agent-proposal-apply')).not.toBeInTheDocument();
			expect(view.queryByTestId('agent-proposal-discard')).not.toBeInTheDocument();
			expect(view.queryByTestId('agent-proposal-outdated-notice') !== null).toBe(
				reviewState === 'outdated',
			);
		},
	);

	it('counts the cases that the proposed version newly fails', async () => {
		const regression = caseResult({
			caseKey: 'suite:1',
			published: arm('pass'),
			proposed: arm('fail'),
		});
		const view = renderContent({
			detail: proposal({
				evidence: {
					ranAt: '2026-10-09T09:05:00.000Z',
					cases: [
						caseResult(),
						regression,
						{ ...regression, caseKey: 'suite:2' },
						// A case that failed before is not a regression.
						caseResult({ caseKey: 'suite:3', published: arm('fail'), proposed: arm('fail') }),
					],
				},
			}),
		});

		const callout = view.getByTestId('agent-proposal-regressions');
		expect(callout).toHaveTextContent('2 cases that passed with the published agent fail');
		await userEvent.click(within(callout).getByRole('button', { name: 'View eval results' }));
		expect(view.emitted('update:tab')).toEqual([['evals']]);
	});

	it('shows no regression notice when no case regresses', () => {
		const view = renderContent();

		expect(view.queryByTestId('agent-proposal-regressions')).not.toBeInTheDocument();
	});

	it('shows the apply error and the finished parts while the proposal stays open', () => {
		const view = renderContent({
			detail: proposal({
				applyError: 'Another user edits the agent',
				applyProgress: {
					evalsApplied: true,
					savedSkillIds: [],
					savedVersionId: null,
					agentPublished: false,
				},
			}),
		});

		const callout = view.getByTestId('agent-proposal-apply-error');
		expect(callout).toHaveTextContent('Another user edits the agent');
		expect(callout).toHaveTextContent('The eval suite is updated.');
		expect(callout).toHaveTextContent('The agent changes are not published yet.');
		expect(view.getByTestId('agent-proposal-apply')).toBeEnabled();
		expect(activity(view).map(([action]) => action)).toEqual(['investigated', 'proposed']);
	});

	it('says that applied eval cases stay after a discard', () => {
		const view = renderContent({
			detail: proposal({
				reviewState: 'dismissed',
				closedAt: '2026-10-10T09:00:00.000Z',
				applyError: 'Another user edits the agent',
				applyProgress: {
					evalsApplied: true,
					savedSkillIds: [],
					savedVersionId: null,
					agentPublished: false,
				},
			}),
		});

		expect(view.getByTestId('agent-proposal-kept-evals')).toBeInTheDocument();
		expect(view.queryByTestId('agent-proposal-apply-error')).not.toBeInTheDocument();
	});

	describe('timeline', () => {
		it('shows the investigation with its trigger and the proposal for an open result', () => {
			expect(activity(renderContent())).toEqual([
				['investigated', expect.stringContaining('after new production sessions')],
				['proposed', expect.stringContaining('Proposed an improvement')],
			]);
		});

		it.each([
			['applied', 'Ada Lovelace', 'Applied the proposal'],
			['dismissed', 'Ada Lovelace', 'Discarded the proposal'],
		] as const)('names the reviewer of a proposal that is %s', (reviewState, name, label) => {
			const view = renderContent({
				detail: proposal({
					reviewState,
					closedAt: '2026-10-10T09:00:00.000Z',
					closedBy: { id: 'user-1', firstName: 'Ada', lastName: 'Lovelace' },
				}),
			});

			const [action, text] = activity(view)[2];
			expect(action).toBe(reviewState);
			expect(text).toContain(name);
			expect(text).toContain(label);
		});

		it('uses a generic label when the reviewer has no name', () => {
			const view = renderContent({
				detail: proposal({
					reviewState: 'applied',
					closedAt: '2026-10-10T09:00:00.000Z',
					closedBy: { id: 'user-1', firstName: null, lastName: null },
				}),
			});

			expect(activity(view)[2][1]).toContain('A user');
		});

		it('shows the system as the actor of an outdated closure', () => {
			const view = renderContent({
				detail: proposal({ reviewState: 'outdated', closedAt: '2026-10-10T09:00:00.000Z' }),
			});

			expect(activity(view)[2]).toEqual(['outdated', expect.stringContaining('System')]);
		});

		it('marks an automatic apply', () => {
			const view = renderContent({
				detail: proposal({
					reviewState: 'applied',
					appliedAutomatically: true,
					publishedVersionId: 'version-2',
					closedAt: '2026-10-09T09:11:00.000Z',
				}),
			});

			expect(activity(view)[2]).toEqual([
				'publishedAutomatically',
				expect.stringContaining('Applied the proposal automatically'),
			]);
			expect(view.getByTestId('agent-proposal-automatic-badge')).toHaveTextContent(
				'Published automatically',
			);
			expect(view.getByTestId('agent-proposal-status-card')).toHaveTextContent(
				'Applied automatically',
			);
		});

		it('shows no published badge for an automatic apply without an agent change', () => {
			const view = renderContent({
				detail: proposal({
					reviewState: 'applied',
					appliedAutomatically: true,
					edits: [],
					closedAt: '2026-10-09T09:11:00.000Z',
				}),
			});

			expect(view.queryByTestId('agent-proposal-automatic-badge')).not.toBeInTheDocument();
		});
	});

	describe('metadata', () => {
		it('links to the agent and shows the investigation facts', () => {
			const view = renderContent();

			const link = view.getByTestId('agent-proposal-agent-link');
			expect(link).toHaveTextContent('Support agent');
			expect(link).toHaveAttribute('href', '/projects/project-1/agents/agent-1');
			expect(view.getByTestId('agent-proposal-status-card')).toHaveTextContent('Ready for review');
			// The reviewer sees the publication date of the tested version, not its ID.
			const baseVersion = view.getByTestId('agent-proposal-base-version');
			expect(baseVersion).toHaveTextContent(/Tested versionPublished .*2026/);
			expect(view.getByTestId('agent-proposal-metadata')).not.toHaveTextContent('version-1');
			const investigation = view.getByTestId('agent-proposal-investigation');
			expect(investigation).toHaveTextContent('GoalsQuality');
			expect(investigation).toHaveTextContent('TriggerNew production sessions');
			expect(investigation).toHaveTextContent('Production sessions42');
			expect(view.getByTestId('agent-proposal-trace-window')).toHaveTextContent(/2026.*–.*2026/);
			expect(view.getByTestId('agent-proposal-usage-totalTokens')).toHaveTextContent('150');
		});

		it('lists the goals and hides a tested version without a publication date', () => {
			const view = renderContent({
				detail: proposal({ goals: ['quality', 'cost'], baseVersionPublishedAt: null }),
			});

			expect(view.getByTestId('agent-proposal-goals')).toHaveTextContent('Quality, Cost');
			expect(view.queryByTestId('agent-proposal-base-version')).not.toBeInTheDocument();
		});

		it('shows only the end of a session window that has no start', () => {
			const view = renderContent({
				detail: proposal({
					traceWindow: { start: null, end: '2026-10-09T09:00:00.000Z', count: 0 },
				}),
			});

			expect(view.getByTestId('agent-proposal-trace-window')).toHaveTextContent(/^Until /);
		});

		it('shows credits when the investigation was billed in credits', () => {
			const view = renderContent({
				detail: proposal({ usage: { turns: 2, durationSeconds: null, credits: 12 } }),
			});

			expect(view.getByTestId('agent-proposal-usage-credits')).toHaveTextContent('12');
			expect(view.queryByTestId('agent-proposal-usage-duration')).not.toBeInTheDocument();
		});
	});
});
