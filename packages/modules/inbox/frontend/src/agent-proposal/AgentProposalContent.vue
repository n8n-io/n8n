<script setup lang="ts">
import { isAgentProposalRegression, type SelfHealingAgentResultDetail } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nMarkdown,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { InboxDetailTab } from '../inbox.constants';
import type { AgentProposalAction } from './agentProposal.api';
import AgentProposalActivity from './AgentProposalActivity.vue';
import AgentProposalChanges from './AgentProposalChanges.vue';
import AgentProposalEvalResults from './AgentProposalEvalResults.vue';
import AgentProposalMetadata from './AgentProposalMetadata.vue';

const props = defineProps<{
	detail: SelfHealingAgentResultDetail;
	tab: InboxDetailTab;
	pendingAction: AgentProposalAction | null;
}>();
const emit = defineEmits<{
	action: [action: AgentProposalAction];
	'update:tab': [tab: InboxDetailTab];
}>();

const i18n = useI18n();
const reportOptions = {
	markdown: { html: false, linkify: true, breaks: true },
	linkAttributes: { attrs: { target: '_blank', rel: 'noopener noreferrer' } },
	tasklists: { enabled: false },
	youtube: {},
};
const isOpen = computed(() => props.detail.reviewState === 'open');
const pending = computed(() => props.pendingAction !== null);
const activeTab = computed<InboxDetailTab>(() => {
	if (props.tab === 'evals') return props.detail.evidence ? 'evals' : 'activity';
	return props.tab;
});
const changeCount = computed(() => props.detail.edits.length + props.detail.evalCases.length);
const regressionCount = computed(
	() => props.detail.evidence?.cases.filter(isAgentProposalRegression).length ?? 0,
);

const statusLabel = computed(() => {
	const { reviewState, appliedAutomatically } = props.detail;
	return i18n.baseText(
		reviewState === 'applied' && appliedAutomatically
			? 'inbox.agentProposal.state.appliedAutomatically'
			: `inbox.agentProposal.state.${reviewState}`,
	);
});
const statusClass = computed(() => (isOpen.value ? 'open' : 'closed'));

const tabOptions = computed(() => [
	{ label: i18n.baseText('inbox.agentProposal.tabs.activity'), value: 'activity' },
	{
		label: i18n.baseText('inbox.agentProposal.tabs.changes'),
		value: 'changes',
		tag: String(changeCount.value),
	},
	...(props.detail.evidence
		? [{ label: i18n.baseText('inbox.agentProposal.tabs.evals'), value: 'evals' }]
		: []),
]);

/** The parts of the proposal and whether the last apply finished each of them. */
const applySteps = computed(() => {
	const { edits, evalCases, applyProgress } = props.detail;
	return [
		...(evalCases.length > 0
			? [
					i18n.baseText(
						applyProgress.evalsApplied
							? 'inbox.agentProposal.applyError.evalsDone'
							: 'inbox.agentProposal.applyError.evalsPending',
					),
				]
			: []),
		...(edits.length > 0
			? [
					i18n.baseText(
						applyProgress.agentPublished
							? 'inbox.agentProposal.applyError.agentDone'
							: 'inbox.agentProposal.applyError.agentPending',
					),
				]
			: []),
	];
});
// Discard and the outdated state do not revert a part that an earlier apply finished.
const keptEvalChanges = computed(
	() =>
		(props.detail.reviewState === 'dismissed' || props.detail.reviewState === 'outdated') &&
		props.detail.evalCases.length > 0 &&
		props.detail.applyProgress.evalsApplied,
);

function onTabChange(tab: string) {
	if (tab === 'activity' || tab === 'changes' || tab === 'evals') emit('update:tab', tab);
}
</script>

<template>
	<section :class="$style.detail" data-test-id="agent-proposal-content">
		<div :class="$style.columnTitle">
			<span :class="[$style.statusDot, $style[statusClass]]" role="img" :aria-label="statusLabel" />
			<N8nHeading bold tag="h2" size="xlarge" data-test-id="agent-proposal-title">
				{{ detail.summary }}
			</N8nHeading>
			<N8nBadge
				v-if="detail.appliedAutomatically && detail.publishedVersionId"
				variant="outline"
				:class="$style.badge"
				data-test-id="agent-proposal-automatic-badge"
				>{{ i18n.baseText('inbox.agentProposal.publishedAutomatically') }}</N8nBadge
			>
		</div>
		<div :class="$style.container">
			<div :class="$style.tabRow">
				<N8nTabs
					:model-value="activeTab"
					:options="tabOptions"
					variant="modern"
					data-test-id="agent-proposal-tabs"
					@update:model-value="onTabChange"
				/>
				<div v-if="isOpen" :class="$style.actions">
					<N8nButton
						variant="ghost"
						size="small"
						:label="i18n.baseText('inbox.agentProposal.action.discard')"
						:disabled="pending"
						:loading="pendingAction === 'dismiss'"
						data-test-id="agent-proposal-discard"
						@click="emit('action', 'dismiss')"
					/>
					<N8nButton
						size="small"
						:label="i18n.baseText('inbox.agentProposal.action.apply')"
						:disabled="pending"
						:loading="pendingAction === 'apply'"
						data-test-id="agent-proposal-apply"
						@click="emit('action', 'apply')"
					/>
				</div>
			</div>
			<div :class="$style.detailBody">
				<div
					v-if="activeTab === 'activity'"
					:class="$style.activityPanel"
					data-test-id="agent-proposal-activity-panel"
				>
					<N8nCallout
						v-if="isOpen && detail.applyError !== null"
						theme="warning"
						data-test-id="agent-proposal-apply-error"
					>
						<strong :class="$style.noticeTitle">
							{{ i18n.baseText('inbox.agentProposal.applyError.title') }}
						</strong>
						{{ detail.applyError }}
						<ul :class="$style.steps">
							<li v-for="step in applySteps" :key="step">{{ step }}</li>
						</ul>
						{{ i18n.baseText('inbox.agentProposal.applyError.retry') }}
					</N8nCallout>
					<div :class="$style.reportCard">
						<N8nText tag="h3" bold color="text-light" size="medium">
							{{ i18n.baseText('inbox.agentProposal.report') }}
						</N8nText>
						<N8nCallout
							v-if="regressionCount > 0"
							theme="warning"
							data-test-id="agent-proposal-regressions"
						>
							{{
								i18n.baseText('inbox.agentProposal.regressions', {
									adjustToNumber: regressionCount,
									interpolate: { count: String(regressionCount) },
								})
							}}
							<template #trailingContent>
								<N8nButton variant="ghost" size="small" @click="emit('update:tab', 'evals')">{{
									i18n.baseText('inbox.agentProposal.regressions.view')
								}}</N8nButton>
							</template>
						</N8nCallout>
						<N8nMarkdown
							:content="detail.report"
							:options="reportOptions"
							:class="$style.report"
							data-test-id="agent-proposal-report"
						/>
					</div>
					<AgentProposalActivity :detail="detail" />
					<N8nCallout
						v-if="detail.reviewState === 'outdated'"
						theme="warning"
						data-test-id="agent-proposal-outdated-notice"
					>
						<strong :class="$style.noticeTitle">
							{{ i18n.baseText('inbox.agentProposal.state.outdated') }}
						</strong>
						{{ i18n.baseText('inbox.agentProposal.outdated.body') }}
					</N8nCallout>
					<N8nCallout v-if="keptEvalChanges" theme="info" data-test-id="agent-proposal-kept-evals">
						{{ i18n.baseText('inbox.agentProposal.keptEvalChanges') }}
					</N8nCallout>
				</div>
				<div
					v-else-if="activeTab === 'changes'"
					:class="$style.tabPanel"
					data-test-id="agent-proposal-changes-panel"
				>
					<AgentProposalChanges :edits="detail.edits" :eval-cases="detail.evalCases" />
				</div>
				<div
					v-else-if="detail.evidence"
					:class="$style.tabPanel"
					data-test-id="agent-proposal-evals-panel"
				>
					<AgentProposalEvalResults :evidence="detail.evidence" />
				</div>
				<AgentProposalMetadata
					v-if="activeTab === 'activity'"
					:detail="detail"
					:status-label="statusLabel"
					:status-class="statusClass"
				/>
			</div>
		</div>
	</section>
</template>

<style module lang="scss">
.detail,
.container {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
	min-width: 0;
}

/* The metadata rail reads this container name, as the rail of an Assistant result does. */
.container {
	container-name: assistant-detail;
	container-type: inline-size;
}

.columnTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--2xl);
	padding-bottom: var(--spacing--sm);
	overflow-wrap: anywhere;
}

.badge {
	flex-shrink: 0;
}

.statusDot {
	flex-shrink: 0;
	width: var(--font-size--3xs);
	height: var(--font-size--3xs);
	border-radius: 50%;
}

.open {
	background-color: var(--color--blue-500);
}

.closed {
	background-color: var(--color--neutral-500);
}

/* Match the tab row of workflow reviews. */
.tabRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding-bottom: var(--review-tab-bar--indicator-overhang);
	border-bottom: var(--border);

	> :global(.n8n-tabs) {
		transform: translateY(var(--spacing--sm));
	}
}

.actions {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--2xs);
}

.detailBody {
	display: flex;
	flex: 1;
	gap: var(--spacing--sm);
	min-height: 0;
	overflow: auto;
	padding-top: var(--spacing--sm);
}

.activityPanel {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
	max-width: var(--review-activity--max-width, 45rem);
	margin-inline-end: auto;
}

.tabPanel {
	flex: 1;
	min-width: 0;
}

.reportCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--2xs);
}

/* The reset gives strong the medium weight, which looks like the body text. */
.noticeTitle {
	display: block;
	font-weight: var(--font-weight--bold);
}

.steps {
	margin: var(--spacing--4xs) 0;
	padding-inline-start: var(--spacing--md);
}

/* The global Markdown rules size paragraphs from this root. */
.report:global(.n8n-markdown) {
	--markdown--spacing: var(--spacing--4xs);
	--n8n-markdown--font-size--base: var(--font-size--sm);

	overflow-wrap: anywhere;
	min-width: 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);

	:is(h1, h2, h3, h4, h5, h6) {
		margin-top: calc(var(--markdown--spacing) * 2);
		font-size: var(--font-size--sm);
		line-height: inherit;

		&:first-child {
			margin-top: 0;
		}
	}
}

/* Match the detail breakpoint of workflow reviews. Container queries cannot use CSS variables. */
@container assistant-detail (max-width: 44rem) {
	.tabRow {
		flex-wrap: wrap;
	}

	/* A full row above the tabs keeps the active-tab indicator on the row border. */
	.actions {
		order: -1;
		width: 100%;
		justify-content: flex-end;
	}

	.detailBody {
		flex-direction: column;
	}

	.activityPanel {
		flex: 0 0 auto;
		max-width: none;
		margin-inline-end: 0;
	}
}
</style>
