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
import { computed, nextTick, ref, useCssModule, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { inboxItemLocation } from '../../../inbox.routes';
import InboxAvatarTooltip from '../../../components/InboxAvatarTooltip.vue';
import PrototypeStatusMenu from '../../PrototypeStatusMenu.vue';
import {
	isPrototypeUnread,
	markPrototypeRead,
	markPrototypeUnread,
	prototypeSession,
	prototypeState,
	prototypeTitle,
	setPrototypeState,
} from '../../prototype.session';
import InboxUnreadDot from './InboxUnreadDot.vue';
import PrototypeMenuItemLabel from './PrototypeMenuItemLabel.vue';
import { listPreviewText } from './listPreview';
import WorkflowReviewStatusDot from '../../../reviews/components/WorkflowReviewStatusDot.vue';
import { formatUserDisplayName } from '../../../reviews/workflowReviews.utils';

const props = defineProps<{ item: InboxItem; selected: boolean }>();
const emit = defineEmits<{ select: [] }>();
const i18n = useI18n();
const $style = useCssModule();
const route = useRoute();
const router = useRouter();
const clipboard = useClipboard();
const { showMessage, showError } = useToast();

type CardMenuAction = 'copy-link' | 'view-gitlab' | 'close' | 'reopen' | 'mark-unread' | 'state';

// Same steps as the shared relative-time label. The past labels have no "ago" and use their own keys.
const RELATIVE_SECOND_STEPS = [60, 60, 24, 7, 365 / 7 / 12, 12];
const RELATIVE_TIME_KEYS = [
	['timeAgo.justNow', 'timeAgo.rightNow'],
	['timeAgo.justNow', 'timeAgo.rightNow'],
	['inbox.prototype.time.oneMinute', 'timeAgo.inOneMinute'],
	['inbox.prototype.time.minutes', 'timeAgo.inMinutes'],
	['inbox.prototype.time.oneHour', 'timeAgo.inOneHour'],
	['inbox.prototype.time.hours', 'timeAgo.inHours'],
	['inbox.prototype.time.oneDay', 'timeAgo.inOneDay'],
	['inbox.prototype.time.days', 'timeAgo.inDays'],
	['inbox.prototype.time.oneWeek', 'timeAgo.inOneWeek'],
	['inbox.prototype.time.weeks', 'timeAgo.inWeeks'],
	['inbox.prototype.time.oneMonth', 'timeAgo.inOneMonth'],
	['inbox.prototype.time.months', 'timeAgo.inMonths'],
	['inbox.prototype.time.oneYear', 'timeAgo.inOneYear'],
	['inbox.prototype.time.years', 'timeAgo.inYears'],
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

	// The new past keys fill {amount}. The shared future keys fill %s.
	const text = i18n
		.baseText(RELATIVE_TIME_KEYS[index][direction], {
			interpolate: { amount: String(amount) },
		})
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

const variant = computed(() => prototypeSession.listVariant);
const isMailRow = computed(() => variant.value === 'email' || variant.value === 'compact');
const isCompact = computed(() => variant.value === 'compact');
// Cards and Dividers keep a bold title. Email and Compact bold only an unread title.
const boldTitle = computed(() => !isMailRow.value || unread.value);
const unread = computed(() => isPrototypeUnread(props.item.id, cardState(props.item)));

function onSelect() {
	markPrototypeRead(props.item.id);
	emit('select');
}

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

// The second line of an Email or Compact row. It reads like the direction line of the detail.
const actorName = computed(() =>
	props.item.type === 'self_healing_result'
		? i18n.baseText('inbox.selfHealing.metadata.assistant')
		: requesterName.value,
);
const directionText = computed(() => {
	const item = props.item;
	switch (item.type) {
		case 'workflow_review':
			return item.workflowName
				? i18n.baseText('inbox.prototype.direction.publish', {
						interpolate: { resource: item.workflowName },
					})
				: '';
		case 'self_healing_result':
			return i18n.baseText('inbox.prototype.direction.fix', {
				interpolate: { resource: item.workflowName },
			});
		case 'promotion_review':
			return item.environmentName
				? i18n.baseText('inbox.prototype.direction.promote', {
						interpolate: { environment: item.environmentName },
					})
				: '';
	}
});
const actorLine = computed(() =>
	[actorName.value, directionText.value].filter(Boolean).join(' · '),
);
const previewText = computed(() => listPreviewText(props.item));

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
	// Every list style can mark an open, read item as unread.
	if (open && !unread.value) {
		actions.push({
			type: 'item',
			id: 'mark-unread',
			label: i18n.baseText('inbox.prototype.markUnread'),
			icon: { type: 'icon', value: 'mail' },
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
						variant: 'destructive',
						class: $style.dangerRow,
						icon: { type: 'icon', value: 'x', color: '--color--danger' },
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
	if (action === 'mark-unread') {
		markPrototypeUnread(props.item.id);
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
			<component
				:is="variant === 'cards' ? N8nCard : 'div'"
				:class="[$style.row, $style[variant], { [$style.selected]: selected }]"
				role="button"
				tabindex="0"
				:aria-current="selected ? 'true' : undefined"
				:data-source="item.type"
				:data-variant="variant"
				data-test-id="inbox-row"
				@click="onSelect"
				@keydown.enter.prevent="onSelect"
				@keydown.space.prevent="onSelect"
			>
				<!-- All styles share one grid: avatar column, then the text lines. -->
				<div :class="$style.rowGrid">
					<span :class="$style.avatar">
						<InboxAvatarTooltip
							v-if="item.type === 'self_healing_result'"
							:name="i18n.baseText('inbox.selfHealing.metadata.assistant')"
						>
							<N8nAssistantAvatar
								:size="isCompact ? 'mini' : 'small'"
								data-test-id="inbox-assistant-avatar"
							/>
						</InboxAvatarTooltip>
						<InboxAvatarTooltip v-else-if="item.requester" :name="requesterName">
							<N8nAvatar
								:size="isCompact ? 'xxsmall' : 'xsmall'"
								:first-name="item.requester.firstName ?? ''"
								:last-name="item.requester.lastName ?? ''"
								data-test-id="inbox-requester-avatar"
							/>
						</InboxAvatarTooltip>
					</span>
					<div :class="$style.top">
						<!-- Cards and Dividers: the unread dot follows the title text. A long title shrinks, not the dot. -->
						<div :class="$style.titleRow">
							<N8nTooltip
								as-child
								placement="top"
								:show-after="500"
								:disabled="!titleTruncated"
								:content-class="$style.titleTooltip"
							>
								<template #content>{{ cardTitle }}</template>
								<N8nText ref="titleRef" :bold="boldTitle" tag="h3" :class="$style.cardTitle">{{
									cardTitle
								}}</N8nText>
							</N8nTooltip>
							<InboxUnreadDot v-if="unread && !isMailRow" />
						</div>
						<!-- Email and Compact: the time, then the dot. A read row has no dot and no gap. -->
						<div v-if="isMailRow" :class="$style.trailing">
							<N8nText
								:class="$style.time"
								size="xsmall"
								color="text-light"
								:title="inboxCardTimeTitle(item.updatedAt)"
							>
								{{ inboxCardTime(item.updatedAt) }}
							</N8nText>
							<InboxUnreadDot v-if="unread" />
						</div>
					</div>
					<div v-if="!isMailRow" :class="[$style.second, $style.meta]">
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
					<template v-else>
						<N8nText size="small" color="text-light" :class="[$style.second, $style.actorLine]">{{
							actorLine
						}}</N8nText>
						<N8nText
							v-if="variant === 'email'"
							size="small"
							color="text-light"
							:class="$style.preview"
							data-test-id="inbox-row-preview"
							>{{ previewText }}</N8nText
						>
					</template>
				</div>
			</component>
		</template>
		<!-- Hover on the close row explains what it does. -->
		<template #item-label="{ item: menuItem, ui }">
			<PrototypeMenuItemLabel
				:label="menuItem.label"
				:label-class="ui.class"
				:disabled="menuItem.disabled"
				:destructive="menuItem.type === 'item' && menuItem.variant === 'destructive'"
				:tooltip="
					menuItem.id === 'close' ? i18n.baseText('inbox.prototype.closeReview.tooltip') : undefined
				"
			/>
		</template>
	</N8nContextMenu>
</template>

<style module lang="scss">
// The product context menu shows the darker danger text. This list shows the same red as the Review menus.
.dangerRow.dangerRow:not([data-disabled]) {
	color: var(--color--text--danger);
}

.row {
	// The avatar column is as wide as the avatar. The Compact row uses a smaller one.
	--inbox-row--avatar-size: var(--spacing--md);
	cursor: pointer;
	min-width: 0;
}

// Cards: the product card, one box for each row.
.cards {
	padding: var(--spacing--xs);
	align-items: stretch;
	border: var(--border-width) solid var(--border-color);
}

.cards:hover:not(.selected) {
	background-color: var(--background--hover);
	border-color: transparent;
}

.cards:focus-visible {
	border-color: var(--focus--border-color);
}

// Dividers: the card content without the box. The list draws a line between rows.
.dividers {
	padding: var(--spacing--xs);
	border-radius: var(--radius);
}

.dividers:hover:not(.selected) {
	background-color: var(--background--hover);
}

.email,
.compact {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius);
}

// After the shared padding, so the block padding wins. The smaller avatar replaces the one of `.row`.
.compact {
	--inbox-row--avatar-size: var(--spacing--sm);
	padding-block: var(--spacing--3xs);
}

.email:hover:not(.selected),
.compact:hover:not(.selected) {
	background-color: var(--background--hover);
}

.dividers:focus-visible,
.email:focus-visible,
.compact:focus-visible {
	outline: var(--focus--border-width) solid var(--focus--outline-color);
	outline-offset: calc(-1 * var(--focus--border-width));
}

.cards.selected,
.dividers.selected {
	background-color: var(--background--active);
	border-color: transparent;
}

// A solid tint, so the open row stands out from hover in the dense lists.
// The unread dot gets a halo in the color of the page. A blue dot would sink into the tint.
.email.selected,
.compact.selected {
	--unread-dot--halo-width: var(--spacing--5xs);
	--unread-dot--halo-color: var(--background--surface);
	background-color: var(--background--info);
}

.rowGrid {
	display: grid;
	grid-template-columns: var(--inbox-row--avatar-size) minmax(0, 1fr);
	column-gap: var(--spacing--2xs);
	row-gap: var(--spacing--2xs);
	align-items: center;
	width: 100%;
	min-width: 0;
}

.email .rowGrid,
.compact .rowGrid {
	row-gap: var(--spacing--5xs);
}

// The avatar sits in the first line of the text column.
.avatar {
	grid-column: 1;
	grid-row: 1;
	display: inline-flex;
	justify-content: center;
}

.top {
	grid-column: 2;
	grid-row: 1;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.titleRow {
	display: flex;
	flex: 1 1 auto;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

// The time and the dot never shrink. The title gives way first.
.trailing {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--4xs);
}

.cardTitle {
	flex: 0 1 auto;
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

.second {
	grid-column: 2;
	grid-row: 2;
	min-width: 0;
}

.actorLine {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

// A muted preview of the description. It stops after two lines.
.preview {
	grid-column: 2;
	grid-row: 3;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
	min-width: 0;
}

.meta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
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
	flex-shrink: 0;
}
</style>
