<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';
import BaseLayout from './BaseLayout.vue';

const AppSidebar = defineAsyncComponent(
	async () => await import('@/app/components/app/AppSidebar.vue'),
);
</script>

<template>
	<BaseLayout>
		<template #sidebar>
			<Suspense>
				<AppSidebar />
			</Suspense>
		</template>
		<RouterView />
	</BaseLayout>
</template>
