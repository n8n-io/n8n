<script setup lang="ts">
import { computed } from 'vue';
import type { SkillListItem } from '@n8n/api-types';
import { N8nBadge, N8nIcon } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { splitName } from '@/features/collaboration/projects/projects.utils';

const props = defineProps<{
	skill: Pick<SkillListItem, 'scope' | 'projectId' | 'projectName' | 'agentName'>;
}>();

const i18n = useI18n();
const projectsStore = useProjectsStore();

const isPersonalProject = computed(() => {
	const { projectId } = props.skill;
	if (!projectId) return false;
	if (projectId === projectsStore.personalProject?.id) return true;
	return projectsStore.myProjects.some(
		(project) => project.id === projectId && project.type === 'personal',
	);
});

const icon = computed<IconName>(() => {
	switch (props.skill.scope) {
		case 'instance':
			return 'globe';
		case 'agent':
			return 'bot';
		case 'project':
			return isPersonalProject.value ? 'user' : 'layers';
	}
});

const label = computed(() => {
	const { scope, projectId, projectName, agentName } = props.skill;
	switch (scope) {
		case 'instance':
			return i18n.baseText('settings.context.skills.scope.instance');
		case 'agent':
			return agentName
				? i18n.baseText('settings.context.skills.scope.agent', { interpolate: { name: agentName } })
				: i18n.baseText('settings.context.skills.scope.agentFallback');
		case 'project':
			if (projectId === projectsStore.personalProject?.id) {
				return i18n.baseText('settings.context.skills.scope.personalProject');
			}
			if (isPersonalProject.value && projectName) {
				// A personal project is named `First Last <email>`; the owner is the name part.
				const { name, email } = splitName(projectName);
				return name ?? email ?? projectName;
			}
			// A project the viewer cannot read is still listed, so fall back to a neutral label.
			return projectName ?? i18n.baseText('settings.context.skills.scope.project');
	}
});
</script>

<template>
	<N8nBadge variant="outline" :class="$style.badge" data-test-id="skill-scope-badge">
		<!-- The badge wraps its slot in a text span, so the flex row has to live inside the slot. -->
		<span :class="$style.content">
			<N8nIcon :icon="icon" size="small" />
			<span :class="$style.label">{{ label }}</span>
		</span>
	</N8nBadge>
</template>

<style lang="scss" module>
.badge {
	max-width: 100%;
}

.content {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
