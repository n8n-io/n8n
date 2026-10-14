<script setup lang="ts">
import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useAgentCapabilityIssueMessages } from '../composables/useAgentCapabilityIssueMessages';
import type { AgentSkill } from '../types';
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
	}>(),
	{
		disabled: false,
		showLabel: true,
		validationIssues: () => [],
		outdatedSkillIds: () => [],
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
const toast = useToast();

/**
 * An outdated skill cannot be edited: the hub refuses a save based on an older version.
 * Tell the user to remove the skill and add it again instead of opening the editor.
 */
function onOpenSkill(id: string) {
	if (outdatedSkillIds.value.has(id)) {
		toast.showMessage({
			type: 'warning',
			title: i18n.baseText('agents.builder.skills.outdated.title'),
			message: i18n.baseText('agents.builder.skills.outdated.warning'),
		});
		return;
	}
	emit('open-skill', id);
}
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
					@click="onOpenSkill(id)"
				>
					{{ skill.name || id }}
				</AgentChipButton>
			</AgentItemContextMenu>
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
