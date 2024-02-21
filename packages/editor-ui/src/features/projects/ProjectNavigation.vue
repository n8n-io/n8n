<script lang="ts" setup>
import type { IMenuItem } from 'n8n-design-system/types';
import { ref } from 'vue';

type Props = {
	collapsed: boolean;
};

const props = defineProps<Props>();

const home = ref<IMenuItem>({
	id: 'home',
	label: 'Home',
	icon: 'home',
	route: {
		to: '/home/workflows',
	},
});

const addProject = ref<IMenuItem>({
	id: 'addProject',
	label: 'Add project',
	icon: 'plus',
	route: {
		to: '/projects/abc123/settings',
	},
});
</script>

<template>
	<div :class="$style.projects">
		<ElMenu :collapse="props.collapsed" class="home">
			<n8n-menu-item :item="home" :compact="props.collapsed" />
		</ElMenu>
		<hr class="mt-m mb-m" />
		<ElMenu :collapse="props.collapsed" class="pl-xs pr-xs">
			<n8n-menu-item :item="addProject" :compact="props.collapsed" />
		</ElMenu>
		<hr class="mt-m mb-m" />
	</div>
</template>

<style lang="scss" module>
.projects {
	display: grid;
	width: 100%;
	overflow: hidden;
}
</style>

<style lang="scss" scoped>
.home {
	padding: 0 var(--spacing-xs);

	:deep(.el-menu-item) {
		padding: var(--spacing-m) var(--spacing-xs) !important;
	}
}
</style>
