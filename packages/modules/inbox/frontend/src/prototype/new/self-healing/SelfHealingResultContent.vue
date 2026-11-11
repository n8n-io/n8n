<script setup lang="ts">
import type { SelfHealingResultDetail } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nDropdownMenu,
	N8nIcon,
	N8nMarkdown,
	N8nTabs,
	N8nText,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import PrototypeDirectionLine from '../../PrototypeDirectionLine.vue';
import PrototypeEditableBody from '../../PrototypeEditableBody.vue';
import PrototypeEditableTitle from '../../PrototypeEditableTitle.vue';
import {
	prototypeDescription,
	prototypeSession,
	prototypeState,
	prototypeTitle,
} from '../../prototype.session';
import PrototypeMenuItemLabel from '../components/PrototypeMenuItemLabel.vue';
import SelfHealingResultActivity from './SelfHealingResultActivity.vue';
import SelfHealingResultMetadata from './SelfHealingResultMetadata.vue';
import type {
	SelfHealingPublishAccess,
	SelfHealingResultAction,
} from '../../../self-healing/selfHealingResults.api';

type DetailTab = 'activity' | 'changes';
type MenuAction = SelfHealingResultAction | 'continue' | 'continue-note' | 'chat-note';

const props = defineProps<{
	detail: SelfHealingResultDetail;
	workflowName: string;
	tab: DetailTab;
	pendingAction: SelfHealingResultAction | null;
	publishAccess: SelfHealingPublishAccess;
	canChat: boolean;
	/** Prototype only. Changes is a resource list and a scrolling diff, with no metadata rail. */
	splitChanges?: boolean;
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
const PromotionChanges = computed(() => componentRegistry.get('promotion-changes-prototype'));
const inboxState = computed(() =>
	prototypeState(props.detail.resultId, props.detail.reviewState === 'open' ? 'open' : 'closed'),
);
const displayTitle = computed(() => prototypeTitle(props.detail.resultId, props.detail.summary));
const fixActor = computed(() => (prototypeSession.active ? { kind: 'assistant' as const } : null));
const fixDirection = computed(() =>
	prototypeSession.active && props.workflowName
		? {
				keypath: 'inbox.prototype.direction.fix' as const,
				resourceName: props.workflowName,
				workflowId: props.detail.workflowId,
			}
		: null,
);
const reportText = computed(() => prototypeDescription(props.detail.resultId, props.detail.report));
const isOpen = computed(() => inboxState.value === 'open');
const isFixReady = computed(() => props.detail.outcome === 'fix_ready');
const hasSuggestion = computed(() => props.detail.suggestion !== null);
const activeTab = computed(() =>
	props.tab === 'changes' && hasSuggestion.value ? 'changes' : 'activity',
);
const pending = computed(() => props.pendingAction !== null);
const continuing = computed(() => pending.value && props.pendingAction !== 'dismiss');

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
	if (!isOpen.value && props.detail.reviewState === 'open') {
		return i18n.baseText('inbox.tabs.closed');
	}
	const state = props.detail.reviewState;
	if (state === 'open' || state === 'closed') return outcomeLabel.value;
	return i18n.baseText(`inbox.selfHealing.state.${state}`);
});

const tabOptions = computed(() => [
	{ label: i18n.baseText('inbox.selfHealing.tabs.activity'), value: 'activity' },
	...(hasSuggestion.value
		? [{ label: i18n.baseText('inbox.selfHealing.tabs.changes'), value: 'changes', tag: '1' }]
		: []),
]);

const menuItems = computed<Array<DropdownMenuItemProps<MenuAction>>>(() => {
	const continueChildren: Array<DropdownMenuItemProps<MenuAction>> = [
		{
			id: 'chat',
			label: i18n.baseText('inbox.selfHealing.action.continueWithAssistant'),
			icon: { type: 'icon', value: 'message-circle-plus' },
			disabled: !props.canChat,
		},
		{
			id: 'editor',
			label: i18n.baseText('inbox.selfHealing.action.continueWithEditor'),
			icon: { type: 'icon', value: 'square-pen' },
		},
	];
	if (hasSuggestion.value) {
		continueChildren.push({
			id: 'continue-note',
			label: i18n.baseText('inbox.selfHealing.action.continueSavesDraft'),
			header: true,
			divided: true,
		});
	}
	if (!props.canChat) {
		continueChildren.push({
			id: 'chat-note',
			label: i18n.baseText('inbox.selfHealing.action.chatUnavailable'),
			header: true,
			divided: !hasSuggestion.value,
		});
	}

	const items: Array<DropdownMenuItemProps<MenuAction>> = [];
	if (isFixReady.value) {
		items.push({
			id: 'approve-and-publish',
			label: i18n.baseText('inbox.selfHealing.action.applyAndPublish'),
			icon: { type: 'icon', value: 'check' },
			disabled: props.publishAccess !== 'allowed',
		});
	}
	items.push(
		{
			id: 'continue',
			label: i18n.baseText('inbox.selfHealing.action.continueWith'),
			icon: { type: 'icon', value: 'pencil' },
			children: continueChildren,
		},
		{
			id: 'dismiss',
			label: i18n.baseText('inbox.selfHealing.action.discardAndClose'),
			icon: { type: 'icon', value: 'x' },
			destructive: true,
			divided: true,
		},
	);
	return items;
});

const menuNotes = computed(() =>
	isFixReady.value && props.publishAccess === 'denied'
		? [i18n.baseText('inbox.selfHealing.action.publishUnavailable')]
		: [],
);

function onMenuSelect(action: MenuAction) {
	if (action === 'continue' || action === 'continue-note' || action === 'chat-note') return;
	emit('action', action);
}

function onTabChange(tab: string) {
	if (tab === 'activity' || tab === 'changes') emit('update:tab', tab);
}
</script>

<template>
	<section :class="$style.detail" data-test-id="self-healing-result-content">
		<div :class="$style.columnTitle">
			<div :class="$style.reviewTitle">
				<PrototypeDirectionLine :actor="fixActor" :direction="fixDirection">
					<PrototypeEditableTitle
						:item-id="detail.resultId"
						:text="displayTitle"
						test-id="self-healing-result-title"
					/>
				</PrototypeDirectionLine>
			</div>
			<div v-if="isOpen" :class="$style.actions">
				<N8nDropdownMenu
					:items="menuItems"
					placement="bottom-end"
					:disabled="pending"
					destructive-at-rest
					content-test-id="self-healing-review-menu"
					sub-menu-width="var(--spacing--5xl)"
					@select="onMenuSelect"
				>
					<template #trigger>
						<N8nButton size="small" :disabled="pending" data-test-id="self-healing-review-trigger">
							{{
								i18n.baseText(
									isFixReady
										? 'inbox.selfHealing.action.review'
										: 'inbox.selfHealing.action.continueWith',
								)
							}}
							<N8nIcon :icon="continuing ? 'loader' : 'chevron-down'" :spin="continuing" />
						</N8nButton>
					</template>
					<template #item-label="{ item, ui }">
						<PrototypeMenuItemLabel
							:label="item.label"
							:label-class="ui.class"
							:disabled="item.disabled"
							:destructive="item.destructive"
							:tooltip="
								item.id === 'dismiss'
									? i18n.baseText('inbox.prototype.closeReview.tooltip')
									: undefined
							"
						/>
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
			</div>
			<div
				:class="[
					$style.detailBody,
					{ [$style.splitBody]: splitChanges && activeTab === 'changes' },
				]"
			>
				<div
					v-if="activeTab === 'activity'"
					:class="$style.activityPanel"
					data-test-id="self-healing-activity-panel"
				>
					<div :class="$style.activityMain">
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
							<PrototypeEditableBody :item-id="detail.resultId" :text="reportText">
								<N8nMarkdown
									:content="reportText"
									:options="reportOptions"
									:class="$style.report"
									data-test-id="self-healing-report"
								/>
							</PrototypeEditableBody>
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
				</div>
				<div v-else :class="$style.changesPanel" data-test-id="self-healing-changes-panel">
					<div v-if="splitChanges" :class="$style.splitHost">
						<component :is="PromotionChanges" :review-id="detail.resultId" />
					</div>
					<div v-else-if="WorkflowDiffView && detail.suggestion" :class="$style.diff">
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
					v-if="!(splitChanges && activeTab === 'changes')"
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
	/* The Review button sits at the top, level with the top of the title. */
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: var(--spacing--2xl);
	padding-bottom: var(--spacing--sm);
}

/* The title takes the space left of the button and cuts long text. */
.reviewTitle {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

/* Match the tab row of workflow reviews. */
.tabRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	border-bottom: var(--border);

	> :global(.n8n-tabs) {
		align-self: flex-end;
		/* The active-tab indicator covers the divider, as on Open and Closed. */
		margin-bottom: calc(-1 * var(--border-width));

		/* Same height for every tab, so a label without a badge lines up with one that has one.
		   The active border stays on the divider. */
		:global([role='tablist']) {
			align-items: stretch;
		}

		:global([role='tablist']) > * {
			display: flex;
			align-items: stretch;
		}

		:global([role='tablist']) > * > * {
			display: flex;
			flex: 1;
			align-items: stretch;
		}

		:global([role='tab']) {
			flex: 1;
			box-sizing: border-box;
		}
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
	gap: var(--spacing--md);
	min-height: 0;
	overflow: auto;
	padding-top: var(--spacing--sm);
}

.activityPanel {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	max-width: var(--review-activity--max-width, 45rem);
	margin-inline-end: auto;
}

.activityMain {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
}

.reportCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	/* The description card sits under the activity feed's top padding. Match that. */
	margin-top: var(--spacing--5xs);
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
	--n8n-markdown--base-font-size: var(--font-size--sm);

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

.splitBody {
	overflow: hidden;
	gap: 0;
	padding-top: 0;
}

.splitHost {
	display: flex;
	flex: 1;
	min-width: 0;
	min-height: 0;

	> * {
		flex: 1;
		min-height: 0;
	}
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
