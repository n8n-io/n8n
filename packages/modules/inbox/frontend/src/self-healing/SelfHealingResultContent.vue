<script setup lang="ts">
import type { SelfHealingResultDetail } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nDropdownMenu,
	N8nHeading,
	N8nIcon,
	N8nMarkdown,
	N8nTabs,
	N8nText,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import SelfHealingResultActivity from './SelfHealingResultActivity.vue';
import SelfHealingResultMetadata from './SelfHealingResultMetadata.vue';
import type { SelfHealingPublishAccess, SelfHealingResultAction } from './selfHealingResults.api';

type DetailTab = 'activity' | 'changes';
type MenuAction = Exclude<SelfHealingResultAction, 'dismiss'>;

const props = defineProps<{
	detail: SelfHealingResultDetail;
	workflowName: string;
	tab: DetailTab;
	pendingAction: SelfHealingResultAction | null;
	publishAccess: SelfHealingPublishAccess;
	canChat: boolean;
}>();
const emit = defineEmits<{
	action: [action: SelfHealingResultAction];
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
const isFixReady = computed(() => props.detail.outcome === 'fix_ready');
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
	if (state === 'open' || state === 'closed') return outcomeLabel.value;
	return i18n.baseText(`inbox.selfHealing.state.${state}`);
});

const statusClass = computed(() => {
	if (!isOpen.value) return 'closed';
	return isFixReady.value ? 'fixReady' : 'needsAttention';
});

const tabOptions = computed(() => [
	{ label: i18n.baseText('inbox.selfHealing.tabs.activity'), value: 'activity' },
	...(hasSuggestion.value
		? [{ label: i18n.baseText('inbox.selfHealing.tabs.changes'), value: 'changes' }]
		: []),
]);

const menuItems = computed<Array<DropdownMenuItemProps<MenuAction>>>(() => {
	const continuation: Array<DropdownMenuItemProps<MenuAction>> = [
		{
			id: 'chat',
			label: i18n.baseText('inbox.selfHealing.action.continueWithAssistant'),
			icon: { type: 'icon', value: 'message-circle-plus' },
			disabled: !props.canChat,
			divided: isFixReady.value,
		},
		{
			id: 'editor',
			label: i18n.baseText('inbox.selfHealing.action.continueWithEditor'),
			icon: { type: 'icon', value: 'square-pen' },
		},
	];
	if (!isFixReady.value) return continuation;

	return [
		{
			id: 'approve-and-publish',
			label: i18n.baseText('inbox.selfHealing.action.applyAndPublish'),
			icon: { type: 'icon', value: 'check' },
			disabled: props.publishAccess !== 'allowed',
		},
		...continuation,
	];
});

const menuNotes = computed(() => [
	...(hasSuggestion.value ? [i18n.baseText('inbox.selfHealing.action.continueSavesDraft')] : []),
	...(isFixReady.value && props.publishAccess === 'denied'
		? [i18n.baseText('inbox.selfHealing.action.publishUnavailable')]
		: []),
	...(props.canChat ? [] : [i18n.baseText('inbox.selfHealing.action.chatUnavailable')]),
]);

function onTabChange(tab: string) {
	if (tab === 'activity' || tab === 'changes') emit('update:tab', tab);
}
</script>

<template>
	<section :class="$style.detail" data-test-id="self-healing-result-content">
		<div :class="$style.columnTitle">
			<span :class="[$style.statusDot, $style[statusClass]]" role="img" :aria-label="statusLabel" />
			<N8nHeading bold tag="h2" size="xlarge" data-test-id="self-healing-result-title">
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
				<div v-if="isOpen" :class="$style.actions">
					<N8nButton
						variant="ghost"
						size="small"
						:label="i18n.baseText('inbox.selfHealing.action.discardAndClose')"
						:disabled="pending"
						:loading="pendingAction === 'dismiss'"
						data-test-id="self-healing-discard"
						@click="emit('action', 'dismiss')"
					/>
					<N8nDropdownMenu
						:items="menuItems"
						placement="bottom-end"
						:disabled="pending"
						content-test-id="self-healing-review-menu"
						@select="emit('action', $event)"
					>
						<template #trigger>
							<N8nButton
								size="small"
								:disabled="pending"
								:loading="pending && pendingAction !== 'dismiss'"
								data-test-id="self-healing-review-trigger"
							>
								{{
									i18n.baseText(
										isFixReady
											? 'inbox.selfHealing.action.review'
											: 'inbox.selfHealing.action.continueIn',
									)
								}}
								<N8nIcon icon="chevron-down" />
							</N8nButton>
						</template>
						<template v-if="menuNotes.length" #footer>
							<div :class="$style.menuNotes">
								<N8nText v-for="note in menuNotes" :key="note" size="small" color="text-light">
									{{ note }}
								</N8nText>
							</div>
						</template>
					</N8nDropdownMenu>
				</div>
			</div>
			<div :class="$style.detailBody">
				<div
					v-if="activeTab === 'activity'"
					:class="$style.activityPanel"
					data-test-id="self-healing-activity-panel"
				>
					<div :class="$style.reportCard">
						<N8nText tag="h3" bold color="text-light" size="medium">
							{{ i18n.baseText('inbox.selfHealing.report') }}
						</N8nText>
						<N8nCallout
							v-if="detail.outcome === 'could_not_fix'"
							theme="danger"
							data-test-id="self-healing-outcome-notice"
						>
							<strong :class="$style.noticeTitle">{{ outcomeLabel }}</strong>
							{{ i18n.baseText('inbox.selfHealing.couldNotFix.body') }}
						</N8nCallout>
						<N8nMarkdown
							:content="detail.report"
							:options="reportOptions"
							:class="$style.report"
							data-test-id="self-healing-report"
						/>
					</div>
					<SelfHealingResultActivity :detail="detail" />
					<N8nCallout
						v-if="detail.reviewState === 'outdated'"
						theme="warning"
						data-test-id="self-healing-outdated-notice"
					>
						<strong :class="$style.noticeTitle">
							{{ i18n.baseText('inbox.selfHealing.state.outdated') }}
						</strong>
						{{ i18n.baseText('inbox.selfHealing.state.outdated.body') }}
					</N8nCallout>
					<N8nCallout
						v-if="isOpen && detail.outcome === 'needs_you'"
						theme="warning"
						data-test-id="self-healing-outcome-notice"
					>
						<strong :class="$style.noticeTitle">
							{{ i18n.baseText('inbox.selfHealing.needsAttention.title') }}
						</strong>
						{{ i18n.baseText('inbox.selfHealing.needsAttention.body') }}
					</N8nCallout>
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
					<N8nCallout v-else theme="warning">
						{{ i18n.baseText('inbox.selfHealing.changes.unavailable') }}
					</N8nCallout>
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

.menuNotes {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	max-width: 16rem;
	padding: 0 var(--spacing--xs) var(--spacing--xs);
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

.reportCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--2xs);
}

.noticeTitle {
	display: block;
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

	.changesPanel {
		flex: 1 0 auto;
		/* Keep the canvas usable above the metadata when the detail columns stack. */
		min-height: calc(var(--spacing--5xl) + var(--spacing--4xl));
	}
}
</style>
