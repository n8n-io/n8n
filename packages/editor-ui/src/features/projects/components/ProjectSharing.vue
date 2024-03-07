<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import type {
	ProjectListItem,
	ProjectRole,
	ProjectSharingData,
} from '@/features/projects/projects.types';
import ProjectSharingInfo from '@/features/projects/components/ProjectSharingInfo.vue';

const locale = useI18n();

type Props = {
	projects: ProjectListItem[];
	readonly?: boolean;
};

const props = defineProps<Props>();
const selectedProjects = defineModel<ProjectSharingData[]>({
	required: true,
});

const selectedProject = ref('');
const filter = ref('');
const projectRoles = ref<Array<{ label: string; value: ProjectRole }>>([
	{ value: 'project:editor', label: locale.baseText('projects.settings.role.editor') },
]);

const filteredProjects = computed(() =>
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
	selectedProjects.value?.push(project);
	selectedProject.value = '';
};

const onRoleAction = (project: ProjectListItem, role: string) => {
	const index = selectedProjects.value?.findIndex((p) => p.id === project.id) ?? -1;
	if (index === -1) {
		return;
	}

	if (role === 'remove') {
		selectedProjects.value?.splice(index, 1);
	}
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
			@update:model-value="onProjectSelected"
		>
			<template #prefix>
				<n8n-icon icon="search" />
			</template>
			<N8nOption
				v-for="project in filteredProjects"
				:key="project.id"
				:value="project.id"
				:label="project.name"
			>
				<ProjectSharingInfo :project="project" />
			</N8nOption>
		</N8nSelect>
		<ul :class="$style.selectedProjects">
			<li
				v-for="project in selectedProjects"
				:key="project.id"
				:class="$style.project"
				data-test-id="project-sharing-list-item"
			>
				<ProjectSharingInfo :project="project" />
				<N8nSelect
					:class="$style.projectRoleSelect"
					:model-value="'project:editor'"
					:disabled="props.readonly"
					size="small"
					@update:model-value="onRoleAction(project, $event)"
				>
					<N8nOption
						v-for="role in projectRoles"
						:key="role.value"
						:value="role.value"
						:label="role.label"
					/>
					<N8nOption value="remove">
						<N8nText color="danger">{{
							$locale.baseText('projects.settings.removeAccess')
						}}</N8nText>
					</N8nOption>
				</N8nSelect>
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

.projectRoleSelect {
	width: auto;
}
</style>
