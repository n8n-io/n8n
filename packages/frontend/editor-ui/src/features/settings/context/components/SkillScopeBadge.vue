<script setup lang="ts">
import { computed } from 'vue';
import type { ProjectIcon as ProjectIconData, SkillListItem } from '@n8n/api-types';
import { N8nBadge, N8nIcon } from '@n8n/design-system';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';

import { useSkillScopeDisplay } from '../skills.utils';

const props = defineProps<{
	skill: Pick<SkillListItem, 'scope' | 'projectId' | 'projectName' | 'projectType'>;
	projectIcon?: ProjectIconData | null;
}>();

const { scopeDisplay } = useSkillScopeDisplay();

const display = computed(() => scopeDisplay(props.skill));
</script>

<template>
	<N8nBadge variant="outline" :class="$style.badge" data-test-id="skill-scope-badge">
		<!-- The leading slot is a direct flex child of the badge, so the icon centres with the label. -->
		<template #leading>
			<ProjectIcon
				v-if="props.skill.scope === 'project' && props.projectIcon"
				:icon="props.projectIcon"
				size="mini"
				border-less
			/>
			<N8nIcon v-else :class="$style.icon" :icon="display.icon" size="small" />
		</template>
		{{ display.label }}
	</N8nBadge>
</template>

<style lang="scss" module>
.badge {
	max-width: 100%;

	// Geist sits high in its line box, so the inherited line height leaves the label above the
	// icon. Padding keeps descenders clear of the label's ellipsis clip.
	> :global(.n8n-text) {
		line-height: 1;
		padding-block: var(--spacing--5xs);
	}
}

.icon {
	flex-shrink: 0;
}
</style>
