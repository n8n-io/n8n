<script setup lang="ts">
import { computed, ref } from 'vue';

import type { PathItem } from './Breadcrumbs.vue';
import Breadcrumbs from './Breadcrumbs.vue';

defineOptions({ name: 'AsyncLoadingCacheDemo' });

type Props = {
	isAsync?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	isAsync: false,
});

const fetchCount = ref(0);
const items = ref<PathItem[]>([
	{ id: '1', label: 'Home', href: '/' },
	{ id: '2', label: 'Parent', href: '/parent' },
]);

const hiddenItems = ref<PathItem[]>([
	{ id: '3', label: 'Parent 3', href: '/hidden3' },
	{ id: '4', label: 'Parent 4', href: '/hidden4' },
]);

const forceFetch = computed(() => fetchCount.value > 2);

const incrementFetchCount = () => {
	fetchCount.value++;

	if (!props.isAsync) {
		hiddenItems.value.push({
			id: `${fetchCount.value}`,
			label: `New Parent ${fetchCount.value}`,
			href: `/parent${fetchCount.value}`,
		});
	}
};

const fetchHiddenItemsAsync = async (): Promise<PathItem[]> => {
	await new Promise((resolve) => setTimeout(resolve, 1000));
	// Add a new item for each fetch
	if (fetchCount.value >= 2) {
		const newIndex = fetchCount.value + 1;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		hiddenItems.value.push({
			id: `${newIndex}-${fetchCount.value}`,
			label: `New Parent ${newIndex}`,
			href: `/hidden${newIndex}`,
		});
	}
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return hiddenItems.value;
};
</script>

<template>
	<div :class="$style.container">
		<div v-if="isAsync">
			[DEMO] This will invalidate cache after hidden items are fetched <b>three times</b>
		</div>
		<div v-else>[DEMO] This reacts to hidden items update every time dropdown is opened</div>
		<Breadcrumbs
			:items="items"
			:hidden-items-source="isAsync ? fetchHiddenItemsAsync : hiddenItems"
			:force-fetch="forceFetch"
			@tooltip-opened="incrementFetchCount"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: 1em;
}
</style>
