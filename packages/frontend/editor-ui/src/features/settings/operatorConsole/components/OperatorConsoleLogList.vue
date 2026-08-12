<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';

import {
	OPERATOR_CONSOLE_FOLLOW_THRESHOLD_PX,
	OPERATOR_CONSOLE_MIN_ROW_HEIGHT_PX,
} from '../operatorConsole.constants';
import type { OperatorConsoleEntry } from '../operatorConsole.types';
import OperatorConsoleLogRow from './OperatorConsoleLogRow.vue';
import OperatorConsoleMarkerRow from './OperatorConsoleMarkerRow.vue';

const props = defineProps<{
	entries: OperatorConsoleEntry[];
	followTail: boolean;
}>();

const emit = defineEmits<{ 'update:followTail': [value: boolean] }>();

const i18n = useI18n();

const rootRef = ref<HTMLElement | null>(null);
const scrollEl = ref<HTMLElement | null>(null);
const expandedIds = ref(new Set<string>());

function toggleExpanded(id: string) {
	const next = new Set(expandedIds.value);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	expandedIds.value = next;
}

function isAtBottom(element: HTMLElement): boolean {
	return (
		element.scrollHeight - element.scrollTop - element.clientHeight <=
		OPERATOR_CONSOLE_FOLLOW_THRESHOLD_PX
	);
}

/**
 * Follow-tail is driven by real scroll position rather than an explicit intent
 * flag: scrolling up to read something disengages it, scrolling back to the
 * bottom re-engages it. That matches `tail -f` in a pager and needs no
 * "resume following" affordance.
 */
function onScroll() {
	const element = scrollEl.value;
	if (!element) return;

	const atBottom = isAtBottom(element);
	if (atBottom !== props.followTail) emit('update:followTail', atBottom);
}

function scrollToBottom() {
	const element = scrollEl.value;
	if (!element) return;
	element.scrollTop = element.scrollHeight;
}

onMounted(() => {
	// vue-virtual-scroller renders its own scroll container; we listen on that
	// element so follow-tail reflects what the user actually sees.
	scrollEl.value =
		rootRef.value?.querySelector<HTMLElement>('.vue-recycle-scroller') ?? rootRef.value;
	scrollEl.value?.addEventListener('scroll', onScroll, { passive: true });
});

onBeforeUnmount(() => {
	scrollEl.value?.removeEventListener('scroll', onScroll);
});

watch(
	() => props.entries,
	async () => {
		if (!props.followTail) return;
		await nextTick();
		scrollToBottom();
	},
);

watch(
	() => props.followTail,
	async (following) => {
		if (!following) return;
		await nextTick();
		scrollToBottom();
	},
);

defineExpose({ scrollToBottom });
</script>

<template>
	<div ref="rootRef" :class="$style.list" data-test-id="operator-console-log-list">
		<DynamicScroller
			:items="entries"
			:min-item-size="OPERATOR_CONSOLE_MIN_ROW_HEIGHT_PX"
			key-field="id"
			:class="$style.scroller"
		>
			<!--
				The scroller stays mounted even with nothing to show, so the scroll
				container we bound follow-tail to survives the first arriving line.
			-->
			<template #empty>
				<div
					v-if="entries.length === 0"
					:class="$style.empty"
					data-test-id="operator-console-empty"
				>
					<N8nText size="small" color="text-light">{{
						i18n.baseText('operatorConsole.empty')
					}}</N8nText>
				</div>
			</template>
			<template #default="{ item, index, active }">
				<DynamicScrollerItem
					:item="item"
					:active="active"
					:size-dependencies="[expandedIds.has(item.id)]"
					:data-index="index"
				>
					<OperatorConsoleLogRow
						v-if="item.kind === 'record'"
						:record="item.record"
						:expanded="expandedIds.has(item.id)"
						@toggle="toggleExpanded(item.id)"
					/>
					<OperatorConsoleMarkerRow v-else :entry="item" />
				</DynamicScrollerItem>
			</template>
		</DynamicScroller>
	</div>
</template>

<style module lang="scss">
.list {
	position: relative;
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	min-height: 0;
	overflow: hidden;
	background-color: var(--background--surface);
}

.scroller {
	flex: 1 1 auto;
	min-height: 0;
	height: 100%;
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	padding: var(--spacing--xl);
}
</style>
