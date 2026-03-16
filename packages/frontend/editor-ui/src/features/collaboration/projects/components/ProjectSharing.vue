<script lang="ts" setup>
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import type { SelectSize } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import type { AllRolesMap } from '@n8n/permissions';
import { useDebounceFn, useAsyncState } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
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
const projectsStore = useProjectsStore();

type Props = {
	/** Client-side post-filter applied to results (e.g. permission checks). */
	filterFn?: (project: ProjectListItem) => boolean;
	/** When true, excludes personal projects of non-activated (pending) users. */
	activated?: boolean;
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

const selectPlaceholder = computed(
	() => props.placeholder ?? locale.baseText('projects.sharing.select.placeholder'),
);
const noDataText = computed(
	() => props.emptyOptionsText ?? locale.baseText('projects.sharing.noMatchingUsers'),
);

const excludedIds = computed(() => {
	const selected = Array.isArray(model.value) ? model.value.map((p) => p.id) : [];
	return new Set([...(props.homeProject?.id ? [props.homeProject.id] : []), ...selected]);
});

const TAKE = 50;

const {
	isLoading,
	execute: fetchRemoteProjects,
	state,
} = useAsyncState<
	{
		count: number;
		data: ProjectListItem[];
	},
	[string]
>(
	async (query: string) =>
		await projectsStore.searchProjects({
			search: query || undefined,
			take: TAKE,
			activated: props.activated,
		}),
	{
		count: 0,
		data: [],
	},
	{
		immediate: true,
	},
);

const filteredProjects = computed(() => {
	const results = state.value.data.filter((project) => !excludedIds.value.has(project.id));
	return props.filterFn ? results.filter(props.filterFn) : results;
});

const sortedProjects = computed((): ProjectListItem[] => {
	return [
		...(props.canShareGlobally && !props.isSharedGlobally ? [GLOBAL_GROUP] : []),
		...filteredProjects.value,
	];
});

const projectIcon = computed<IconOrEmoji>(() => {
	const defaultIcon: IconOrEmoji = { type: 'icon', value: 'layers' };
	const project =
		state.value.data.find((p) => p.id === selectedProject.value) ??
		(!Array.isArray(model.value) && model.value?.id === selectedProject.value
			? model.value
			: undefined);

	if (project?.type === ProjectTypes.Personal) {
		return { type: 'icon', value: 'user' };
	} else if (project?.type === ProjectTypes.Team) {
		return isIconOrEmoji(project.icon) ? project.icon : defaultIcon;
	}

	return defaultIcon;
});

const hasMoreResults = computed(() => state.value.count > state.value.data.length);

const moreResultsLabel = computed(() =>
	locale.baseText('projects.sharing.moreResults', {
		interpolate: {
			shown: String(sortedProjects.value.length),
			total: String(state.value.count),
		},
	}),
);

const debouncedRemoteSearch = useDebounceFn(
	async (query: string) => await fetchRemoteProjects(0, query),
	getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH),
);

const onProjectSelected = (projectId: string) => {
	if (projectId === GLOBAL_GROUP.id) {
		emit('update:shareWithAllUsers', true);
		return;
	}

	const project = state.value.data.find((p) => p.id === projectId);

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
				remote
				:remote-method="debouncedRemoteSearch"
				:loading="isLoading"
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
				<N8nOption
					v-if="hasMoreResults"
					key="__more_results__"
					value="__more_results__"
					:label="moreResultsLabel"
					disabled
					:class="$style.moreResults"
				>
					<N8nText size="small" color="text-light">
						{{ moreResultsLabel }}
					</N8nText>
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
					v-if="!props.static && !(project.id === GLOBAL_GROUP.id && !canShareGlobally)"
					variant="subtle"
					icon-only
					native-type="button"
					icon="trash-2"
					:aria-label="locale.baseText('generic.delete')"
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

.moreResults {
	cursor: default;
	text-align: center;
	border-top: var(--border);
}
</style>
