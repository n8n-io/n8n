<script setup lang="ts">
import { computed } from 'vue';
import type { SkillListItem } from '@n8n/api-types';
import { N8nBadge, N8nIcon } from '@n8n/design-system';

import { useSkillScopeDisplay } from '../skills.utils';

const props = defineProps<{
	skill: Pick<SkillListItem, 'scope' | 'projectId' | 'projectName' | 'projectType' | 'agentName'>;
}>();

const { scopeDisplay } = useSkillScopeDisplay();

const display = computed(() => scopeDisplay(props.skill));
</script>

<template>
	<N8nBadge variant="outline" :class="$style.badge" data-test-id="skill-scope-badge">
		<!-- The badge wraps its slot in a text span, so the flex row has to live inside the slot. -->
		<span :class="$style.content">
			<N8nIcon :icon="display.icon" size="small" />
			<span :class="$style.label">{{ display.label }}</span>
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
