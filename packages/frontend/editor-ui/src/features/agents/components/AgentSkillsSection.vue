<script setup lang="ts">
import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useAgentCapabilityIssueMessages } from '../composables/useAgentCapabilityIssueMessages';
import type { AgentSkill } from '../types';
import AgentChipButton from './AgentChipButton.vue';
import AgentChipRow from './AgentChipRow.vue';

const props = withDefaults(
	defineProps<{
		skills: Array<{ id: string; skill: AgentSkill }>;
		disabled?: boolean;
		showLabel?: boolean;
		validationIssues?: AgentConfigValidationIssue[];
	}>(),
	{
		disabled: false,
		showLabel: true,
		validationIssues: () => [],
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
			<AgentChipButton
				icon="book-open"
				:invalid="(skillIssueMessages.get(id) ?? []).length > 0"
				:invalid-reasons="skillIssueMessages.get(id) ?? []"
				:disabled="props.disabled"
				:class="$style.skillChip"
				data-testid="agent-capabilities-skill-row"
				@click="emit('open-skill', id)"
			>
				{{ skill.name || id }}
			</AgentChipButton>
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
