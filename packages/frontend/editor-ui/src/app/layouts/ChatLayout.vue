<script lang="ts" setup>
import BaseLayout from './BaseLayout.vue';
import ChatHubSidebar from '@/features/ai/chatHub/components/ChatHubSidebar.vue';
</script>

<template>
	<BaseLayout>
		<template #sidebar>
			<ChatHubSidebar />
		</template>
		<RouterView />
	</BaseLayout>
</template>
