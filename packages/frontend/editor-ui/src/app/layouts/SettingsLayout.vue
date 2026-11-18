<script lang="ts" setup>
import BaseLayout from './BaseLayout.vue';
import LayoutRouterView from '@/app/components/app/LayoutRouterView.vue';
import AppNavigation from '@/app/components/appNavigation/AppNavigation.vue';
</script>

<template>
	<!-- The navigation panel lists the settings pages, as it lists the pages of other rail items. -->
	<BaseLayout inset>
		<template #sidebar>
			<AppNavigation />
		</template>

		<div :class="$style.contentContainer">
			<div :class="$style.content">
				<LayoutRouterView />
			</div>
		</div>
	</BaseLayout>
</template>

<style lang="scss" module>
.contentContainer {
	height: 100%;
	width: 100%;
	display: flex;
	overflow: hidden;
	justify-content: center;
	padding-top: 70.5px;
	overflow: auto;
	position: relative;
}

.content {
	height: 100%;
	width: 100%;
	max-width: 1600px;
	padding: 0 var(--spacing--2xl);
}
</style>
