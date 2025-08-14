<script lang="ts" setup>
import { TreeItem, TreeItemToggleEvent, TreeRoot, TreeVirtualizer } from 'reka-ui';
import type { TreeItemType } from '.';
import { computed, ref } from 'vue';
import { IconName } from '../N8nIcon/icons';
import SidebarItem from './SidebarItem.vue';
import SidebarCollapseTransition from './SidebarCollapseTransition.vue';
import N8nText from '../N8nText';

interface Props {
	title: string;
	id: string;
	icon?: IconName;
	items: TreeItemType[];
}

const props = defineProps<Props>();
const open = ref<string[]>([]);

const emits = defineEmits<{
	openProject: [string];
	openFolder: [string];
}>();

function toggleSection(id: string) {
	if (open.value.includes(id)) {
		open.value.splice(open.value.indexOf(id), 1);
	} else {
		open.value.push(id);
	}

	emits('openProject', id);
}

const link = computed(() => {
	if (props.id === 'shared') {
		return '/shared/workflows';
	}
	return `/projects/${props.id}/workflows`;
});

const itemLink = (item: TreeItemType) => {
	const { id, type } = item;

	console.log('itemLink', item);
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

function preventDefault<T>(event: TreeItemToggleEvent<T>) {
	if (event.detail.originalEvent.type === 'click') {
		event.detail.originalEvent.preventDefault();
	}
}

function toggleFolder(id: string, callback: () => void) {
	emits('openFolder', id);
	callback();
}
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
				<N8nText class="itemsEmpty" v-if="!props.items.length" size="small" color="text-light"
					>No workflows or folders</N8nText
				>
				<TreeRoot v-else :items :get-key="(item: TreeItemType) => item.id">
					<TreeVirtualizer v-slot="{ item }" :text-content="(opt) => opt.name">
						<TreeItem
							as-child
							:key="item.value.id"
							v-slot="{ isExpanded, handleToggle }"
							@toggle="preventDefault"
							@select="preventDefault"
							@click="preventDefault"
							class="item"
							v-bind="item.bind"
						>
							<SidebarItem
								:title="item.value.label"
								:id="item.value.id"
								:icon="itemIcon(item.value.type, isExpanded)"
								:click="() => toggleFolder(item.value.id, handleToggle)"
								:open="isExpanded"
								:link="itemLink(item.value as TreeItemType)"
								:ariaLabel="`Open ${item.value.label}`"
								:type="item.value.type"
							/>
						</TreeItem>
					</TreeVirtualizer>
				</TreeRoot>
			</div>
		</SidebarCollapseTransition>
	</div>
</template>

<style lang="scss" scoped>
.items {
	position: relative;
	padding-left: var(--spacing-2xs);
	border-left: 1px solid var(--color-foreground-light);
	margin-bottom: var(--spacing-xs);
	margin-left: var(--spacing-xs);
	overflow: hidden;
}

.itemsEmpty {
	display: block;
	padding: var(--spacing-3xs) var(--spacing-4xs);
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
</style>
