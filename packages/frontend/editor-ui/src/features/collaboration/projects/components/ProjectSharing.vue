<script lang="ts" setup>
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import type { SelectSize } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import type { AllRolesMap } from '@n8n/permissions';
import orderBy from 'lodash/orderBy';
import { computed, ref, watch } from 'vue';
import { ProjectTypes, type ProjectListItem, type ProjectSharingData } from '../projects.types';
import ProjectSharingInfo from './ProjectSharingInfo.vue';

import {
	N8nBadge,
	N8nButton,
	N8nIcon,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';

const locale = useI18n();

type Props = {
	projects: ProjectListItem[];
	homeProject?: ProjectSharingData;
	roles?: AllRolesMap['workflow' | 'credential' | 'project'];
	readonly?: boolean;
	static?: boolean;
	placeholder?: string;
	emptyOptionsText?: string;
	size?: SelectSize;
	clearable?: boolean;
	canShareGlobally?: boolean;
	isSharedGlobally?: boolean;
	allUsersLabel?: string;
	disabledTooltip?: string;
};

const props = defineProps<Props>();

const GLOBAL_GROUP: ProjectListItem = {
	id: 'all_users',
	name: props.allUsersLabel ?? locale.baseText('projects.sharing.allUsers'),
	type: 'public',
	icon: { type: 'icon', value: 'globe' },
	role: 'member',
	createdAt: `${Date.now()}`,
	updatedAt: `${Date.now()}`,
};

const model = defineModel<(ProjectSharingData | null) | ProjectSharingData[]>({
	required: true,
});

const emit = defineEmits<{
	projectAdded: [value: ProjectSharingData];
	projectRemoved: [value: ProjectSharingData];
	clear: [];
	'update:shareWithAllUsers': [value: boolean];
}>();

const selectedProject = ref(Array.isArray(model.value) ? '' : (model.value?.id ?? ''));

const selectedProjects = computed((): ProjectSharingData[] | null => {
	if (!Array.isArray(model.value)) {
		return null;
	}

	return props.isSharedGlobally ? [GLOBAL_GROUP, ...model.value] : model.value;
});

const filter = ref('');
const selectPlaceholder = computed(
	() => props.placeholder ?? locale.baseText('projects.sharing.select.placeholder'),
);
const noDataText = computed(
	() => props.emptyOptionsText ?? locale.baseText('projects.sharing.noMatchingUsers'),
);

const filteredProjects = computed(() =>
	props.projects.filter(
		(project) =>
			project.name?.toLowerCase().includes(filter.value.toLowerCase()) &&
			(Array.isArray(model.value) ? !model.value?.find((p) => p.id === project.id) : true),
	),
);

const sortedProjects = computed((): ProjectListItem[] => [
	...(props.canShareGlobally && !props.isSharedGlobally ? [GLOBAL_GROUP] : []),
	...orderBy(
		filteredProjects.value,
		['type', (project) => project.name?.toLowerCase()],
		['desc', 'asc'],
	),
]);

const projectIcon = computed<IconOrEmoji>(() => {
	const defaultIcon: IconOrEmoji = { type: 'icon', value: 'layers' };
	const project = props.projects.find((p) => p.id === selectedProject.value);

	if (project?.type === ProjectTypes.Personal) {
		return { type: 'icon', value: 'user' };
	} else if (project?.type === ProjectTypes.Team) {
		return isIconOrEmoji(project.icon) ? project.icon : defaultIcon;
	}

	return defaultIcon;
});

const setFilter = (query: string) => {
	filter.value = query;
};

const onProjectSelected = (projectId: string) => {
	if (projectId === GLOBAL_GROUP.id) {
		emit('update:shareWithAllUsers', true);
		return;
	}

	const project = props.projects.find((p) => p.id === projectId);

	if (!project) {
		return;
	}

	if (Array.isArray(model.value)) {
		model.value = [...model.value, project];
	} else {
		model.value = project;
	}
	emit('projectAdded', project);
};

const onRoleAction = (project: ProjectSharingData, role: string) => {
	if (!Array.isArray(model.value) || props.readonly) {
		return;
	}

	if (project.id === GLOBAL_GROUP.id && role === 'remove') {
		emit('update:shareWithAllUsers', false);

		return;
	}

	const index = model.value?.findIndex((p) => p.id === project.id) ?? -1;
	if (index === -1) {
		return;
	}

	if (role === 'remove') {
		model.value = model.value.filter((p) => p.id !== project.id);
		emit('projectRemoved', project);
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
		<N8nTooltip :disabled="!props.disabledTooltip" placement="top">
			<template #content>{{ props.disabledTooltip }}</template>
			<N8nSelect
				v-if="!props.static || props.disabledTooltip"
				:model-value="selectedProject"
				data-test-id="project-sharing-select"
				:filterable="true"
				:filter-method="setFilter"
				:placeholder="selectPlaceholder"
				:default-first-option="true"
				:no-data-text="noDataText"
				:size="size ?? 'medium'"
				:disabled="props.readonly || !!props.disabledTooltip"
				:clearable
				:popper-class="$style.popper"
				@update:model-value="onProjectSelected"
				@clear="emit('clear')"
			>
				<template #prefix>
					<N8nIcon v-if="projectIcon.type === 'icon'" :icon="projectIcon.value" color="text-dark" />
					<N8nText
						v-else-if="projectIcon.type === 'emoji'"
						color="text-light"
						:class="$style.emoji"
					>
						{{ projectIcon.value }}
					</N8nText>
				</template>
				<N8nOption
					v-for="project in sortedProjects"
					:key="project.id"
					:value="project.id"
					:label="project.name ?? ''"
				>
					<ProjectSharingInfo :project="project" />
				</N8nOption>
			</N8nSelect>
		</N8nTooltip>
		<ul v-if="selectedProjects" :class="$style.selectedProjects">
			<li v-if="props.homeProject" :class="$style.project" data-test-id="project-sharing-owner">
				<ProjectSharingInfo :project="props.homeProject">
					<N8nBadge theme="tertiary" bold>
						{{ locale.baseText('auth.roles.owner') }}
					</N8nBadge></ProjectSharingInfo
				>
			</li>
			<li
				v-for="project in selectedProjects"
				:key="project.id"
				:class="$style.project"
				data-test-id="project-sharing-list-item"
			>
				<ProjectSharingInfo :project="project" />
				<N8nSelect
					v-if="
						props.roles?.length &&
						!props.static &&
						!(project.id === GLOBAL_GROUP.id && !canShareGlobally)
					"
					:class="$style.projectRoleSelect"
					:model-value="props.roles[0]"
					:disabled="props.readonly"
					size="small"
					@update:model-value="onRoleAction(project, $event)"
				>
					<N8nOption
						v-for="role in roles"
						:key="role.slug"
						:value="role.slug"
						:label="role.displayName"
					/>
				</N8nSelect>
				<N8nButton
					variant="subtle"
					iconOnly
					v-if="!props.static && !(project.id === GLOBAL_GROUP.id && !canShareGlobally)"
					native-type="button"
					icon="trash-2"
					:disabled="props.readonly"
					data-test-id="project-sharing-remove"
					@click="onRoleAction(project, 'remove')"
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
	padding: var(--spacing--2xs) 0;
	gap: var(--spacing--2xs);
}

.selectedProjects {
	li {
		padding: 0;
		border-bottom: var(--border);

		&:first-child {
			padding-top: var(--spacing--md);
		}

		&:last-child {
			border-bottom: none;
		}
	}
}

.projectRoleSelect {
	width: auto;
}

.popper :global(.el-scrollbar__wrap) {
	scrollbar-width: none; // <-- hides scrollbar but maintains scrolling
}

.emoji {
	font-size: var(--font-size--sm);
}
</style>
