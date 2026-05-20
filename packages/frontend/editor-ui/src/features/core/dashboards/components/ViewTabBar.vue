<script setup lang="ts">
import { computed } from 'vue';
import { N8nTabs, N8nActionDropdown } from '@n8n/design-system';
import { nanoid } from 'nanoid';

import { useMessage } from '@/app/composables/useMessage';
import type { DashboardView } from '@/features/core/dashboards/dashboards.types';

const message = useMessage();

const props = defineProps<{
	views: DashboardView[];
	activeViewId: string;
	editable?: boolean;
}>();

const emit = defineEmits<{
	(e: 'update:activeViewId', id: string): void;
	(e: 'add-view', view: DashboardView): void;
	(e: 'rename-view', payload: { id: string; name: string }): void;
	(e: 'delete-view', id: string): void;
}>();

const tabOptions = computed(() =>
	props.views.map((v) => ({
		value: v.id,
		label: v.name,
	})),
);

const dropdownItems = computed(() => [
	{ id: 'add', label: 'Add view', icon: 'circle-plus' as const },
	{
		id: 'rename',
		label: 'Rename current view',
		icon: 'square-pen' as const,
		disabled: !props.activeViewId,
	},
	{
		id: 'delete',
		label: 'Delete current view',
		icon: 'trash-2' as const,
		disabled: props.views.length <= 1,
		divided: true,
	},
]);

function onTabSelect(value: string | number) {
	emit('update:activeViewId', String(value));
}

async function onMenuSelect(id: string) {
	if (id === 'add') {
		const result = await message.prompt('Name for the new view', 'Add view', {
			confirmButtonText: 'Add',
			cancelButtonText: 'Cancel',
			inputValue: `View ${props.views.length + 1}`,
			inputValidator: (val: string) => !!val?.trim() || 'Name is required',
		});
		if (typeof result === 'string' || result.action !== 'confirm') return;
		const name = result.value?.trim();
		if (!name) return;
		const view: DashboardView = { id: nanoid(8), name, widgets: [] };
		emit('add-view', view);
	} else if (id === 'rename') {
		const current = props.views.find((v) => v.id === props.activeViewId);
		if (!current) return;
		const result = await message.prompt('Rename view', 'Rename view', {
			confirmButtonText: 'Rename',
			cancelButtonText: 'Cancel',
			inputValue: current.name,
			inputValidator: (val: string) => !!val?.trim() || 'Name is required',
		});
		if (typeof result === 'string' || result.action !== 'confirm') return;
		const name = result.value?.trim();
		if (!name || name === current.name) return;
		emit('rename-view', { id: current.id, name });
	} else if (id === 'delete') {
		const current = props.views.find((v) => v.id === props.activeViewId);
		if (!current) return;
		const result = await message.confirm(
			`The "${current.name}" view will be deleted. Its widgets will be lost.`,
			'Delete view?',
			{
				confirmButtonText: 'Delete',
				cancelButtonText: 'Cancel',
				type: 'warning',
			},
		);
		if (result !== 'confirm') return;
		emit('delete-view', current.id);
	}
}
</script>

<template>
	<div class="view-tab-bar">
		<N8nTabs
			:options="tabOptions"
			:model-value="activeViewId"
			variant="modern"
			size="medium"
			@update:model-value="onTabSelect"
		/>
		<N8nActionDropdown
			v-if="editable"
			:items="dropdownItems"
			activator-icon="ellipsis-vertical"
			placement="bottom-end"
			@select="onMenuSelect"
		/>
	</div>
</template>

<style scoped lang="scss">
.view-tab-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	border-bottom: 1px solid var(--color--foreground--tint-1);
}
</style>
