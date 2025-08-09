<script setup lang="ts">
import { TreeItem, TreeItemToggleEvent } from 'reka-ui';
import { TreeItemType } from '.';
import SidebarItem from './SidebarItem.vue';

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

const beforeEnter = (el: Element) => {
	(el as HTMLElement).style.height = '0';
	(el as HTMLElement).style.paddingTop = '0';
	(el as HTMLElement).style.paddingBottom = '0';
	(el as HTMLElement).style.marginBottom = '0';
};

const enter = (el: Element) => {
	const htmlEl = el as HTMLElement;
	// Get the natural height without any transforms
	htmlEl.style.height = 'auto';
	const height = htmlEl.offsetHeight;
	htmlEl.style.height = '0';
	// Force reflow
	htmlEl.offsetHeight;
	// Animate to natural height
	htmlEl.style.height = height + 'px';
	htmlEl.style.paddingTop = '';
	htmlEl.style.paddingBottom = '';
	htmlEl.style.marginBottom = '';
};

const afterEnter = (el: Element) => {
	(el as HTMLElement).style.height = 'auto';
};

const beforeLeave = (el: Element) => {
	(el as HTMLElement).style.height = (el as HTMLElement).offsetHeight + 'px';
};

const leave = (el: Element) => {
	(el as HTMLElement).style.height = '0';
	(el as HTMLElement).style.paddingTop = '0';
	(el as HTMLElement).style.paddingBottom = '0';
	(el as HTMLElement).style.marginBottom = '0';
};

const afterLeave = (el: Element) => {
	const htmlEl = el as HTMLElement;
	htmlEl.style.height = '';
	htmlEl.style.paddingTop = '';
	htmlEl.style.paddingBottom = '';
	htmlEl.style.marginBottom = '';
};
</script>

<template>
	<li v-for="item in treeItems" :key="item.id">
		<TreeItem
			as-child
			:key="item.id"
			v-slot="{ isExpanded, handleToggle }"
			@toggle="preventDefault"
			@select="preventDefault"
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
			<Transition
				name="collapse-transition"
				@before-enter="beforeEnter"
				@enter="enter"
				@after-enter="afterEnter"
				@before-leave="beforeLeave"
				@leave="leave"
				@after-leave="afterLeave"
			>
				<ul class="children" v-if="isExpanded && item.type !== 'workflow' && item.children">
					<SidebarTree :project-id="projectId" :tree-items="item.children" :level="level + 1" />
				</ul>
			</Transition>
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

// Section collapse animation - height only, no scaling
.collapse-transition-enter-active,
.collapse-transition-leave-active {
	transition:
		height 0.3s cubic-bezier(0.645, 0.045, 0.355, 1),
		padding 0.3s cubic-bezier(0.645, 0.045, 0.355, 1),
		margin 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
	overflow: hidden;
}
</style>
