<script lang="ts" setup>
import BaseLayout from './BaseLayout.vue';
import DemoFooter from '@/features/execution/logs/components/DemoFooter.vue';
</script>

<template>
	<BaseLayout>
		<RouterView />
		<template #footer>
			<DemoFooter />
		</template>
	</BaseLayout>
</template>
