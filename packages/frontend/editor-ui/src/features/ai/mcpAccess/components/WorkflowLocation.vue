<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nLink, N8nText } from '@n8n/design-system';
import { VIEWS } from '@/app/constants';
import router from '@/app/router';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';

type ParentFolder = {
	id: string;
	name: string;
	parentFolderId: string | null;
};

// If workflow name is not provided, only project and folder (if any) will be shown.
const props = withDefaults(
	defineProps<{
		workflowId: string;
		workflowName?: string;
		homeProject?: ProjectSharingData;
		parentFolder?: ParentFolder;
		asLinks?: boolean;
	}>(),
	{
		workflowName: undefined,
		homeProject: undefined,
		parentFolder: undefined,
		asLinks: false,
	},
);

const i18n = useI18n();

const projectName = computed(() => {
	if (props.homeProject?.type === 'personal') {
		return i18n.baseText('projects.menu.personal');
	}
	return props.homeProject?.name ?? '';
});

const projectLink = computed(() => {
	if (!props.homeProject) return '';
	return router.resolve({
		name: VIEWS.PROJECTS_WORKFLOWS,
		params: { projectId: props.homeProject.id },
	}).fullPath;
});

const folderLink = computed(() => {
	if (!props.homeProject || !props.parentFolder) return '';
	return `/projects/${props.homeProject.id}/folders/${props.parentFolder.id}/workflows`;
});

const workflowLink = computed(() => {
	if (!props.workflowId) return '';
	return router.resolve({
		name: VIEWS.WORKFLOW,
		params: { name: props.workflowId },
	}).fullPath;
});

const hasGrandparentFolder = computed(() => !!props.parentFolder?.parentFolderId);
</script>

<template>
	<div :class="$style['location-container']">
		<!-- Project -->
		<span v-if="homeProject" :class="$style.truncate">
			<N8nLink
				v-if="asLinks"
				data-test-id="workflow-location-project-link"
				:to="projectLink"
				:theme="'text'"
				:class="[$style['location-link'], $style.truncate]"
				:new-window="true"
			>
				<N8nText :class="$style.truncate" data-test-id="workflow-location-project-name">
					{{ projectName }}
				</N8nText>
			</N8nLink>
			<N8nText v-else :class="$style.truncate" data-test-id="workflow-location-project-name">
				{{ projectName }}
			</N8nText>
		</span>

		<!-- Separator after project -->
		<span
			v-if="parentFolder || workflowName"
			:class="$style.separator"
			data-test-id="workflow-location-separator"
		>
			/
		</span>

		<!-- Ellipsis for grandparent folder -->
		<span
			v-if="hasGrandparentFolder"
			:class="$style.grandparent"
			data-test-id="workflow-location-grandparent"
		>
			<span :class="$style.ellipsis">...</span>
			<span :class="$style.separator" data-test-id="workflow-location-ellipsis-separator">/</span>
		</span>

		<!-- Parent folder -->
		<span v-if="parentFolder" :class="$style['parent-folder']">
			<N8nLink
				v-if="asLinks && homeProject"
				data-test-id="workflow-location-folder-link"
				:to="folderLink"
				:theme="'text'"
				:class="[$style['location-link'], $style.truncate]"
				:new-window="true"
			>
				<N8nText :class="$style.truncate" data-test-id="workflow-location-folder-name">
					{{ parentFolder.name }}
				</N8nText>
			</N8nLink>
			<N8nText v-else :class="$style.truncate" data-test-id="workflow-location-folder-name">
				{{ parentFolder.name }}
			</N8nText>
		</span>

		<!-- Separator before workflow name -->
		<span v-if="parentFolder && workflowName" :class="$style.separator">/</span>

		<!-- Workflow name -->
		<span v-if="workflowName" :class="[$style['workflow-name'], $style.truncate]">
			<N8nLink
				v-if="asLinks && workflowId"
				data-test-id="workflow-location-workflow-link"
				:to="workflowLink"
				:theme="'text'"
				:class="[$style['location-link'], $style.truncate]"
				:new-window="true"
			>
				<N8nText :class="$style.truncate" data-test-id="workflow-location-workflow-name">
					{{ workflowName }}
				</N8nText>
			</N8nLink>
			<N8nText v-else :class="$style.truncate" data-test-id="workflow-location-workflow-name">
				{{ workflowName }}
			</N8nText>
		</span>
	</div>
</template>

<style module lang="scss">
.location-container {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--color--text);
	min-width: 0;
	overflow: hidden;
}

.ellipsis {
	padding-right: var(--spacing--4xs);
}

.ellipsis,
.separator {
	user-select: none;
	color: var(--color--text--tint-1);
}

.grandparent {
	display: flex;
	align-items: center;
	flex-shrink: 0;
}

.parent-folder {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	overflow: hidden;
}

.truncate {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.location-link {
	color: var(--color--text);
}

.workflow-name {
	color: var(--color--text--shade-1);
}
</style>
