<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';
import BaseLayout from './BaseLayout.vue';

const ChatSidebar = defineAsyncComponent(
	async () => await import('@/features/ai/chatHub/components/ChatSidebar.vue'),
);
</script>

<template>
	<BaseLayout>
		<template #sidebar>
			<Suspense>
				<ChatSidebar />
			</Suspense>
		</template>
		<RouterView />
	</BaseLayout>
</template>
