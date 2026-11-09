<script setup lang="ts">
import type { InboxItem, InboxSelfHealingItem } from '@n8n/api-types';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAssistantAvatar,
	N8nAvatar,
	N8nCard,
	N8nContextMenu,
	N8nText,
	N8nTooltip,
	type ContextMenuNode,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useResizeObserver } from '@vueuse/core';
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { inboxItemLocation } from '../inbox.routes';
import InboxAvatarTooltip from './InboxAvatarTooltip.vue';
import PrototypeStatusMenu from '../prototype/PrototypeStatusMenu.vue';
import { prototypeState, prototypeTitle, setPrototypeState } from '../prototype/prototype.session';
import WorkflowReviewStatusDot from '../reviews/components/WorkflowReviewStatusDot.vue';
import { formatUserDisplayName } from '../reviews/workflowReviews.utils';

const props = defineProps<{ item: InboxItem; selected: boolean }>();
const emit = defineEmits<{ select: [] }>();
const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const clipboard = useClipboard();
const { showMessage, showError } = useToast();

type CardMenuAction = 'copy-link' | 'view-gitlab' | 'close' | 'reopen' | 'state';

// Same steps as the shared relative-time label. The list card then shortens minute words.
const RELATIVE_SECOND_STEPS = [60, 60, 24, 7, 365 / 7 / 12, 12];
const RELATIVE_TIME_KEYS = [
	['timeAgo.justNow', 'timeAgo.rightNow'],
	['timeAgo.justNow', 'timeAgo.rightNow'],
	['timeAgo.oneMinuteAgo', 'timeAgo.inOneMinute'],
	['timeAgo.minutesAgo', 'timeAgo.inMinutes'],
	['timeAgo.oneHourAgo', 'timeAgo.inOneHour'],
	['timeAgo.hoursAgo', 'timeAgo.inHours'],
	['timeAgo.oneDayAgo', 'timeAgo.inOneDay'],
	['timeAgo.daysAgo', 'timeAgo.inDays'],
	['timeAgo.oneWeekAgo', 'timeAgo.inOneWeek'],
	['timeAgo.weeksAgo', 'timeAgo.inWeeks'],
	['timeAgo.oneMonthAgo', 'timeAgo.inOneMonth'],
	['timeAgo.monthsAgo', 'timeAgo.inMonths'],
	['timeAgo.oneYearAgo', 'timeAgo.inOneYear'],
	['timeAgo.yearsAgo', 'timeAgo.inYears'],
] as const;

function inboxCardTime(date: string) {
	const seconds = (Date.now() - new Date(date).getTime()) / 1000;
	const direction = seconds < 0 ? 1 : 0;
	let amount = Math.abs(seconds);
	let index = 0;

	while (index < RELATIVE_SECOND_STEPS.length && amount >= RELATIVE_SECOND_STEPS[index]) {
		amount /= RELATIVE_SECOND_STEPS[index];
		index += 1;
	}

	amount = Math.floor(amount);
	index *= 2;
	if (amount > (index === 0 ? 9 : 1)) index += 1;

	const text = i18n
		.baseText(RELATIVE_TIME_KEYS[index][direction])
		.replace('%s', String(amount))
		.toLowerCase();

	return text.replace(/\bminutes\b/g, 'mins').replace(/\bminute\b/g, 'min');
}

function inboxCardTimeTitle(date: string) {
	const value = new Date(date);
	const offset = value.getTimezoneOffset();
	const sign = offset > 0 ? '-' : '+';
	const absoluteOffset = Math.abs(offset);
	const zone = String(Math.floor(absoluteOffset / 60) * 100 + (absoluteOffset % 60)).padStart(
		4,
		'0',
	);
	const month = value.toLocaleString('en', { month: 'long' });
	const hours = String(value.getHours()).padStart(2, '0');
	const minutes = String(value.getMinutes()).padStart(2, '0');

	return `${value.getDate()} ${month}, ${value.getFullYear()} @ ${hours}:${minutes} ${sign}${zone}`;
}

function itemTitle(item: InboxItem) {
	switch (item.type) {
		case 'workflow_review':
			return item.title;
		case 'self_healing_result':
			return item.summary;
		case 'promotion_review':
			return item.title ?? item.branchName ?? i18n.baseText('inbox.promotionReview.untitled');
	}
}

const cardTitle = computed(() => prototypeTitle(props.item.id, itemTitle(props.item)));
const titleRef = ref<InstanceType<typeof N8nText> | null>(null);
const titleTruncated = ref(false);

function measureTitle() {
	const element: unknown = titleRef.value?.$el;
	// The tooltip shows the full title only when the card cuts it.
	titleTruncated.value =
		element instanceof HTMLElement && element.scrollWidth > element.clientWidth + 1;
}

useResizeObserver(
	computed(() => titleRef.value?.$el ?? null),
	measureTitle,
);

watch(cardTitle, () => {
	void nextTick(measureTitle);
});

const requesterName = computed(() => {
	const item = props.item;
	if (item.type === 'self_healing_result' || !item.requester) return '';
	return formatUserDisplayName(item.requester);
});

function outcomeLabel(item: InboxSelfHealingItem) {
	switch (item.outcome) {
		case 'fix_ready':
			return i18n.baseText('inbox.outcome.fixReady');
		case 'needs_you':
			return i18n.baseText('inbox.outcome.needsAttention');
		case 'could_not_fix':
			return i18n.baseText('inbox.outcome.couldNotFix');
	}
}

// The Activity status row reads this same local edit.
function cardState(item: InboxItem) {
	return prototypeState(item.id, item.state);
}

// The Activity status pill uses this same open label.
function openLabel(item: InboxItem) {
	if (item.type === 'self_healing_result') return outcomeLabel(item);
	return i18n.baseText('workflowReviews.status.open');
}

const menuItems = computed<Array<ContextMenuNode<CardMenuAction>>>(() => {
	const open = cardState(props.item) === 'open';
	const closeLabel =
		props.item.type === 'self_healing_result'
			? i18n.baseText('inbox.selfHealing.action.discardAndClose')
			: i18n.baseText('inbox.contextMenu.closeReview');
	const actions: Array<ContextMenuNode<CardMenuAction>> = [
		{
			type: 'item',
			id: 'copy-link',
			label: i18n.baseText('inbox.contextMenu.copyLink'),
			icon: { type: 'icon', value: 'link' },
		},
	];
	if (props.item.type === 'promotion_review' && props.item.webUrl) {
		actions.push({
			type: 'item',
			id: 'view-gitlab',
			label: i18n.baseText('inbox.promotionReview.detail.viewInGitLab'),
			icon: { type: 'icon', value: 'external-link' },
		});
	}
	actions.push({
		type: 'group',
		id: 'state',
		children: [
			open
				? {
						type: 'item',
						id: 'close',
						label: closeLabel,
						icon: { type: 'icon', value: 'x' },
					}
				: {
						type: 'item',
						id: 'reopen',
						label: i18n.baseText('inbox.contextMenu.reopen'),
						icon: { type: 'icon', value: 'rotate-ccw' },
					},
		],
	});
	return actions;
});

async function copyItemLink() {
	try {
		const href = router.resolve(inboxItemLocation(props.item, route)).href;
		await clipboard.copy(new URL(href, window.location.origin).href);
		showMessage({ title: i18n.baseText('inbox.contextMenu.linkCopied'), type: 'success' });
	} catch (error) {
		showError(error, i18n.baseText('inbox.contextMenu.copyLinkError'));
	}
}

function onMenuSelect(action: CardMenuAction) {
	if (action === 'copy-link') {
		void copyItemLink();
		return;
	}
	if (action === 'view-gitlab' && props.item.type === 'promotion_review' && props.item.webUrl) {
		window.open(props.item.webUrl, '_blank', 'noopener');
		return;
	}
	if (action === 'close' || action === 'reopen') {
		setPrototypeState(props.item.id, action === 'close' ? 'closed' : 'open');
	}
}
</script>

<template>
	<N8nContextMenu :items="menuItems" @select="onMenuSelect">
		<template #trigger>
			<N8nCard
				:class="[$style.card, { [$style.selected]: selected }]"
				role="button"
				tabindex="0"
				:aria-current="selected ? 'true' : undefined"
				:data-source="item.type"
				data-test-id="inbox-row"
				@click="emit('select')"
				@keydown.enter.prevent="emit('select')"
				@keydown.space.prevent="emit('select')"
			>
				<div :class="$style.cardContent">
					<div :class="$style.cardHeader">
						<InboxAvatarTooltip
							v-if="item.type === 'self_healing_result'"
							:name="i18n.baseText('inbox.selfHealing.metadata.assistant')"
						>
							<N8nAssistantAvatar size="mini" data-test-id="inbox-assistant-avatar" />
						</InboxAvatarTooltip>
						<InboxAvatarTooltip v-else-if="item.requester" :name="requesterName">
							<N8nAvatar
								size="xxsmall"
								:first-name="item.requester.firstName ?? ''"
								:last-name="item.requester.lastName ?? ''"
								data-test-id="inbox-requester-avatar"
							/>
						</InboxAvatarTooltip>
						<N8nTooltip
							as-child
							placement="top"
							:show-after="500"
							:disabled="!titleTruncated"
							:content-class="$style.titleTooltip"
						>
							<template #content>{{ cardTitle }}</template>
							<N8nText ref="titleRef" bold tag="h3" :class="$style.cardTitle">{{
								cardTitle
							}}</N8nText>
						</N8nTooltip>
					</div>
					<div :class="$style.meta">
						<!-- Keep a status click on the pill. The row click stays on the card. -->
						<div :class="$style.statusMenu" @click.stop @keydown.stop>
							<PrototypeStatusMenu
								:item-id="item.id"
								:state="cardState(item)"
								:open-label="openLabel(item)"
							>
								<WorkflowReviewStatusDot
									v-if="item.type === 'workflow_review'"
									:state="cardState(item)"
									:decision="item.decision"
									size="small"
									decorative
								/>
								<!-- A promotion review uses the same Open pill as a workflow review. -->
								<WorkflowReviewStatusDot
									v-else-if="item.type === 'promotion_review'"
									:state="cardState(item)"
									decision="pending"
									size="small"
									decorative
								/>
								<span
									v-else
									:class="[
										$style.statusDot,
										cardState(item) === 'closed'
											? $style.dotClosed
											: item.outcome === 'needs_you'
												? $style.dotAttention
												: $style.dotOpen,
									]"
								/>
							</PrototypeStatusMenu>
						</div>
						<div :class="$style.metaActions">
							<N8nText
								v-if="item.type === 'promotion_review' && item.remoteError"
								size="xsmall"
								color="warning"
								>{{
									i18n.baseText(`inbox.promotionReview.remoteError.${item.remoteError}`)
								}}</N8nText
							>
							<N8nText
								:class="$style.time"
								size="xsmall"
								color="text-light"
								:title="inboxCardTimeTitle(item.updatedAt)"
							>
								{{ inboxCardTime(item.updatedAt) }}
							</N8nText>
						</div>
					</div>
				</div>
			</N8nCard>
		</template>
	</N8nContextMenu>
</template>

<style module lang="scss">
.card {
	cursor: pointer;
	padding: var(--spacing--xs);
	align-items: stretch;
	border: var(--border-width) solid var(--border-color);
}

.card:hover:not(.selected) {
	background-color: var(--background--hover);
	border-color: transparent;
}

.selected {
	background-color: var(--background--active);
	border-color: transparent;
}
.card:focus-visible {
	border-color: var(--focus--border-color);
}
.cardContent {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	min-width: 0;
	width: 100%;
}
.cardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	width: 100%;
	min-width: 0;
}
.cardTitle {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
	font-size: var(--font-size--sm);
}

.titleTooltip {
	max-width: calc(var(--spacing--5xl) * 2);
	overflow-wrap: anywhere;
}
.meta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	width: 100%;
	min-width: 0;
}
.statusMenu {
	flex: 0 1 auto;
	min-width: 0;
}
.statusDot {
	flex-shrink: 0;
	width: var(--font-size--3xs);
	height: var(--font-size--3xs);
	border-radius: 50%;
}
.dotOpen {
	background-color: var(--color--blue-500);
}
.dotAttention {
	background-color: var(--color--yellow-500);
}
.dotClosed {
	background-color: var(--color--neutral-500);
}
.metaActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	margin-left: auto;
	flex-shrink: 0;
}

.time {
	white-space: nowrap;
}
</style>
