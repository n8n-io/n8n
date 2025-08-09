<script lang="ts" setup>
import { TreeRoot, TreeItem, TreeItemToggleEvent } from 'reka-ui';
import type { TreeItemType } from '.';
import { computed, ref } from 'vue';
import { IconName } from '../N8nIcon/icons';
import SidebarItem from './SidebarItem.vue';

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

function preventDefault<T>(event: TreeItemToggleEvent<T>) {
	if (event.detail.originalEvent.type === 'click') {
		event.detail.originalEvent.preventDefault();
	}
}

const link = computed(() => {
	if (props.id === 'shared') {
		return '/shared/workflows';
	}
	return `/projects/${props.id}/workflows`;
});

const itemLink = ({ type, id }: TreeItemType) => {
	if (type === 'workflow') {
		return `/workflow/${id}`;
	}
	return `/projects/${props.id}/folders/${id}/workflows`;
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

// Transition methods for smooth collapse animation - only height changes
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
				<TreeRoot
					:items="props.items"
					:get-key="(item: TreeItemType) => item.id"
					v-slot="{ flattenItems }"
				>
					<TransitionGroup
						name="collapse-transition"
						@before-enter="beforeEnter"
						@enter="enter"
						@after-enter="afterEnter"
						@before-leave="beforeLeave"
						@leave="leave"
						@after-leave="afterLeave"
					>
						<TreeItem
							v-for="item in flattenItems"
							:key="item._id"
							v-bind="item.bind"
							v-slot="{ isExpanded, handleToggle }"
							@toggle="preventDefault"
							@select="preventDefault"
							class="item"
						>
							<span class="itemIdent" v-for="level in new Array(item.level - 1)" :key="level" />
							<SidebarItem
								:title="item.value.label"
								:id="item.value.id"
								:icon="itemIcon(item.value.type, isExpanded)"
								:click="handleToggle"
								:open="isExpanded"
								:link="itemLink(item.value)"
								:ariaLabel="`Open ${item.value.label}`"
								:type="item.value.type"
							/>
						</TreeItem>
					</TransitionGroup>
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

.item {
	position: relative;
	display: flex;
	align-items: center;
	cursor: pointer;
	max-width: 100%;
	overflow: hidden;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.itemIdent {
	display: block;
	position: relative;
	width: 8px;
	min-width: 8px;
	align-self: stretch;
	margin-left: 12px;
	border-left: 1px solid var(--color-foreground-light);
}

.itemIdent::before {
	content: '';
	position: absolute;
	bottom: -1px;
	left: -1px;
	width: 1px;
	height: 1px;
	background-color: var(--color-foreground-light);
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
