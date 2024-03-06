<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import type { Project, ProjectListItem } from '@/features/projects/projects.types';

const locale = useI18n();

type Props = {
	projects: ProjectListItem[];
	readonly?: boolean;
};

const props = defineProps<Props>();
const selectedProjects = defineModel<Array<Omit<Project, 'relations'>>>({
	required: true,
});
const selectedProject = ref('');

const filter = ref('');
const sortedProjects = computed(() =>
	props.projects
		.filter(
			(project) =>
				project.name?.toLowerCase().includes(filter.value.toLowerCase()) &&
				project.type === 'personal' &&
				!selectedProjects.value?.find((p) => p.id === project.id),
		)
		.sort((a, b) => (a.name && b.name ? a.name.localeCompare(b.name) : 0)),
);

const setFilter = (query: string) => {
	filter.value = query;
};

const onProjectSelected = (projectId: string) => {
	const project = props.projects.find((p) => p.id === projectId);

	if (!project) {
		return;
	}
	const { id, name, type } = project;
	selectedProjects.value?.push({ id, name, type });
	selectedProject.value = '';
};

const onProjectRemoved = (projectId: string) => {
	const index = selectedProjects.value?.findIndex((p) => p.id === projectId) ?? -1;
	if (index === -1) {
		return;
	}
	selectedProjects.value?.splice(index, 1);
};
</script>
<template>
	<div>
		<N8nSelect
			v-model="selectedProject"
			data-test-id="project-sharing-select"
			:filterable="true"
			:filter-method="setFilter"
			:placeholder="locale.baseText('projects.sharing.placeholder')"
			:default-first-option="true"
			teleported
			:no-data-text="locale.baseText('projects.sharing.noMatchingProjects')"
			size="large"
			:disabled="props.readonly"
			@update:modelValue="onProjectSelected"
		>
			<template #prefix>
				<n8n-icon icon="search" />
			</template>
			<N8nOption
				v-for="project in sortedProjects"
				:key="project.id"
				:value="project.id"
				:label="project.name"
			>
				<div :class="$style.project">
					<N8nAvatar :first-name="project.name" />
					<N8nText :bold="true" color="text-dark">{{ project.name }}</N8nText>
				</div>
			</N8nOption>
		</N8nSelect>
		<ul :class="$style.selectedProjects">
			<li v-for="project in selectedProjects" :key="project.id" :class="$style.project">
				<div :class="$style.project">
					<N8nAvatar :first-name="project.name" />
					<N8nText :bold="true" color="text-dark">{{ project.name }}</N8nText>
				</div>
				<n8n-button
					:disabled="props.readonly"
					size="small"
					square
					icon="trash"
					@click="onProjectRemoved(project.id)"
				/>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.project {
	display: flex;
	width: 100%;
	align-items: center;
	padding: var(--spacing-2xs) 0;
	gap: var(--spacing-xs);
}

.selectedProjects {
	li {
		padding: 0;
		border-bottom: var(--border-base);

		&:first-child {
			padding-top: var(--spacing-m);
		}

		&:last-child {
			border-bottom: none;
		}
	}
}
</style>
