<script setup lang="ts">
import { N8nLink, N8nStatusDot, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { VIEWS } from '@/app/constants';

import { SELF_HEALING_SETTINGS_HASH } from '../selfHealing.constants';
import { useSelfHealingStore } from '../selfHealing.store';

/**
 * Read-only value cell of the "Self-healing" row in the workflow settings
 * modal. Self-healing is configured per project, so the row only reports the
 * state and links to the project settings section.
 */
const props = defineProps<{
	workflowId: string;
	projectId?: string | null;
}>();

const i18n = useI18n();
const store = useSelfHealingStore();

const status = computed(() => store.getWorkflowStatus(props.workflowId, props.projectId));

const summary = computed(() => {
	if (status.value.enrolled) {
		const autonomy = i18n.baseText(`selfHealing.autonomy.${status.value.config.autonomy}.label`);
		return [i18n.baseText('selfHealing.workflowSettings.on'), status.value.config.name, autonomy];
	}

	const off = i18n.baseText('selfHealing.workflowSettings.off');
	const config = status.value.config;
	if (!config) return [off];
	return [
		off,
		config.status === 'paused'
			? i18n.baseText('selfHealing.workflowSettings.paused', {
					interpolate: { config: config.name },
				})
			: i18n.baseText('selfHealing.workflowSettings.excluded', {
					interpolate: { config: config.name },
				}),
	];
});

const projectSettingsRoute = computed(() =>
	props.projectId
		? {
				name: VIEWS.PROJECT_SETTINGS,
				params: { projectId: props.projectId },
				hash: SELF_HEALING_SETTINGS_HASH,
			}
		: null,
);
</script>

<template>
	<div :class="$style.value" data-test-id="workflow-settings-self-healing-value">
		<div :class="$style.status">
			<N8nStatusDot v-if="status.enrolled" variant="success" />
			<N8nText size="small" :color="status.enrolled ? 'text-dark' : 'text-light'">
				<template v-for="(part, index) in summary" :key="index">
					<span v-if="index > 0" aria-hidden="true" :class="$style.separator">·</span>
					<span>{{ part }}</span>
				</template>
			</N8nText>
		</div>
		<N8nLink
			v-if="projectSettingsRoute"
			:to="projectSettingsRoute"
			size="small"
			data-test-id="workflow-settings-self-healing-manage"
		>
			{{ i18n.baseText('selfHealing.workflowSettings.manage') }}
		</N8nLink>
	</div>
</template>

<style lang="scss" module>
.value {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding-top: var(--spacing--3xs);
}

.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.separator {
	margin-inline: var(--spacing--3xs);
	color: var(--color--text--tint-1);
}
</style>
