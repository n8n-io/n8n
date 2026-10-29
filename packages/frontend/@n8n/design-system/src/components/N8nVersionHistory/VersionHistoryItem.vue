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

const props = defineProps<{
	item: VersionHistoryItem;
	/** Line from the top of the row content to the dot. */
	connectAbove?: boolean;
	/** Line from the dot to the bottom of the row content. */
	connectBelow?: boolean;
}>();

const emit = defineEmits<{
	compare: [id: string];
	action: [action: string];
}>();

defineSlots<{
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

const { t } = useI18n();

const status = computed(() => props.item.status ?? 'default');
const actions = computed(() => props.item.actions ?? []);
const compareLabel = computed(() => t('versionHistory.compare'));
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
		:class="$style.body"
		data-test-id="version-history-item"
		:data-version-id="item.id"
	>
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
		<div :class="$style.actions" @click.stop @keydown="onActionsKeydown">
			<slot name="actions" :item="item">
				<N8nTooltip placement="top" :content="compareLabel" :disabled="item.compareDisabled">
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
</style>
