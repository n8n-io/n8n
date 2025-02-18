<script setup lang="ts">
import { ref } from 'vue';

import type { PathItem } from './Breadcrumbs.vue';
import Breadcrumbs from './Breadcrumbs.vue';

defineOptions({ name: 'AsyncLoadingCacheDemo' });

const FETCH_TIMEOUT = 1000;

type Props = {
	title: string;
	mode: 'sync' | 'async';
	testCache?: boolean;
	theme?: 'small' | 'medium';
	showBorder?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	mode: 'sync',
	testCache: false,
	theme: 'medium',
	showBorder: false,
});

const fetchCount = ref(0);
const items = ref<PathItem[]>([
	{ id: '1', label: 'Home', href: '/' },
	{ id: '2', label: 'Parent', href: '/parent' },
]);
const hiddenItemsPromise = ref<Promise<PathItem[]>>(new Promise(() => {}));
const hiddenItemsSync = ref<PathItem[]>([
	{ id: 'folder2', label: 'Folder 2' },
	{ id: 'folder3', label: 'Folder 3' },
]);

const onDropdownOpened = () => {
	if (fetchCount.value === 0) {
		hiddenItemsPromise.value = fetchHiddenItems();
	}
	fetchCount.value++;
	if (props.testCache) {
		if (fetchCount.value > 2 && props.mode === 'async') {
			updatePromise();
		} else if (props.mode === 'sync') {
			updateSyncItems();
		}
	}
};

const updatePromise = () => {
	hiddenItemsPromise.value = new Promise((resolve) => {
		setTimeout(() => {
			resolve([
				{ id: 'folder1', label: 'New Folder 1' },
				{ id: 'folder2', label: 'Folder 2' },
				{ id: 'folder3', label: 'Folder 3' },
			]);
		}, FETCH_TIMEOUT);
	});
};

const updateSyncItems = () => {
	const newId = fetchCount.value + 3;
	const newItem = { id: `'folder${newId}'`, label: `Folder ${newId}` };
	hiddenItemsSync.value.push(newItem);
};

const fetchHiddenItems = async (): Promise<PathItem[]> => {
	await new Promise((resolve) => setTimeout(resolve, FETCH_TIMEOUT));
	return [
		{ id: 'home', label: 'Home' },
		{ id: 'projects', label: 'Projects' },
		{ id: 'folder1', label: 'Folder 1' },
	];
};
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.heading">{{ title }}</div>
		<div :class="$style.breadcrumbs">
			<Breadcrumbs
				v-if="props.mode === 'sync'"
				:items="items"
				:hidden-items="hiddenItemsSync"
				:theme="theme"
				:show-border="props.showBorder"
				@tooltip-opened="onDropdownOpened"
			/>
			<Breadcrumbs
				v-else-if="props.mode === 'async'"
				:items="items"
				:hidden-items="hiddenItemsPromise"
				:theme="theme"
				:show-border="props.showBorder"
				@tooltip-opened="onDropdownOpened"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: 1em;
}
</style>
