<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';
import BaseLayout from './BaseLayout.vue';

const DemoFooter = defineAsyncComponent(
	async () => await import('@/features/execution/logs/components/DemoFooter.vue'),
);
</script>

<template>
	<BaseLayout>
		<RouterView />
		<template #footer>
			<Suspense>
				<DemoFooter />
			</Suspense>
		</template>
	</BaseLayout>
</template>
