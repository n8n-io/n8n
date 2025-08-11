<script lang="ts" setup>
import { TreeRoot } from 'reka-ui';
import type { TreeItemType } from '.';
import { computed, ref } from 'vue';
import { IconName } from '../N8nIcon/icons';
import SidebarItem from './SidebarItem.vue';
import SidebarTree from './SidebarTree.vue';
import SidebarCollapseTransition from './SidebarCollapseTransition.vue';

interface Props {
	title: string;
	id: string;
	icon?: IconName;
	items: TreeItemType[];
}

const props = defineProps<Props>();
const open = ref<string[]>([]);

function toggleSection(id: string) {
	if (open.value.includes(id)) {
		open.value.splice(open.value.indexOf(id), 1);
	} else {
		open.value.push(id);
	}
}

const link = computed(() => {
	if (props.id === 'shared') {
		return '/shared/workflows';
	}
	return `/projects/${props.id}/workflows`;
});
</script>

<template>
	<div>
		<SidebarItem
			:title="props.title"
			:id="props.id"
			:icon="props.icon"
			:click="() => toggleSection(props.id)"
			:open="open.includes(props.id)"
			:link="link"
			:ariaLabel="`Toggle ${props.title} section`"
			type="project"
		/>
		<SidebarCollapseTransition>
			<div v-if="open.includes(id)" class="items">
				<TreeRoot :items="props.items" :get-key="(item: TreeItemType) => item.id">
					<SidebarTree :project-id="props.id" :tree-items="props.items" :level="0" />
				</TreeRoot>
			</div>
		</SidebarCollapseTransition>
	</div>
</template>

<style lang="scss" scoped>
.items {
	position: relative;
	padding-left: 8px;
	margin-left: 12px;
	border-left: 1px solid var(--color-foreground-light);
	margin-bottom: 12px;
	overflow: hidden;
}
</style>
