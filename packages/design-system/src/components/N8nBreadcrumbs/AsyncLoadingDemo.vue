<script lang="ts" setup>
import { onUnmounted, ref } from 'vue';

import type { PathItem } from './Breadcrumbs.vue';
import N8nBreadcrumbs from './Breadcrumbs.vue';

/** Demo component that showcases async tooltip loading for hidden path items in breadcrumbs */

type Props = {
	items: PathItem[];
};

defineProps<Props>();

const timeoutId = ref<ReturnType<typeof setTimeout>>();

const hiddenItemsTooltip = ref('Loading...');

const getHiddenItems = async () => {
	hiddenItemsTooltip.value = 'Loading...';

	const timeoutPromise = new Promise((resolve) => {
		timeoutId.value = setTimeout(resolve, 1000);
	});

	await timeoutPromise;
	hiddenItemsTooltip.value = '<a href="#">Parent 1</a><a href="#">Parent 2</a>';
};

onUnmounted(() => {
	if (timeoutId.value) {
		clearTimeout(timeoutId.value);
	}
});
</script>
<template>
	<div>
		<N8nBreadcrumbs
			:items="items"
			:has-hidden-items="true"
			:hidden-items-tooltip="hiddenItemsTooltip"
			theme="medium"
			@before-tooltip-open="getHiddenItems"
		/>
	</div>
</template>
