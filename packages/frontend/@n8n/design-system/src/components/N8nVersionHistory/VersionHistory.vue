<script setup lang="ts">
import { computed } from 'vue';

import type {
	VersionHistoryActionPayload,
	VersionHistoryItem as VersionHistoryRow,
	VersionHistoryProps,
} from './VersionHistory.types';
import VersionHistoryItem from './VersionHistoryItem.vue';
import { useI18n } from '../../composables/useI18n';
import N8nLoading from '../N8nLoading/Loading.vue';
import N8nScrollArea from '../N8nScrollArea/N8nScrollArea.vue';

defineOptions({ name: 'N8nVersionHistory' });

const props = withDefaults(defineProps<VersionHistoryProps>(), {
	items: () => [],
	showCompare: false,
	loading: false,
});

const emit = defineEmits<{
	/** The user opens a version. */
	select: [id: string];
	/** The user compares a version. */
	compare: [id: string];
	/** The user chooses an action from a version menu. */
	action: [value: VersionHistoryActionPayload];
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

const { t } = useI18n();

const listLabel = computed(() => props.label ?? t('versionHistory.label'));
const loadingLabel = computed(() => props.loadingLabel ?? t('versionHistory.loading'));
const compareLabel = computed(() => props.compareLabel ?? t('versionHistory.compare'));

function onAction(id: string, action: string) {
	emit('action', { id, action });
}
</script>

<template>
	<section
		:class="$style.panel"
		data-test-id="version-history"
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

		<N8nScrollArea v-else-if="items.length" :class="$style.scroll">
			<ul :class="$style.list" :aria-label="listLabel || undefined">
				<VersionHistoryItem
					v-for="item in items"
					:key="item.id"
					:item="item"
					:selected="item.id === selectedId"
					:show-compare="showCompare"
					:compare-label="compareLabel"
					@select="emit('select', $event)"
					@compare="emit('compare', $event)"
					@action="onAction(item.id, $event)"
				>
					<template v-if="$slots.actions" #actions="slotProps">
						<slot name="actions" v-bind="slotProps" />
					</template>
				</VersionHistoryItem>
			</ul>
		</N8nScrollArea>

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

.scroll {
	flex: 1;
	min-height: 0;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
	padding: var(--spacing--sm) var(--spacing--2xs);
	list-style: none;
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
