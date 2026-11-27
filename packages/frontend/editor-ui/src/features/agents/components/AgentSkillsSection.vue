<script setup lang="ts">
import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { WORKFLOWS_IN_SKILLS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useAgentCapabilityIssueMessages } from '../composables/useAgentCapabilityIssueMessages';
import type { AgentJsonToolRef, AgentSkill } from '../types';
import { findDirectlyAttachedMentions } from '@/features/agents/utils/skillWorkflows';
import AgentChipButton from './AgentChipButton.vue';
import AgentChipRow from './AgentChipRow.vue';
import AgentItemContextMenu from './AgentItemContextMenu.vue';

const props = withDefaults(
	defineProps<{
		/** In ref order. A skill has no on/off toggle: a ref is attached or it is not. */
		skills: Array<{ id: string; skill: AgentSkill }>;
		disabled?: boolean;
		showLabel?: boolean;
		validationIssues?: AgentConfigValidationIssue[];
		outdatedSkillIds?: string[];
		tools?: AgentJsonToolRef[];
	}>(),
	{
		disabled: false,
		showLabel: true,
		validationIssues: () => [],
		outdatedSkillIds: () => [],
		tools: () => [],
	},
);

const emit = defineEmits<{
	'open-skill': [id: string];
	'add-skill': [];
	'remove-skill': [id: string];
}>();

const i18n = useI18n();
const { groupIssueMessages } = useAgentCapabilityIssueMessages(() => props.validationIssues);
const skillIssueMessages = computed(() =>
	groupIssueMessages('skill', (issue) => issue.capability.id),
);
const outdatedSkillIds = computed(() => new Set(props.outdatedSkillIds));
const outdatedWarning = computed(() => [i18n.baseText('agents.builder.skills.outdated.warning')]);
const posthogStore = usePostHog();
const alreadyAttachedNotes = computed(() => {
	const notes = new Map<string, string>();
	if (
		!posthogStore.isVariantEnabled(
			WORKFLOWS_IN_SKILLS_EXPERIMENT.name,
			WORKFLOWS_IN_SKILLS_EXPERIMENT.variant,
		)
	)
		return notes;
	for (const { id, skill } of props.skills) {
		const attached = findDirectlyAttachedMentions(skill, props.tools);
		if (attached.length === 0) continue;
		notes.set(
			id,
			i18n.baseText('agents.builder.skills.workflowsAlreadyAttached', {
				interpolate: {
					workflows: attached.map(({ name, workflowId }) => name || workflowId).join(', '),
				},
				adjustToNumber: attached.length,
			}),
		);
	}
	return notes;
});
</script>

<template>
	<AgentChipRow
		:label="i18n.baseText('agents.builder.skills.title')"
		:item-count="skills.length"
		:add-label="i18n.baseText('agents.builder.skills.add')"
		add-button-test-id="agent-capabilities-add-skill"
		:disabled="props.disabled"
		:show-label="props.showLabel"
		@add="emit('add-skill')"
	>
		<div v-for="{ id, skill } in skills" :key="id" :class="$style.chipGroup">
			<N8nTooltip :disabled="!alreadyAttachedNotes.has(id)" placement="bottom" as-child>
				<AgentItemContextMenu :disabled="props.disabled" @remove="emit('remove-skill', id)">
					<AgentChipButton
						icon="book-open"
						:invalid="(skillIssueMessages.get(id) ?? []).length > 0"
						:invalid-reasons="skillIssueMessages.get(id) ?? []"
						:warning="outdatedSkillIds.has(id)"
						:warning-reasons="outdatedSkillIds.has(id) ? outdatedWarning : []"
						:disabled="props.disabled"
						:class="$style.skillChip"
						data-testid="agent-capabilities-skill-row"
						@click="emit('open-skill', id)"
					>
						{{ skill.name || id }}
					</AgentChipButton>
				</AgentItemContextMenu>
				<template #content>{{ alreadyAttachedNotes.get(id) }}</template>
			</N8nTooltip>
		</div>
	</AgentChipRow>
</template>

<style module lang="scss">
.chipGroup {
	display: inline-flex;
	align-items: center;
	flex-wrap: nowrap;
	gap: var(--spacing--3xs);
	min-width: 0;
	max-width: min(var(--spacing--5xl), 100%);

	> .skillChip {
		width: 100%;
	}
}
</style>
