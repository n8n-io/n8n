<script lang="ts" setup>
import BaseLayout from './BaseLayout.vue';
import ChatSidebar from '@/features/ai/chatHub/components/ChatSidebar.vue';
</script>

<template>
	<BaseLayout>
		<template #sidebar>
			<ChatSidebar />
		</template>
		<RouterView />
	</BaseLayout>
</template>
