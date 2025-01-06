<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nButton, N8nTooltip } from 'n8n-design-system';
import { useI18n } from '@/composables/useI18n';
import { type ProjectIcon, ProjectTypes } from '@/types/projects.types';
import { useProjectsStore } from '@/stores/projects.store';
import ProjectTabs from '@/components/Projects/ProjectTabs.vue';
import { getResourcePermissions } from '@/permissions';
import { VIEWS } from '@/constants';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import ProjectCreateResource from '@/components/Projects/ProjectCreateResource.vue';

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();

const headerIcon = computed((): ProjectIcon => {
	if (projectsStore.currentProject?.type === ProjectTypes.Personal) {
		return { type: 'icon', value: 'user' };
	} else if (projectsStore.currentProject?.name) {
		return projectsStore.currentProject.icon ?? { type: 'icon', value: 'layer-group' };
	} else {
		return { type: 'icon', value: 'home' };
	}
});

const projectName = computed(() => {
	if (!projectsStore.currentProject) {
		return i18n.baseText('projects.menu.overview');
	} else if (projectsStore.currentProject.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	} else {
		return projectsStore.currentProject.name;
	}
});

const projectPermissions = computed(
	() => getResourcePermissions(projectsStore.currentProject?.scopes).project,
);

const showSettings = computed(
	() =>
		!!route?.params?.projectId &&
		!!projectPermissions.value.update &&
		projectsStore.currentProject?.type === ProjectTypes.Team,
);

const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

const ACTION_TYPES = {
	WORKFLOW: 'workflow',
	CREDENTIAL: 'credential',
} as const;
type ActionTypes = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];

const createWorkflowButton = computed(() => ({
	value: ACTION_TYPES.WORKFLOW,
	label: 'Create Workflow',
	icon: sourceControlStore.preferences.branchReadOnly ? 'lock' : undefined,
	size: 'mini' as const,
	disabled:
		sourceControlStore.preferences.branchReadOnly ||
		!getResourcePermissions(homeProject.value?.scopes).workflow.create,
}));
const menu = computed(() => [
	{
		value: ACTION_TYPES.CREDENTIAL,
		label: 'Create credential',
		disabled:
			sourceControlStore.preferences.branchReadOnly ||
			!getResourcePermissions(homeProject.value?.scopes).credential.create,
	},
]);

const actions: Record<ActionTypes, (projectId: string) => void> = {
	[ACTION_TYPES.WORKFLOW]: (projectId: string) => {
		void router.push({
			name: VIEWS.NEW_WORKFLOW,
			query: {
				projectId,
			},
		});
	},
	[ACTION_TYPES.CREDENTIAL]: (projectId: string) => {
		void router.push({
			name: VIEWS.PROJECTS_CREDENTIALS,
			params: {
				projectId,
				credentialId: 'create',
			},
		});
	},
} as const;

const onSelect = (action: string) => {
	const executableAction = actions[action as ActionTypes];
	if (!homeProject.value) {
		return;
	}
	executableAction(homeProject.value.id);
};
</script>

<template>
	<div>
		<div :class="$style.projectHeader">
			<div :class="$style.projectDetails">
				<ProjectIcon :icon="headerIcon" :border-less="true" size="medium" />
				<div :class="$style.headerActions">
					<N8nHeading bold tag="h2" size="xlarge">{{ projectName }}</N8nHeading>
					<N8nText color="text-light">
						<slot name="subtitle">
							<span v-if="!projectsStore.currentProject">{{
								i18n.baseText('projects.header.subtitle')
							}}</span>
						</slot>
					</N8nText>
				</div>
			</div>
			<div v-if="route.name !== VIEWS.PROJECT_SETTINGS" :class="[$style.headerActions]">
				<N8nTooltip
					:disabled="!sourceControlStore.preferences.branchReadOnly"
					:content="i18n.baseText('readOnlyEnv.cantAdd.any')"
				>
					<ProjectCreateResource
						data-test-id="add-resource-buttons"
						:actions="menu"
						:disabled="sourceControlStore.preferences.branchReadOnly"
						@action="onSelect"
					>
						<N8nButton
							data-test-id="add-resource-workflow"
							v-bind="createWorkflowButton"
							@click="onSelect(ACTION_TYPES.WORKFLOW)"
						/>
					</ProjectCreateResource>
				</N8nTooltip>
			</div>
		</div>
		<div :class="$style.actions">
			<ProjectTabs :show-settings="showSettings" />
		</div>
	</div>
</template>

<style lang="scss" module>
.projectHeader,
.projectDescription {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-bottom: var(--spacing-m);
	min-height: var(--spacing-3xl);
}

.projectDetails {
	display: flex;
	align-items: center;
}

.actions {
	padding: var(--spacing-2xs) 0 var(--spacing-l);
}

@include mixins.breakpoint('xs-only') {
	.projectHeader {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--spacing-xs);
	}

	.headerActions {
		margin-left: auto;
	}
}
</style>
