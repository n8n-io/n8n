<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { FolderPathItem } from '@/Interface';
import { useProjectsStore } from '@/stores/projects.store';
import { ProjectTypes } from '@/types/projects.types';
import type { UserAction } from '@n8n/design-system/types';
import { type PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { computed } from 'vue';

type Props = {
	actions: UserAction[];
	breadcrumbs: {
		visibleItems: FolderPathItem[];
		hiddenItems: FolderPathItem[];
	};
};

defineProps<Props>();

const emit = defineEmits<{
	itemSelected: [item: PathItem];
	action: [action: string];
}>();

const i18n = useI18n();

const projectsStore = useProjectsStore();

const currentProject = computed(() => projectsStore.currentProject);

const projectName = computed(() => {
	if (currentProject.value?.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	}
	return currentProject.value?.name;
});

const onItemSelect = (item: PathItem) => {
	emit('itemSelected', item);
};

const onAction = (action: string) => {
	emit('action', action);
};
</script>
<template>
	<div :class="$style.container">
		<n8n-breadcrumbs
			v-if="breadcrumbs.visibleItems"
			:items="breadcrumbs.visibleItems"
			:highlight-last-item="false"
			:path-truncated="breadcrumbs.visibleItems[0].parentFolder"
			:hidden-items="breadcrumbs.hiddenItems"
			data-test-id="folder-card-breadcrumbs"
			@item-selected="onItemSelect"
		>
			<template v-if="currentProject" #prepend>
				<div :class="$style['home-project']">
					<n8n-link :to="`/projects/${currentProject.id}`">
						<N8nText size="large" color="text-base">{{ projectName }}</N8nText>
					</n8n-link>
				</div>
			</template>
		</n8n-breadcrumbs>
		<n8n-action-toggle
			v-if="breadcrumbs.visibleItems"
			:actions="actions"
			theme="dark"
			data-test-id="folder-breadcrumbs-actions"
			@action="onAction"
		/>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	align-items: center;
}

.home-project {
	display: flex;
	align-items: center;

	&:hover * {
		color: var(--color-text-dark);
	}
}
</style>
