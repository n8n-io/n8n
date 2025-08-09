<script lang="ts" setup>
import { TreeRoot } from 'reka-ui';
import type { TreeItemType } from '.';
import { computed, ref } from 'vue';
import { IconName } from '../N8nIcon/icons';
import SidebarItem from './SidebarItem.vue';
import SidebarTree from './SidebarTree.vue';

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
		<Transition
			name="collapse-transition"
			@before-enter="beforeEnter"
			@enter="enter"
			@after-enter="afterEnter"
			@before-leave="beforeLeave"
			@leave="leave"
			@after-leave="afterLeave"
		>
			<div v-if="open.includes(id)" class="items">
				<TreeRoot :items="props.items" :get-key="(item: TreeItemType) => item.id">
					<SidebarTree :project-id="props.id" :tree-items="props.items" :level="0" />
				</TreeRoot>
			</div>
		</Transition>
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
