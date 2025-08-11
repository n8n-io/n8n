<script setup lang="ts">
import { TreeItem, TreeItemToggleEvent } from 'reka-ui';
import { TreeItemType } from '.';
import SidebarItem from './SidebarItem.vue';
import SidebarCollapseTransition from './SidebarCollapseTransition.vue';
import N8nText from '../N8nText';

const props = withDefaults(
	defineProps<{
		projectId: string;
		treeItems: TreeItemType[];
		level?: number;
	}>(),
	{ level: 0 },
);

const itemLink = ({ type, id }: TreeItemType) => {
	if (type === 'workflow') {
		return `/workflow/${id}`;
	}
	return `/projects/${props.projectId}/folders/${id}/workflows`;
};

const itemIcon = (type: string, open: boolean) => {
	if (type === 'workflow') {
		return undefined;
	}
	if (open) {
		return 'folder-open';
	}
	return 'folder';
};

function preventDefault<T>(event: TreeItemToggleEvent<T>) {
	if (event.detail.originalEvent.type === 'click') {
		event.detail.originalEvent.preventDefault();
	}
}
</script>

<template>
	<li v-for="item in treeItems" :key="item.id">
		<TreeItem
			as-child
			:key="item.id"
			v-slot="{ isExpanded, handleToggle }"
			@toggle="preventDefault"
			@select="preventDefault"
			@click.stop
			class="item"
			:level="props.level"
			:value="item"
		>
			<SidebarItem
				:title="item.label"
				:id="item.id"
				:icon="itemIcon(item.type, isExpanded)"
				:click="handleToggle"
				:open="isExpanded"
				:link="itemLink(item)"
				:ariaLabel="`Open ${item.label}`"
				:type="item.type"
			/>
			<SidebarCollapseTransition>
				<ul class="children" v-if="isExpanded && item.type !== 'workflow'">
					<N8nText
						v-if="!item.children?.length"
						class="childrenEmpty"
						size="small"
						color="text-light"
					>
						No workflows or folders
					</N8nText>
					<SidebarTree
						v-else
						:project-id="projectId"
						:tree-items="item.children"
						:level="level + 1"
					/>
				</ul>
			</SidebarCollapseTransition>
		</TreeItem>
	</li>
</template>

<style lang="scss" scoped>
.item {
	position: relative;
	display: flex;
	align-items: center;
	cursor: pointer;
	max-width: 100%;
	overflow: hidden;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.children {
	position: relative;
	padding-left: 8px;
	margin-left: 12px;
	border-left: 1px solid var(--color-foreground-light);
	overflow: hidden;
}

.childrenEmpty {
	display: block;
	padding: 6px 4px;
}
</style>
