<script lang="ts" setup>
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AllRolesMap } from '@n8n/permissions';
import { computed } from 'vue';
import type { ProjectMemberData } from '../projects.types';

const props = defineProps<{
	data: ProjectMemberData;
	projectRoles: AllRolesMap['project'];
}>();

const i18n = useI18n();

const label = computed(() => i18n.baseText('projects.settings.table.access.full'));

// A stored relation does not limit instance access, but it applies again if
// the instance role changes, so the tooltip mentions it.
const storedRoleName = computed(
	() => props.projectRoles.find((role) => role.slug === props.data.role)?.displayName,
);

const tooltip = computed(() => {
	const parts = [
		i18n.baseText('projects.settings.table.access.tooltip.full', {
			interpolate: {
				name: props.data.firstName || props.data.email || '',
				role: props.data.instanceRole?.displayName ?? '',
			},
		}),
	];
	if (storedRoleName.value) {
		parts.push(
			i18n.baseText('projects.settings.table.access.tooltip.storedRole', {
				interpolate: { projectRole: storedRoleName.value },
			}),
		);
	}
	return parts.join(' ');
});
</script>

<template>
	<N8nTooltip placement="top" :show-after="300" :content="tooltip">
		<span
			:class="$style.label"
			tabindex="0"
			:aria-label="`${label}. ${tooltip}`"
			data-test-id="project-member-access-label"
		>
			<span :class="$style.text">{{ label }}</span>
			<N8nIcon icon="info" size="small" color="text-light" :class="$style.icon" />
		</span>
	</N8nTooltip>
</template>

<style lang="scss" module>
.label {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-height: var(--height--sm);
	padding: 0 var(--spacing--2xs);
	margin-left: calc(-1 * var(--spacing--2xs));
	border-radius: var(--radius--sm);
	cursor: default;

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: -2px;
	}
}

.text {
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	color: var(--color--text);
}

.icon {
	flex: none;
}
</style>
