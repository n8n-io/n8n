<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { AgentVersionListItemDto } from '@n8n/api-types';
import type { UserAction } from '@n8n/design-system';
import { N8nLoading, N8nText } from '@n8n/design-system';
import type { IUser } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';
import AgentVersionListItem, { type AgentVersionAction } from './AgentVersionListItem.vue';

const props = defineProps<{
	items: AgentVersionListItemDto[];
	actions: Array<UserAction<IUser>>;
	hasMore: boolean;
	isInitialLoad: boolean;
	isLoading: boolean;
}>();

const emit = defineEmits<{
	action: [value: { action: AgentVersionAction; versionId: string }];
	loadMore: [];
}>();

const i18n = useI18n();
const listElement = ref<HTMLElement | null>(null);
const loadMoreSentinel = ref<HTMLElement | null>(null);

const { observe: observeForLoadMore } = useIntersectionObserver({
	root: listElement,
	threshold: 0.01,
	onIntersect: () => emit('loadMore'),
});

watch(
	[loadMoreSentinel, () => props.hasMore, () => props.items.length],
	([sentinel, canLoadMore]) => {
		if (sentinel && canLoadMore) {
			observeForLoadMore(sentinel);
		}
	},
	{ immediate: true },
);

const isEmpty = computed(
	() => !props.isInitialLoad && !props.isLoading && props.items.length === 0,
);

function getActions(item: AgentVersionListItemDto) {
	// Hide both Revert and Publish on the currently-active row — neither does
	// anything meaningful (revert would be a no-op, publish is already active).
	return item.isActive ? [] : props.actions;
}
</script>

<template>
	<div ref="listElement" :class="$style.list" data-test-id="agent-version-history-list">
		<N8nLoading v-if="isInitialLoad" :loading="true" :rows="6" animated />

		<div v-else-if="isEmpty" :class="$style.empty" data-test-id="agent-version-history-empty">
			<N8nText size="small" color="text-base">
				{{ i18n.baseText('agents.versionHistory.empty') }}
			</N8nText>
		</div>

		<ul v-else :class="$style.items">
			<AgentVersionListItem
				v-for="item in items"
				:key="item.versionId"
				:item="item"
				:actions="getActions(item)"
				@action="(value) => emit('action', value)"
			/>
			<li
				v-if="hasMore"
				ref="loadMoreSentinel"
				:class="$style.sentinel"
				data-test-id="agent-version-history-sentinel"
			>
				<N8nLoading v-if="isLoading" :loading="true" :rows="1" animated />
			</li>
		</ul>
	</div>
</template>

<style module lang="scss">
.list {
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--2xs);
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	padding: var(--spacing--lg);
	text-align: center;
}

.items {
	list-style: none;
	padding: 0;
	margin: 0;
}

.sentinel {
	padding: var(--spacing--xs) 0;
}
</style>
