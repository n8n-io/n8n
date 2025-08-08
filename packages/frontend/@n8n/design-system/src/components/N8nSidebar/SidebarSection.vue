<script lang="ts" setup>
import { TreeRoot, TreeItem, TreeItemToggleEvent } from 'reka-ui';
import type { TreeItemType } from '.';
import { computed, ref } from 'vue';
import { N8nIcon, N8nIconButton, N8nLink, N8nText } from '..';
import { IconName } from '../N8nIcon/icons';

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
</script>

<template>
	<div>
		<header class="itemHeader">
			<div class="dropdownButton">
				<div class="icon">
					<N8nIcon :icon="icon ?? 'layers'" />
				</div>
				<button class="button" @click="toggleSection(id)" :aria-label="`Toggle ${title} section`">
					<N8nIcon :icon="open.includes(id) ? 'chevron-down' : 'chevron-right'" />
				</button>
			</div>
			<N8nLink :to="link">{{ title }}</N8nLink>
		</header>
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
					<div class="itemHeader">
						<div class="dropdownButton" v-if="item.value.type === 'folder'">
							<div class="icon">
								<N8nIcon :icon="isExpanded ? 'folder-open' : 'folder'" />
							</div>
							<N8nIconButton
								class="button"
								square
								type="tertiary"
								text
								size="small"
								:icon="isExpanded ? 'chevron-down' : 'chevron-right'"
								@click.stop="handleToggle"
								:aria-label="`Toggle ${item.value.label} item`"
							/>
						</div>
						<N8nText>{{ item.value.label }}</N8nText>
					</div>
				</TreeItem>
			</TreeRoot>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.items {
	display: flex;
	padding-left: 8px;
	margin-left: 12px;
	border-left: 1px solid var(--color-foreground-light);
	margin-bottom: 12px;
}

.item {
	display: flex;
	align-items: center;
	cursor: pointer;
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

.itemHeader {
	display: flex;
	align-items: center;
	padding: 4px;
	gap: 4px;
	cursor: pointer;
}

.dropdownButton {
	position: relative;
	border-radius: var(--border-radius-small);

	.icon {
		position: absolute;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.button {
		opacity: 0;
	}

	&:hover .button,
	.button:focus {
		opacity: 1;
	}

	&:hover .icon,
	&:focus-within .icon {
		opacity: 0;
	}
}

.button {
	width: 16px;
	height: 16px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: transparent;
	cursor: pointer;
	outline: none;
	border: none;
	padding: 0;
}
</style>
