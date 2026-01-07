<script lang="ts" setup>
import { computed } from 'vue';
import type { IMenuItem } from '@n8n/design-system/types';
import { N8nMenuItem } from '@n8n/design-system';

defineProps<{ collapsed: boolean }>();

const item = computed<IMenuItem>(() => ({
	id: 'my-oo-share',
	label: 'My OO Share',
	icon: 'share',
	route: { to: { name: 'MyOOShare' } },
}));
</script>

<template>
	<div class="oo-share-nav">
		<N8nMenuItem :item="item" :compact="collapsed" />
	</div>
</template>

<style scoped>
.oo-share-nav {
	padding: 0 var(--spacing--3xs) var(--spacing--2xs);
}
</style>
