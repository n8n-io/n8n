<script setup lang="ts">
import { computed } from 'vue';

import type { VersionHistoryItem } from './VersionHistory.types';
import VersionHistoryRail from './VersionHistoryRail.vue';
import VersionHistoryStatusDot from './VersionHistoryStatusDot.vue';
import { useI18n } from '../../composables/useI18n';
import N8nActionToggle from '../N8nActionToggle/ActionToggle.vue';
import N8nIconButton from '../N8nIconButton/IconButton.vue';
import { N8nListboxItem } from '../N8nListbox';
import N8nText from '../N8nText/Text.vue';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

const props = withDefaults(
	defineProps<{
		item: VersionHistoryItem;
		/** Show the compare control. The menu stays when this is false. */
		showCompare?: boolean;
		/** Line from the top of the row content to the dot. */
		connectAbove?: boolean;
		/** Line from the dot to the bottom of the row content. */
		connectBelow?: boolean;
	}>(),
	{ showCompare: true },
);

const emit = defineEmits<{
	compare: [id: string];
	/** Command or Control click. The list keeps the open version. */
	selectSeparate: [id: string];
	action: [action: string];
}>();

const slots = defineSlots<{
	/** Replaces the compare control and the menu for this row. */
	actions?: (props: { item: VersionHistoryItem }) => unknown;
}>();

/**
 * The compare control is this icon button on every row.
 * A custom actions slot replaces it.
 */
const compareButtonProps = {
	variant: 'ghost' as const,
	icon: 'file-diff' as const,
	size: 'medium' as const,
};

// The tooltip sits to the left of the row so it does not cover the menu.
// The trigger is the inner row. The option keeps its own selected state.
// The delay avoids a tooltip while the pointer moves down the list.
const rowTooltipProps = {
	asChild: true,
	placement: 'left' as const,
	showAfter: 300,
	offset: 8,
};

const { t } = useI18n();

const status = computed(() => props.item.status ?? 'default');
const actions = computed(() => props.item.actions ?? []);
const compareLabel = computed(() => t('versionHistory.compare'));
const compareTooltip = computed(() => props.item.compareTooltip ?? compareLabel.value);
const showActions = computed(
	() => Boolean(props.showCompare) || actions.value.length > 0 || Boolean(slots.actions),
);
const accessibleName = computed(() =>
	[
		props.item.label,
		props.item.detail,
		props.item.author,
		props.item.createdAt,
		props.item.statusLabel,
	]
		.filter((part): part is string => Boolean(part))
		.join(', '),
);

function onActionsKeydown(event: KeyboardEvent) {
	if (event.key === 'Tab') return;
	event.stopPropagation();
}

function isSeparateSelect(event: Event): boolean {
	if (!(event instanceof CustomEvent)) return false;
	const detail: unknown = event.detail;
	if (typeof detail !== 'object' || detail === null || !('originalEvent' in detail)) return false;

	const original: unknown = detail.originalEvent;
	if (typeof original !== 'object' || original === null) return false;

	const metaKey = 'metaKey' in original && original.metaKey === true;
	const ctrlKey = 'ctrlKey' in original && original.ctrlKey === true;
	return metaKey || ctrlKey;
}

function onListboxSelect(event: Event) {
	if (!isSeparateSelect(event)) return;
	event.preventDefault();
	emit('selectSeparate', props.item.id);
}

function onCompare() {
	if (props.item.compareDisabled) return;
	emit('compare', props.item.id);
}

function onAction(action: string) {
	emit('action', action);
}
</script>

<template>
	<N8nListboxItem
		:value="item.id"
		:disabled="item.disabled"
		:aria-label="accessibleName"
		data-test-id="version-history-item"
		:data-version-id="item.id"
		@select="onListboxSelect"
	>
		<N8nTooltip
			v-bind="rowTooltipProps"
			:disabled="!item.tooltip"
			:content-class="$style.rowTooltip"
		>
			<template v-if="item.tooltip" #content>
				<span :class="$style.tooltipTitle">
					<span aria-hidden="true">
						<VersionHistoryStatusDot :status="status" />
					</span>
					<span :class="$style.tooltipTitleText">{{ item.tooltip.title }}</span>
				</span>
				<span v-if="item.tooltip.detail" :class="$style.tooltipDetail">{{
					item.tooltip.detail
				}}</span>
			</template>
			<div :class="$style.body">
				<VersionHistoryRail mark="dot" :connect-above="connectAbove" :connect-below="connectBelow">
					<VersionHistoryStatusDot :status="status" />
				</VersionHistoryRail>
				<div :class="$style.content">
					<span :class="$style.mainRow">
						<N8nText bold size="small" color="text-dark" :class="$style.label">
							{{ item.label }}
						</N8nText>
						<template v-if="item.detail">
							<span :class="$style.separator" aria-hidden="true">·</span>
							<N8nText size="small" color="text-light" :class="$style.detail">
								{{ item.detail }}
							</N8nText>
						</template>
					</span>
					<span v-if="item.author || item.createdAt" :class="$style.metaRow">
						<N8nText v-if="item.author" size="small" color="text-base" :class="$style.author">
							{{ item.author }}<template v-if="item.createdAt">, </template>
						</N8nText>
						<time v-if="item.createdAt" :datetime="item.createdAtIso" :class="$style.time">
							<N8nText size="small" color="text-base">{{ item.createdAt }}</N8nText>
						</time>
					</span>
				</div>
				<!-- Actions stay outside selection. A click or keypress on them does not select the version. -->
				<div v-if="showActions" :class="$style.actions" @click.stop @keydown="onActionsKeydown">
					<slot name="actions" :item="item">
						<N8nTooltip
							v-if="showCompare"
							placement="top"
							:disabled="item.compareDisabled"
							:content-class="$style.compareTooltip"
						>
							<template #content>
								<span :class="$style.compareTooltipText">{{ compareTooltip }}</span>
							</template>
							<N8nIconButton
								v-bind="compareButtonProps"
								:disabled="item.compareDisabled"
								:aria-label="compareLabel"
								data-test-id="version-history-compare"
								@click.stop="onCompare"
							/>
						</N8nTooltip>
						<N8nActionToggle
							v-if="actions.length"
							:actions="actions"
							:disabled="item.actionsDisabled"
							placement="bottom-end"
							@action="onAction"
						/>
					</slot>
				</div>
			</div>
		</N8nTooltip>
	</N8nListboxItem>
</template>

<style lang="scss" module>
.body {
	display: flex;
	align-items: center;
	width: 100%;
	box-sizing: border-box;
	padding-inline: var(--version-history--body-pad, var(--spacing--3xs));
	border-radius: var(--radius);
}

.content {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	min-width: 0;
	padding: var(--spacing--4xs);
}

.mainRow {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.label,
.separator {
	flex-shrink: 0;
}

.separator {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
}

.detail {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.metaRow {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--5xs);
	margin-top: var(--spacing--5xs);
	min-width: 0;
}

.author {
	min-width: 0;
	overflow-wrap: anywhere;
}

.time {
	white-space: nowrap;
	flex-shrink: 0;
}

.actions {
	display: flex;
	align-items: center;
	flex-shrink: 0;
}

.compareTooltip {
	max-width: min(32ch, 80vw);
	align-items: flex-start;
	text-align: start;
}

.compareTooltipText {
	white-space: pre-line;
}

.rowTooltip {
	max-width: min(40ch, 80vw);
	align-items: flex-start;
	text-align: start;
}

.tooltipTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.tooltipTitleText {
	font-weight: var(--font-weight--bold);
}

.tooltipDetail {
	display: block;
	margin-top: var(--spacing--5xs);
	color: color-mix(in srgb, var(--color--neutral-100) 72%, transparent);
}
</style>
