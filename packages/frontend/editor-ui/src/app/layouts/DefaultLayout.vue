<script lang="ts" setup>
import BaseLayout from './BaseLayout.vue';
import AppSidebar from '@/app/components/app/AppSidebar.vue';
</script>

<template>
	<BaseLayout>
		<template #sidebar>
			<AppSidebar />
		</template>
		<RouterView />
	</BaseLayout>
</template>
