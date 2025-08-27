<script setup lang="ts">
import { IMenuElement, IMenuItem } from '@n8n/design-system/types';
import { TreeItem, TreeItemToggleEvent, TreeRoot, TreeVirtualizer } from 'reka-ui';
import SidebarItem from './SidebarItem.vue';
import N8nText from '../N8nText';

defineProps<{ items: IMenuElement[]; openProject?: (id: string) => Promise<void> }>();

function preventDefault<T>(event: TreeItemToggleEvent<T>) {
	if (event.detail.originalEvent.type === 'click') {
		event.detail.originalEvent.preventDefault();
	}
}
</script>

<template>
	<TreeRoot :items :get-key="(item: IMenuElement) => item.id">
		<TreeVirtualizer v-slot="{ item }" :text-content="(opt) => opt.name" :estimate-size="29">
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
				<div v-if="item.value.type === 'empty'">
					<span class="itemIdent" v-for="level in new Array((item.level || 1) - 1)" :key="level" />
					<N8nText size="small" color="text-light" class="sidebarEmptyState">
						{{ item.value.label }}
					</N8nText>
				</div>
				<SidebarItem
					v-else
					:item="item.value as IMenuItem"
					:key="item.value.id"
					:click="
						async () => {
							if (item.value.type === 'project' && openProject) {
								await openProject(item.value.id);
							}
							handleToggle();
						}
					"
					:open="isExpanded"
					:level="item.level"
					:ariaLabel="`Open ${item.value.label}`"
				/>
			</TreeItem>
		</TreeVirtualizer>
	</TreeRoot>
</template>

<style scoped lang="scss">
.item {
	position: relative;
	display: flex;
	align-items: center;
	max-width: 100%;
}

.sidebarEmptyState {
	padding: var(--spacing-3xs) var(--spacing-3xs);
	width: 100%;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.itemIdent {
	display: block;
	position: relative;
	width: 0.5rem;
	min-width: 0.5rem;
	align-self: stretch;
	margin-left: 0.75rem;
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
