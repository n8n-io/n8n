<script setup lang="ts">
import { N8nBreadcrumbs, N8nButton, type PathItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { PROJECT_ROOT } from 'n8n-workflow';

const props = defineProps<{
	items: PathItem[];
	folderId: string | null;
	canCreate: boolean;
	dragActive: boolean;
}>();

const emit = defineEmits<{
	navigate: [id: string];
	drop: [id: string];
	create: [];
}>();

const i18n = useI18n();

function onBreadcrumbDrop(event: DragEvent) {
	const target = event.target;
	const item = target instanceof Element ? target.closest<HTMLElement>('[data-resourceid]') : null;

	if (item?.dataset.resourceid) {
		emit('drop', item.dataset.resourceid);
	}
}
</script>

<template>
	<div
		:class="$style.toolbar"
		@dragover.prevent
		@drop.prevent="emit('drop', props.folderId ?? PROJECT_ROOT)"
	>
		<N8nBreadcrumbs
			:items="items"
			:drag-active="dragActive"
			@item-selected="emit('navigate', $event.id)"
			@item-drop="emit('drop', $event.id)"
			@dragover.prevent
			@drop.prevent.stop="onBreadcrumbDrop"
		/>
		<N8nButton
			v-if="canCreate"
			variant="ghost"
			icon="folder-plus"
			data-testid="agent-folder-create"
			@click="emit('create')"
		>
			{{ i18n.baseText('agents.folders.create') }}
		</N8nButton>
	</div>
</template>

<style module lang="scss">
.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	min-width: 0;
}
</style>
