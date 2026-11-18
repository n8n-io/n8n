<script lang="ts" setup>
import BaseLayout from './BaseLayout.vue';
import LayoutRouterView from '@/app/components/app/LayoutRouterView.vue';
import ChatSidebar from '@/features/ai/chatHub/components/ChatSidebar.vue';
</script>

<template>
	<BaseLayout>
		<template #sidebar>
			<ChatSidebar />
		</template>
		<LayoutRouterView />
	</BaseLayout>
</template>
