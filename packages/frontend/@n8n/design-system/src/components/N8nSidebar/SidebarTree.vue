<script setup lang="ts">
import { IMenuElement, IMenuItem } from '@n8n/design-system/types';
import { TreeItem, TreeRoot, TreeVirtualizer } from 'reka-ui';
import SidebarItem from './SidebarItem.vue';
import N8nText from '../N8nText';

defineProps<{ items: IMenuElement[]; openProject?: (id: string) => Promise<void> }>();
</script>

<template>
	<TreeRoot :items :get-key="(item: IMenuElement) => item.id">
		<TreeVirtualizer v-slot="{ item }" :text-content="(opt) => opt.name" :estimate-size="32">
			<TreeItem
				as-child
				:key="item.value.id"
				v-slot="{ isExpanded, handleToggle }"
				class="item"
				@toggle.prevent
				@click.prevent
				v-bind="item.bind"
			>
				<div v-if="item.value.type === 'empty'">
					<span class="itemIdent" v-for="level in new Array((item.level || 1) - 1)" :key="level" />
					<N8nText color="text-light" class="sidebarEmptyState">
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
}

.sidebarEmptyState {
	padding: var(--spacing-3xs) var(--spacing-3xs);
	max-width: calc(100% - var(--spacing-2xl));
	min-width: 0;
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
