<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type {
	VersionHistoryActionPayload,
	VersionHistoryItem as VersionHistoryRow,
	VersionHistoryProps,
	VersionHistoryTogglePayload,
} from './VersionHistory.types';
import { buildHistoryRows, groupIdForVersion, isHistoryRow } from './versionHistoryRows';
import VersionHistoryGroup from './VersionHistoryGroup.vue';
import VersionHistoryHeading from './VersionHistoryHeading.vue';
import VersionHistoryItem from './VersionHistoryItem.vue';
import { useI18n } from '../../composables/useI18n';
import N8nLoading from '../N8nLoading/Loading.vue';
import N8nRecycleScroller from '../N8nRecycleScroller';

defineOptions({ name: 'N8nVersionHistory' });

const props = withDefaults(defineProps<VersionHistoryProps>(), {
	items: () => [],
	loading: false,
});

const emit = defineEmits<{
	/** The user opens a version. */
	select: [id: string];
	/** The user compares a version. */
	compare: [id: string];
	/** The user chooses an action from a version menu. */
	action: [value: VersionHistoryActionPayload];
	/** The user opens or closes a group. */
	toggle: [value: VersionHistoryTogglePayload];
}>();

defineSlots<{
	/** Content shown when the list is empty. The panel centers it. */
	empty?: () => unknown;
	/** Replaces the compare control and the menu. Receives the row. */
	actions?: (props: { item: VersionHistoryRow }) => unknown;
}>();

const SKELETON_ROWS = [
	{ title: '42%', meta: '68%' },
	{ title: '28%', meta: '52%' },
	{ title: '36%', meta: '60%' },
] as const;

// The scroller measures each row and replaces this estimate.
// The estimate covers the gap between marks and two lines of text.
const ESTIMATED_ROW_HEIGHT = 48;

const { t } = useI18n();
const expandedIds = ref<Set<string>>(new Set());
// Used only when the parent omits selectedId.
const uncontrolledSelectedId = ref<string | undefined>();

const listLabel = computed(() => props.label ?? t('versionHistory.label'));
const loadingLabel = computed(() => props.loadingLabel ?? t('versionHistory.loading'));
const activeId = computed(() =>
	props.selectedId !== undefined ? props.selectedId : uncontrolledSelectedId.value,
);

const selectedGroupId = computed(() => groupIdForVersion(props.items, activeId.value));

// Open the group that contains the selected version. Closing it stays closed
// until the selection moves.
watch(
	selectedGroupId,
	(groupId) => {
		if (!groupId || expandedIds.value.has(groupId)) return;
		const next = new Set(expandedIds.value);
		next.add(groupId);
		expandedIds.value = next;
	},
	{ immediate: true },
);

const rows = computed(() => buildHistoryRows(props.items, expandedIds.value));

function onSelect(id: string) {
	if (props.selectedId === undefined) {
		uncontrolledSelectedId.value = id;
	}
	emit('select', id);
}

function onAction(id: string, action: string) {
	emit('action', { id, action });
}

function onToggle(id: string) {
	const next = new Set(expandedIds.value);
	const expanded = !next.has(id);
	if (expanded) next.add(id);
	else next.delete(id);
	expandedIds.value = next;
	emit('toggle', { id, expanded });
}
</script>

<template>
	<section
		:class="$style.panel"
		data-test-id="version-history"
		:aria-label="!loading ? listLabel : undefined"
		:aria-busy="loading ? 'true' : undefined"
	>
		<div
			v-if="loading"
			:class="$style.loading"
			role="status"
			aria-live="polite"
			:aria-label="loadingLabel"
			data-test-id="version-history-loading"
		>
			<div
				v-for="(row, index) in SKELETON_ROWS"
				:key="index"
				:class="$style.skeleton"
				aria-hidden="true"
			>
				<span :class="$style.skeletonMark">
					<span :class="$style.skeletonDot">
						<N8nLoading variant="circle" />
					</span>
				</span>
				<span :class="$style.skeletonCopy">
					<span :class="$style.skeletonLine" :style="{ width: row.title }">
						<N8nLoading variant="text" />
					</span>
					<span :class="$style.skeletonLine" :style="{ width: row.meta }">
						<N8nLoading variant="text" />
					</span>
				</span>
			</div>
		</div>

		<N8nRecycleScroller
			v-else-if="rows.length"
			:class="$style.list"
			:items="rows"
			item-key="key"
			:item-size="ESTIMATED_ROW_HEIGHT"
		>
			<template #default="{ item }">
				<li
					v-if="isHistoryRow(item)"
					:class="[
						$style.row,
						item.isFirst && $style.first,
						item.isLast && $style.last,
						item.kind === 'heading' && $style.headingRow,
						!item.connectAbove && !item.isFirst && item.kind !== 'heading' && $style.segmentStart,
					]"
					data-test-id="version-history-row"
				>
					<!-- The gap sits outside the row content. A heading leaves this gap empty. -->
					<span
						v-if="item.connectAbove"
						:class="$style.gap"
						data-test-id="version-history-line"
						data-segment="gap"
					/>
					<VersionHistoryHeading v-if="item.kind === 'heading'" :label="item.label" />
					<VersionHistoryItem
						v-else-if="item.kind === 'version'"
						:item="item.item"
						:selected="item.item.id === activeId"
						:connect-above="item.connectAbove"
						:connect-below="item.connectBelow"
						@select="onSelect"
						@compare="emit('compare', $event)"
						@action="onAction(item.item.id, $event)"
					>
						<template v-if="$slots.actions" #actions="slotProps">
							<slot name="actions" v-bind="slotProps" />
						</template>
					</VersionHistoryItem>
					<VersionHistoryGroup
						v-else-if="item.kind === 'group'"
						:label="item.label"
						:expanded="item.expanded"
						:connect-above="item.connectAbove"
						:connect-below="item.connectBelow"
						@toggle="onToggle(item.groupId)"
					/>
				</li>
			</template>
		</N8nRecycleScroller>

		<div v-else :class="$style.empty" data-test-id="version-history-empty">
			<slot name="empty" />
		</div>
	</section>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	min-width: 0;
	color: var(--color--text);
}

.list {
	flex: 1;
	min-height: 0;
}

.row {
	// Shared with the rail so the gap line and the dot use one center.
	--version-history--body-pad: var(--spacing--3xs);
	--version-history--rail-margin: var(--spacing--4xs);
	--version-history--rail-size: var(--spacing--lg);

	// The gap between rows. The timeline line in .gap uses the same length.
	--version-history--row-gap: var(--spacing--3xs);

	position: relative;
	display: block;
	box-sizing: border-box;
	width: 100%;
	padding-top: var(--version-history--row-gap);
	padding-inline: var(--spacing--2xs);
	list-style: none;
}

.first {
	padding-top: var(--spacing--3xs);
}

.last {
	padding-bottom: var(--spacing--3xs);
}

// Space with no line. The track ends, the heading shows, and the next track starts.
.headingRow {
	padding-top: var(--spacing--sm);
	padding-bottom: var(--spacing--sm);
}

// The heading row already holds the space before this track.
.segmentStart {
	padding-top: 0;
}

.gap {
	position: absolute;
	top: 0;
	left: calc(
		var(--spacing--2xs) + var(--version-history--body-pad) + var(--version-history--rail-margin) +
			(var(--version-history--rail-size) / 2)
	);
	width: var(--border-width);
	height: var(--version-history--row-gap);
	transform: translateX(-50%);
	background-color: var(--color--foreground);
	pointer-events: none;
}

.loading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-height: 0;
	padding: var(--spacing--sm) var(--spacing--2xs);
}

.skeleton {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs);
}

.skeletonMark {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: var(--spacing--lg);
}

.skeletonDot {
	display: block;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	overflow: hidden;
	border-radius: 50%;
}

.skeletonCopy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.skeletonLine {
	display: block;
	height: var(--spacing--xs);
	overflow: hidden;
	border-radius: var(--radius--3xs);
}

.skeletonDot,
.skeletonLine {
	:global(.el-skeleton),
	:global(.el-skeleton__item) {
		width: 100%;
		height: 100%;
		// The shared skeleton fill matches this panel's background, so the rows disappear.
		background: var(--color--neutral-300);
	}

	:global(.el-skeleton.is-animated .el-skeleton__item) {
		background: linear-gradient(
			90deg,
			var(--color--neutral-300) 25%,
			var(--color--neutral-400) 37%,
			var(--color--neutral-300) 63%
		);
		background-size: 400% 100%;
	}
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--4xs);
	flex: 1;
	min-height: 0;
	padding: var(--spacing--lg) var(--spacing--md);
	text-align: center;
}
</style>
