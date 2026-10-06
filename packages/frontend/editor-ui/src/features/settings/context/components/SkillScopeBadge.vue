<script setup lang="ts">
import { computed } from 'vue';
import type { HubSkillListItem } from '@n8n/api-types';
import { N8nBadge, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	skill: Pick<HubSkillListItem, 'scope' | 'projectName'>;
}>();

const i18n = useI18n();

const label = computed(() => {
	switch (props.skill.scope) {
		case 'user':
			return i18n.baseText('settings.context.skills.scope.user');
		case 'instance':
			return i18n.baseText('settings.context.skills.scope.instance');
		case 'project':
			// A project the viewer cannot read is still listed, so fall back to a neutral label.
			return props.skill.projectName ?? i18n.baseText('settings.context.skills.scope.project');
	}
});
</script>

<template>
	<N8nBadge
		:variant="props.skill.scope === 'user' ? 'filled' : 'outline'"
		:class="$style.badge"
		data-test-id="skill-scope-badge"
	>
		<span :class="$style.content">
			<N8nIcon v-if="props.skill.scope === 'user'" icon="user" size="small" />
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
