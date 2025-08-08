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

const itemLink = ({ type, id }: TreeItemType) =>
	computed(() => {
		if (type === 'workflow') {
			return `/workflow/${id}`;
		}
		return `/projects/${props.id}/folders/${id}/workflows`;
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
		<div v-if="open.includes(id)" class="items">
			<TreeRoot
				:items="props.items"
				:get-key="(item: TreeItemType) => item.id"
				v-slot="{ flattenItems }"
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
						:icon="item.value.type === 'folder' ? 'folder' : undefined"
						:click="handleToggle"
						:open="isExpanded"
						:link="itemLink(item.value).value"
						:ariaLabel="`Open ${item.value.label}`"
						:type="item.value.type"
					/>
				</TreeItem>
			</TreeRoot>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.items {
	position: relative;
	padding-left: 8px;
	margin-left: 12px;
	border-left: 1px solid var(--color-foreground-light);
	margin-bottom: 12px;
}

.item {
	position: relative;
	display: flex;
	align-items: center;
	cursor: pointer;
	max-width: 100%;
	overflow: hidden;
}

.itemIdent {
	display: block;
	position: relative;
	width: 8px;
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
</style>
