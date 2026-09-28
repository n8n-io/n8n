<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nCallout, N8nText } from '@n8n/design-system';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import {
	isOwnedByPersonalProject,
	splitName,
} from '@/features/collaboration/projects/projects.utils';

type Props = {
	homeProject?: ProjectSharingData;
	sharedWithProjects?: ProjectSharingData[];
	isGlobal?: boolean;
	/** The project the modal is being viewed from. */
	workingProjectId?: string;
};

const props = defineProps<Props>();

const i18n = useI18n();
const projectsStore = useProjectsStore();

function projectDisplayName(project?: ProjectSharingData | null): string | undefined {
	if (!project) return undefined;
	const { name, email } = splitName(project.name ?? '');
	return name ?? email ?? undefined;
}

const isOwnedByViewer = computed(() =>
	isOwnedByPersonalProject(props.homeProject, projectsStore.personalProject),
);

const isPersonalCredential = computed(() => props.homeProject?.type === ProjectTypes.Personal);

const ownerLine = computed(() => {
	if (!props.homeProject) return undefined;
	if (isOwnedByViewer.value) return i18n.baseText('credentialEdit.ownership.ownedByYou');
	const name =
		projectDisplayName(props.homeProject) ??
		i18n.baseText('credentialEdit.credentialSharing.info.sharee.fallback');
	return i18n.baseText('credentialEdit.ownership.ownedBy', { interpolate: { name } });
});

const sharedProjectNames = computed(() =>
	(props.sharedWithProjects ?? [])
		.map((project) => projectDisplayName(project))
		.filter((name): name is string => !!name),
);

const sharedProjectsListFormatter = computed(
	() => new Intl.ListFormat(i18n.locale, { style: 'long', type: 'conjunction' }),
);

const sharingLine = computed(() => {
	if (props.isGlobal) return i18n.baseText('credentialEdit.ownership.sharedGlobally');
	if (sharedProjectNames.value.length) {
		return i18n.baseText('credentialEdit.ownership.sharedWith', {
			interpolate: {
				projects: sharedProjectsListFormatter.value.format(sharedProjectNames.value),
			},
		});
	}
	return i18n.baseText('credentialEdit.ownership.notShared');
});

const showNotSharedWithCurrentProjectNotice = computed(() => {
	if (!isPersonalCredential.value || !isOwnedByViewer.value) return false;
	if (props.isGlobal) return false;
	if (!props.workingProjectId || !props.homeProject) return false;
	if (props.workingProjectId === props.homeProject.id) return false;
	return !(props.sharedWithProjects ?? []).some((project) => project.id === props.workingProjectId);
});
</script>

<template>
	<div data-test-id="credential-ownership-info" :class="$style.container">
		<N8nText v-if="ownerLine" size="small" color="text-light" tag="p">{{ ownerLine }}</N8nText>
		<N8nText size="small" color="text-light" tag="p">{{ sharingLine }}</N8nText>
		<N8nCallout
			v-if="showNotSharedWithCurrentProjectNotice"
			theme="info"
			:class="$style.callout"
			data-test-id="credential-ownership-not-shared-with-project-notice"
		>
			{{ i18n.baseText('credentialEdit.ownership.notSharedWithCurrentProject') }}
		</N8nCallout>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--lg);
}

.callout {
	margin-top: var(--spacing--2xs);
}
</style>
