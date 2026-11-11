<script setup lang="ts">
import type { InboxItem } from '@n8n/api-types';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAssistantAvatar,
	N8nAvatar,
	N8nContextMenu,
	N8nIconButton,
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
import {
	isPrototypeUnread,
	markPrototypeRead,
	markPrototypeUnread,
	prototypeState,
	prototypeTitle,
	setPrototypeState,
} from '../../prototype.session';
import InboxUnreadDot from './InboxUnreadDot.vue';
import PrototypeMenuItemLabel from './PrototypeMenuItemLabel.vue';
import { formatUserDisplayName } from '../../../reviews/workflowReviews.utils';

const props = defineProps<{ item: InboxItem; selected: boolean }>();
const emit = defineEmits<{ select: [] }>();
const i18n = useI18n();
const $style = useCssModule();
const route = useRoute();
const router = useRouter();
const clipboard = useClipboard();
const { showMessage, showError } = useToast();

type CardMenuAction = 'copy-link' | 'view-gitlab' | 'close' | 'reopen' | 'toggle-unread' | 'state';

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

// Only an unread title is bold.
const unread = computed(() => isPrototypeUnread(props.item.id, cardState(props.item)));
// Only an open item can be unread, so only an open item has the read action.
const canToggleUnread = computed(() => cardState(props.item) === 'open');
// The menu and the quick action share this label and icon.
const toggleUnreadLabel = computed(() =>
	i18n.baseText(unread.value ? 'inbox.prototype.markRead' : 'inbox.prototype.markUnread'),
);
const toggleUnreadIcon = computed(() => (unread.value ? 'check-check' : 'mail'));

function toggleUnread() {
	if (unread.value) markPrototypeRead(props.item.id);
	else markPrototypeUnread(props.item.id);
}

function onSelect() {
	markPrototypeRead(props.item.id);
	emit('select');
}

const requesterName = computed(() => {
	const item = props.item;
	if (item.type === 'self_healing_result' || !item.requester) return '';
	return formatUserDisplayName(item.requester);
});

// The second line of the row. It reads like the direction line of the detail.
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

// The Activity status row reads this same local edit.
function cardState(item: InboxItem) {
	return prototypeState(item.id, item.state);
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
	// The entry toggles the same read state as the quick action.
	if (canToggleUnread.value) {
		actions.push({
			type: 'item',
			id: 'toggle-unread',
			label: toggleUnreadLabel.value,
			icon: { type: 'icon', value: toggleUnreadIcon.value },
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
	if (action === 'toggle-unread') {
		toggleUnread();
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
			<div
				:class="[
					$style.row,
					{ [$style.selected]: selected, [$style.hasQuickAction]: canToggleUnread },
				]"
				role="button"
				tabindex="0"
				:aria-current="selected ? 'true' : undefined"
				:data-source="item.type"
				data-test-id="inbox-row"
				@click="onSelect"
				@keydown.enter.prevent="onSelect"
				@keydown.space.prevent="onSelect"
			>
				<!-- One grid: the avatar column, then the text lines. -->
				<div :class="$style.rowGrid">
					<span :class="$style.avatar">
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
					</span>
					<div :class="$style.top">
						<div :class="$style.titleRow">
							<N8nTooltip
								as-child
								placement="top"
								:show-after="500"
								:disabled="!titleTruncated"
								:content-class="$style.titleTooltip"
							>
								<template #content>{{ cardTitle }}</template>
								<N8nText ref="titleRef" :bold="unread" tag="h3" :class="$style.cardTitle">{{
									cardTitle
								}}</N8nText>
							</N8nTooltip>
						</div>
						<!-- The time, then the dot. A read row has no dot and no gap. -->
						<div :class="$style.trailing">
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
						<!-- The action covers the time group on hover. The group keeps its space. -->
						<N8nTooltip
							v-if="canToggleUnread"
							as-child
							placement="top"
							:content="toggleUnreadLabel"
						>
							<N8nIconButton
								:class="$style.quickAction"
								variant="ghost"
								size="xsmall"
								:icon="toggleUnreadIcon"
								:aria-label="toggleUnreadLabel"
								data-test-id="inbox-row-toggle-unread"
								@click.stop="toggleUnread"
								@keydown.enter.stop
								@keydown.space.stop
							/>
						</N8nTooltip>
					</div>
					<N8nText size="small" color="text-light" :class="[$style.second, $style.actorLine]">{{
						actorLine
					}}</N8nText>
				</div>
			</div>
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
	// The avatar column is as wide as the avatar.
	--inbox-row--avatar-size: var(--spacing--sm);
	cursor: pointer;
	min-width: 0;
	padding: var(--spacing--3xs) var(--spacing--xs);
	border-radius: var(--radius);
}

.row:hover:not(.selected) {
	background-color: var(--background--hover);
}

.row:focus-visible {
	outline: var(--focus--border-width) solid var(--focus--outline-color);
	outline-offset: calc(-1 * var(--focus--border-width));
}

// A solid tint, so the open row stands out from hover in the dense list.
// The unread dot gets a halo in the color of the page. A blue dot would sink into the tint.
.row.selected {
	--unread-dot--halo-width: var(--spacing--5xs);
	--unread-dot--halo-color: var(--background--surface);
	background-color: var(--background--info);
}

.rowGrid {
	display: grid;
	grid-template-columns: var(--inbox-row--avatar-size) minmax(0, 1fr);
	column-gap: var(--spacing--2xs);
	row-gap: var(--spacing--5xs);
	align-items: center;
	width: 100%;
	min-width: 0;
}

// The avatar sits in the first line of the text column.
.avatar {
	grid-column: 1;
	grid-row: 1;
	display: inline-flex;
	justify-content: center;
}

.top {
	position: relative;
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
	min-width: 0;
}

// The time and the dot never shrink. The title gives way first.
.trailing {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--4xs);
}

// The action sits on top of the time group, out of the flow. The row keeps its size.
// It stays in the tab order while it is invisible.
.quickAction {
	position: absolute;
	top: 50%;
	right: calc(-1 * var(--spacing--4xs));
	transform: translateY(-50%);
	opacity: 0;
	pointer-events: none;
}

// Hover and keyboard focus show the action. The time group hides but keeps its space.
.hasQuickAction:is(:hover, :focus-visible, :has(:focus-visible)) {
	.quickAction {
		opacity: 1;
		pointer-events: auto;
	}

	.trailing {
		visibility: hidden;
	}
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

.time {
	white-space: nowrap;
	flex-shrink: 0;
}
</style>
