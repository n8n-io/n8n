<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { AgentVersionListItemDto } from '@n8n/api-types';
import type { UserAction } from '@n8n/design-system';
import { N8nLoading, N8nText, N8nButton } from '@n8n/design-system';
import type { IUser } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';
import AgentVersionListItem, { type AgentVersionAction } from './AgentVersionListItem.vue';

const props = defineProps<{
	items: AgentVersionListItemDto[];
	actions: Array<UserAction<IUser>>;
	activeActions: Array<UserAction<IUser>>;
	hasMore: boolean;
	isInitialLoad: boolean;
	isLoading: boolean;
	hasLoadError?: boolean;
}>();

const emit = defineEmits<{
	action: [value: { action: AgentVersionAction; versionId: string }];
	loadMore: [];
	retry: [];
}>();

const i18n = useI18n();
const listElement = ref<HTMLElement | null>(null);
const loadMoreSentinel = ref<HTMLElement | null>(null);
const canLoadMore = computed(() => props.hasMore && !props.isLoading && !props.hasLoadError);

const { observe: observeForLoadMore } = useIntersectionObserver({
	root: listElement,
	threshold: 0.01,
	onIntersect: () => {
		if (canLoadMore.value) emit('loadMore');
	},
});

watch(
	[loadMoreSentinel, canLoadMore, () => props.items.length],
	([sentinel, canObserve]) => {
		if (sentinel && canObserve) {
			observeForLoadMore(sentinel);
		}
	},
	{ immediate: true },
);

const isEmpty = computed(
	() => !props.isInitialLoad && !props.isLoading && props.items.length === 0,
);

function getActions(item: AgentVersionListItemDto) {
	return (item.isActive ? props.activeActions : props.actions).map((action) => ({
		...action,
		disabled: action.disabled || (action.value === 'revert' && Boolean(item.isCurrent)),
	}));
}
</script>

<template>
	<div ref="listElement" :class="$style.list" data-test-id="agent-version-history-list">
		<N8nLoading v-if="isInitialLoad" :loading="true" :rows="6" animated />

		<div v-else-if="hasLoadError && items.length === 0" :class="$style.empty" role="alert">
			<N8nText size="small">{{ i18n.baseText('agents.versionHistory.error.load') }}</N8nText>
			<N8nButton variant="ghost" @click="emit('retry')">{{
				i18n.baseText('generic.retry')
			}}</N8nButton>
		</div>

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
				v-if="hasMore || hasLoadError || isLoading"
				ref="loadMoreSentinel"
				:class="$style.sentinel"
				data-test-id="agent-version-history-sentinel"
			>
				<N8nLoading v-if="isLoading" :loading="true" :rows="1" animated />
				<N8nButton v-else-if="hasLoadError" variant="ghost" @click="emit('retry')">{{
					i18n.baseText('generic.retry')
				}}</N8nButton>
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
	flex-direction: column;
	gap: var(--spacing--xs);
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
