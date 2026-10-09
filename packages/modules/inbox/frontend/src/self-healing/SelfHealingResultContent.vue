<script setup lang="ts">
import type { SelfHealingResultDetail } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nMarkdown,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import SelfHealingResultActivity from './SelfHealingResultActivity.vue';
import SelfHealingResultMetadata from './SelfHealingResultMetadata.vue';

type DetailTab = 'activity' | 'changes';
type ResultAction = 'approve-and-publish' | 'apply' | 'dismiss' | 'chat';

const props = defineProps<{
	detail: SelfHealingResultDetail;
	workflowName: string;
	tab: DetailTab;
	pendingAction: ResultAction | null;
	canPublish: boolean;
	canChat: boolean;
}>();
const emit = defineEmits<{
	action: [action: ResultAction];
	openEditor: [];
	'update:tab': [tab: DetailTab];
}>();

const i18n = useI18n();
const reportOptions = {
	markdown: { html: false, linkify: true, breaks: true },
	linkAttributes: { attrs: { target: '_blank', rel: 'noopener noreferrer' } },
	tasklists: { enabled: false },
	youtube: {},
};
const WorkflowDiffView = computed(() => componentRegistry.get('workflow-diff'));
const isOpen = computed(() => props.detail.reviewState === 'open');
const isInformational = computed(() => props.detail.outcome !== 'fix_ready');
const hasSuggestion = computed(() => props.detail.suggestion !== null);
const activeTab = computed(() =>
	props.tab === 'changes' && hasSuggestion.value ? 'changes' : 'activity',
);
const pending = computed(() => props.pendingAction !== null);

const outcomeLabel = computed(() => {
	switch (props.detail.outcome) {
		case 'fix_ready':
			return i18n.baseText('inbox.outcome.fixReady');
		case 'needs_you':
			return i18n.baseText('inbox.outcome.needsAttention');
		case 'could_not_fix':
			return i18n.baseText('inbox.outcome.couldNotFix');
	}
});

const statusLabel = computed(() => {
	const state = props.detail.reviewState;
	return state === 'open'
		? `${i18n.baseText('inbox.tabs.open')} | ${outcomeLabel.value}`
		: `${i18n.baseText('inbox.tabs.closed')} | ${i18n.baseText(`inbox.selfHealing.state.${state}`)}`;
});

const statusClass = computed(() => {
	if (!isOpen.value) return props.detail.reviewState === 'applied' ? 'applied' : 'closed';
	return isInformational.value ? 'needsAttention' : 'fixReady';
});

const tabOptions = computed(() => [
	{ label: i18n.baseText('inbox.selfHealing.tabs.activity'), value: 'activity' },
	...(hasSuggestion.value
		? [{ label: i18n.baseText('inbox.selfHealing.tabs.changes'), value: 'changes' }]
		: []),
]);

function onTabChange(tab: string) {
	if (tab === 'activity' || tab === 'changes') emit('update:tab', tab);
}
</script>

<template>
	<section :class="$style.detail" data-test-id="self-healing-result-content">
		<div :class="$style.columnTitle">
			<span :class="[$style.statusDot, $style[statusClass]]" role="img" :aria-label="statusLabel" />
			<N8nHeading
				bold
				tag="h2"
				size="xlarge"
				:class="$style.title"
				data-test-id="self-healing-result-title"
			>
				{{ detail.summary }}
			</N8nHeading>
		</div>
		<slot name="notice" />
		<div :class="$style.container">
			<div :class="$style.tabRow">
				<N8nTabs
					:model-value="activeTab"
					:options="tabOptions"
					variant="modern"
					data-test-id="self-healing-result-tabs"
					@update:model-value="onTabChange"
				/>
				<div v-if="!isInformational && isOpen" :class="$style.decisionActions">
					<N8nButton
						size="medium"
						:label="i18n.baseText('inbox.selfHealing.action.approveAndPublish')"
						:disabled="pending || !canPublish"
						:loading="pendingAction === 'approve-and-publish'"
						@click="emit('action', 'approve-and-publish')"
					/>
					<N8nButton
						variant="outline"
						size="medium"
						:label="i18n.baseText('inbox.selfHealing.action.openInEditor')"
						:disabled="pending"
						:loading="pendingAction === 'apply'"
						@click="emit('action', 'apply')"
					/>
					<N8nButton
						variant="ghost"
						size="medium"
						:label="i18n.baseText('inbox.selfHealing.action.discard')"
						:disabled="pending"
						:loading="pendingAction === 'dismiss'"
						@click="emit('action', 'dismiss')"
					/>
				</div>
				<N8nButton
					v-else-if="detail.reviewState === 'applied'"
					variant="outline"
					size="medium"
					:label="i18n.baseText('inbox.selfHealing.action.openInEditor')"
					:disabled="pending"
					@click="emit('openEditor')"
				/>
			</div>
			<N8nText
				v-if="!isInformational && isOpen && !canPublish"
				size="small"
				color="text-light"
				:class="$style.permissionHint"
			>
				{{ i18n.baseText('inbox.selfHealing.action.publishUnavailable') }}
			</N8nText>
			<div :class="$style.detailBody">
				<div
					v-if="activeTab === 'activity'"
					:class="$style.activityPanel"
					data-test-id="self-healing-activity-panel"
				>
					<div :class="$style.descriptionCard">
						<N8nText tag="h3" bold color="text-light" size="medium">{{
							i18n.baseText('inbox.selfHealing.report')
						}}</N8nText>
						<N8nCallout
							v-if="isInformational"
							theme="warning"
							:class="$style.outcomeNotice"
							data-test-id="self-healing-outcome-notice"
						>
							<strong :class="$style.noticeTitle">{{ outcomeLabel }}</strong>
							{{
								i18n.baseText(
									detail.outcome === 'needs_you'
										? 'inbox.selfHealing.outcome.needsAttention'
										: 'inbox.selfHealing.outcome.couldNotFix',
								)
							}}
							<template #trailingContent>
								<div :class="$style.outcomeActions">
									<N8nButton
										variant="outline"
										size="medium"
										icon="message-circle"
										:label="i18n.baseText('inbox.selfHealing.action.continueInChat')"
										:disabled="pending || !canChat"
										:loading="pendingAction === 'chat'"
										@click="emit('action', 'chat')"
									/>
									<N8nButton
										v-if="isOpen"
										variant="ghost"
										size="medium"
										:label="i18n.baseText('inbox.selfHealing.action.dismiss')"
										:disabled="pending"
										:loading="pendingAction === 'dismiss'"
										@click="emit('action', 'dismiss')"
									/>
								</div>
							</template>
						</N8nCallout>
						<N8nText v-if="isInformational && !canChat" size="small" color="text-light">
							{{ i18n.baseText('inbox.selfHealing.action.chatUnavailable') }}
						</N8nText>
						<N8nCallout
							v-if="detail.reviewState !== 'open'"
							theme="secondary"
							data-test-id="self-healing-closed-notice"
						>
							<strong :class="$style.noticeTitle">{{
								i18n.baseText(`inbox.selfHealing.state.${detail.reviewState}`)
							}}</strong>
							{{ i18n.baseText(`inbox.selfHealing.state.${detail.reviewState}.body`) }}
						</N8nCallout>
						<N8nMarkdown
							:content="detail.report"
							:options="reportOptions"
							:class="$style.report"
							data-test-id="self-healing-report"
						/>
						<N8nCallout
							v-if="detail.suggestion?.payload.errorContext"
							theme="secondary"
							data-test-id="self-healing-failure-context"
						>
							<strong :class="$style.noticeTitle">{{
								i18n.baseText('inbox.selfHealing.failureContext')
							}}</strong>
							{{ detail.suggestion.payload.errorContext.summary }}
						</N8nCallout>
					</div>
					<SelfHealingResultActivity :detail="detail" />
				</div>
				<div v-else :class="$style.changesPanel" data-test-id="self-healing-changes-panel">
					<div v-if="WorkflowDiffView && detail.suggestion" :class="$style.diff">
						<component
							:is="WorkflowDiffView"
							:source-snapshot="detail.suggestion.payload.original"
							:target-snapshot="detail.suggestion.payload.proposed"
							:workflow-id="detail.workflowId"
							:workflow-name="workflowName"
							:source-label="i18n.baseText('inbox.selfHealing.changes.original')"
							:target-label="i18n.baseText('inbox.selfHealing.changes.proposed')"
							show-fullscreen-button
						/>
					</div>
					<N8nCallout v-else theme="warning">{{
						i18n.baseText('inbox.selfHealing.changes.unavailable')
					}}</N8nCallout>
				</div>
				<SelfHealingResultMetadata
					:detail="detail"
					:workflow-name="workflowName"
					:status-label="statusLabel"
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
}

.title {
	overflow-wrap: anywhere;
}

.statusDot {
	flex-shrink: 0;
	width: var(--font-size--3xs);
	height: var(--font-size--3xs);
	border-radius: 50%;
}

.fixReady {
	background-color: var(--color--blue-500);
}

.needsAttention {
	background-color: var(--color--yellow-500);
}

.applied {
	background-color: var(--color--green-500);
}

.closed {
	background-color: var(--color--neutral-500);
}

.tabRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);

	> :global(.n8n-tabs) {
		transform: translateY(var(--spacing--xs));
	}
}

.decisionActions,
.outcomeActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.permissionHint {
	align-self: flex-end;
	margin-top: var(--spacing--2xs);
}

.detailBody {
	display: flex;
	flex: 1;
	gap: var(--spacing--sm);
	min-height: 0;
	padding-top: var(--review-tab-bar--gap);
}

.activityPanel {
	flex: 1;
	min-height: 0;
	min-width: 0;
	overflow: auto;
	max-width: var(--review-activity--max-width);
	margin-inline-end: auto;
}

.descriptionCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--2xs);
}

.outcomeNotice {
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}

.noticeTitle {
	display: block;
	margin-bottom: var(--spacing--4xs);
}

.report:global(.n8n-markdown) {
	--markdown--spacing: var(--spacing--4xs);

	white-space: normal;
	overflow-wrap: anywhere;
	min-width: 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);

	p,
	ul,
	ol,
	li,
	strong,
	em,
	a,
	span,
	code,
	pre,
	blockquote {
		font-size: inherit;
		line-height: inherit;
	}

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		margin-block: var(--spacing--sm) var(--spacing--2xs);
		font-size: var(--font-size--sm);
		line-height: var(--line-height--lg);
	}

	h1 {
		font-size: var(--font-size--md);
	}

	> div > :first-child {
		margin-top: 0;
	}

	> div > :last-child {
		margin-bottom: 0;
	}

	pre {
		white-space: pre-wrap;
	}
}

.changesPanel {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	min-height: 0;
}

.diff {
	flex: 1;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius--2xs);
	overflow: hidden;
	margin-top: var(--spacing--5xs);
}

/* Match the prototype's detail breakpoint. Container queries cannot use CSS variables. */
@container assistant-detail (max-width: 44rem) {
	.tabRow {
		align-items: flex-start;
		flex-wrap: wrap;
	}

	.decisionActions,
	.outcomeActions {
		flex-wrap: wrap;
	}

	.detailBody {
		flex-direction: column;
		overflow: auto;
	}

	.activityPanel {
		flex: 0 0 auto;
		overflow: visible;
		max-width: none;
		margin-inline-end: 0;
	}

	.changesPanel {
		flex: 1 0 auto;
		/* Keep the canvas usable above the metadata when the detail columns stack. */
		min-height: calc(var(--spacing--5xl) + var(--spacing--4xl));
	}
}
</style>
