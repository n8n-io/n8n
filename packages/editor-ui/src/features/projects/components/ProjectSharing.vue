<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
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
	homeProject?: ProjectSharingData;
	readonly?: boolean;
	static?: boolean;
	placeholder?: string;
};

const props = defineProps<Props>();
const model = defineModel<(ProjectSharingData | null) | ProjectSharingData[]>({
	required: true,
});

const selectedProject = ref(Array.isArray(model.value) ? '' : model.value?.id ?? '');
const filter = ref('');
const projectRoles = ref<Array<{ label: string; value: ProjectRole }>>([
	{ value: 'project:editor', label: locale.baseText('projects.settings.role.editor') },
]);
const selectPlaceholder = computed(
	() =>
		props.placeholder ??
		(Array.isArray(model.value)
			? locale.baseText('projects.sharing.placeholder')
			: locale.baseText('projects.sharing.placeholder.single')),
);
const filteredProjects = computed(() =>
	props.projects
		.filter(
			(project) =>
				project.name?.toLowerCase().includes(filter.value.toLowerCase()) &&
				(Array.isArray(model.value) ? !model.value?.find((p) => p.id === project.id) : true),
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

	if (Array.isArray(model.value)) {
		model.value = [...model.value, project];
	} else {
		model.value = project;
	}
};

const onRoleAction = (project: ProjectSharingData, role: string) => {
	if (!Array.isArray(model.value) || props.readonly) {
		return;
	}

	const index = model.value?.findIndex((p) => p.id === project.id) ?? -1;
	if (index === -1) {
		return;
	}

	if (role === 'remove') {
		model.value = model.value.filter((p) => p.id !== project.id);
	}
};

watch(
	() => model.value,
	() => {
		if (model.value === null || Array.isArray(model.value)) {
			selectedProject.value = '';
		} else {
			selectedProject.value = model.value.id;
		}
	},
	{ immediate: true },
);
</script>
<template>
	<div>
		<N8nSelect
			v-if="!props.static"
			:model-value="selectedProject"
			data-test-id="project-sharing-select"
			:filterable="true"
			:filter-method="setFilter"
			:placeholder="selectPlaceholder"
			:default-first-option="true"
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
		<ul v-if="Array.isArray(model)" :class="$style.selectedProjects">
			<li v-if="props.homeProject" :class="$style.project" data-test-id="project-sharing-owner">
				<ProjectSharingInfo :project="props.homeProject">
					<N8nBadge theme="tertiary" bold>
						{{ locale.baseText('auth.roles.owner') }}
					</N8nBadge></ProjectSharingInfo
				>
			</li>
			<li
				v-for="project in model"
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
							locale.baseText('projects.settings.removeAccess')
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
