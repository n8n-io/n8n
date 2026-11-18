<script lang="ts" setup>
import BaseLayout from './BaseLayout.vue';
import LayoutRouterView from '@/app/components/app/LayoutRouterView.vue';
import AppSidebar from '@/app/components/app/AppSidebar.vue';
</script>

<template>
	<BaseLayout inset>
		<template #sidebar>
			<AppSidebar />
		</template>
		<LayoutRouterView />
	</BaseLayout>
</template>
