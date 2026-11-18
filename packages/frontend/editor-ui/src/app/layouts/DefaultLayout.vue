<script lang="ts" setup>
import BaseLayout from './BaseLayout.vue';
import LayoutRouterView from '@/app/components/app/LayoutRouterView.vue';
import AppSidebar from '@/app/components/app/AppSidebar.vue';
// Prototype: the shell is a parameter, and a variant can put a column of pages beside the page.
import ProjectInnerNav from '@/features/projectSettingsPrototype/components/ProjectInnerNav.vue';
import { useProtoChrome } from '@/features/projectSettingsPrototype/nav/useProtoChrome';
import { protoParams } from '@/features/projectSettingsPrototype/params';

const { showInnerNav } = useProtoChrome();
</script>

<template>
	<BaseLayout :inset="protoParams.shell !== 'standard'">
		<template #sidebar>
			<AppSidebar />
		</template>
		<!-- Without the column both wrappers leave the layout alone, so the page isn't remounted. -->
		<div :class="[$style.frame, { [$style.withInnerNav]: showInnerNav }]">
			<ProjectInnerNav v-if="showInnerNav" />
			<div :class="$style.page">
				<LayoutRouterView />
			</div>
		</div>
	</BaseLayout>
</template>

<style lang="scss" module>
.frame,
.page {
	display: contents;
}

.withInnerNav {
	display: flex;
	width: 100%;
	height: 100%;
	min-width: 0;

	.page {
		display: flex;
		justify-content: center;
		flex: 1;
		min-width: 0;
		height: 100%;
		overflow: auto;
	}
}
</style>
