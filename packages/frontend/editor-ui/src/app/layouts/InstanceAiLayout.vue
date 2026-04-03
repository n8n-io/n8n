<script lang="ts" setup>
import { onMounted, onBeforeUnmount } from 'vue';
import BaseLayout from './BaseLayout.vue';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

const pushConnectionStore = usePushConnectionStore();

onMounted(() => {
	pushConnectionStore.pushConnect();
});

onBeforeUnmount(() => {
	pushConnectionStore.pushDisconnect();
});
</script>

<template>
	<BaseLayout>
		<RouterView />
	</BaseLayout>
</template>
