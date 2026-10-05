<script lang="ts" setup>
/**
 * PROTOTYPE (workspaces): the credentials a project can use that belong to its
 * workspace or to the instance. They are listed here so the inheritance is
 * visible without opening a node.
 */
import { getUsableCredentials } from '@/features/credentials/credentials.api';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { useProjectsStore } from '../projects.store';
import { isContainerProject, ProjectTypes } from '../projects.types';

const i18n = useI18n();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();

const credentials = ref<ICredentialsResponse[]>([]);
const project = computed(() => projectsStore.currentProject);

const inherited = computed(() =>
	credentials.value.filter(
		(c) =>
			c.homeProject && c.homeProject.id !== project.value?.id && isContainerProject(c.homeProject),
	),
);

const sourceLabel = (credential: ICredentialsResponse) =>
	credential.homeProject?.type === ProjectTypes.Instance
		? i18n.baseText('workspaces.inherited.from.instance')
		: i18n.baseText('workspaces.inherited.from.workspace', {
				interpolate: {
					name:
						credential.homeProject?.type === ProjectTypes.PersonalWorkspace
							? i18n.baseText('workspaces.header.personal')
							: (credential.homeProject?.name ?? ''),
				},
			});

watch(
	() => project.value?.id,
	async (projectId) => {
		credentials.value = [];
		if (!projectId || isContainerProject(project.value)) return;
		credentials.value = await getUsableCredentials(rootStore.restApiContext, { projectId });
	},
	{ immediate: true },
);
</script>

<template>
	<div v-if="inherited.length > 0" :class="$style.inherited" data-test-id="inherited-credentials">
		<N8nTooltip :content="i18n.baseText('workspaces.inherited.description')" placement="top">
			<N8nText size="small" color="text-light" :class="$style.title">
				<N8nIcon icon="layers" size="small" />
				{{ i18n.baseText('workspaces.inherited.title') }}
			</N8nText>
		</N8nTooltip>
		<span
			v-for="credential in inherited"
			:key="credential.id"
			:class="$style.chip"
			data-test-id="inherited-credential"
		>
			<N8nIcon
				:icon="credential.homeProject?.type === ProjectTypes.Instance ? 'earth' : 'box'"
				size="small"
			/>
			<N8nText size="small" bold>{{ credential.name }}</N8nText>
			<N8nText size="small" color="text-light">{{ sourceLabel(credential) }}</N8nText>
		</span>
	</div>
</template>

<style lang="scss" module>
.inherited {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-bottom: var(--spacing--xs);
}

.title {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--full);
	background-color: var(--color--background--light-2);
}
</style>
