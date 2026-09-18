<script setup lang="ts">
/**
 * Opt-in approval for a channel's actions.
 *
 * The toggle is the whole control for a builder who does not want to think
 * about individual actions: turning it on pre-selects the actions that reach
 * outside the conversation the agent was addressed in. The selector below it is
 * there to narrow or widen that.
 */
import { computed, ref, watch } from 'vue';
import { N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { AgentApproval, ChatIntegrationApprovableAction } from '@n8n/api-types';

import AgentApprovalSelector from './AgentApprovalSelector.vue';

/**
 * The catalog names actions, so a new action appears here without a label. It
 * falls back to its raw name rather than to a missing-key placeholder.
 */
const ACTION_LABEL_KEYS = {
	respond: 'agents.channels.approval.action.respond',
	do_not_respond: 'agents.channels.approval.action.do_not_respond',
	send_dm: 'agents.channels.approval.action.send_dm',
	send_channel_message: 'agents.channels.approval.action.send_channel_message',
	edit_message: 'agents.channels.approval.action.edit_message',
	add_reaction: 'agents.channels.approval.action.add_reaction',
	create_issue: 'agents.channels.approval.action.create_issue',
	update_issue: 'agents.channels.approval.action.update_issue',
	create_comment: 'agents.channels.approval.action.create_comment',
} as const satisfies Record<string, BaseTextKey>;

const props = defineProps<{
	modelValue?: AgentApproval;
	actions: ChatIntegrationApprovableAction[];
}>();

const emit = defineEmits<{
	'update:modelValue': [value: AgentApproval | undefined];
	'update:valid': [valid: boolean];
}>();

const i18n = useI18n();

const enabled = ref(props.modelValue !== undefined);

// Judged here rather than taken from the selector: the selector unmounts when
// the toggle goes off, and a cleared list must not keep Save disabled after that.
const isValid = computed(
	() =>
		!enabled.value || props.modelValue?.mode !== 'selected' || props.modelValue.tools.length > 0,
);
watch(isValid, (valid) => emit('update:valid', valid), { immediate: true });

const options = computed(() =>
	props.actions.map((action) => {
		const labelKey: BaseTextKey | undefined =
			ACTION_LABEL_KEYS[action.name as keyof typeof ACTION_LABEL_KEYS];
		return {
			label: labelKey ? i18n.baseText(labelKey) : action.name,
			value: action.name,
		};
	}),
);

const defaultApproval = computed<AgentApproval>(() => {
	const sensitive = props.actions.filter((action) => action.sensitive).map(({ name }) => name);
	return sensitive.length > 0 ? { mode: 'selected', tools: sensitive } : { mode: 'global' };
});

watch(
	() => props.modelValue,
	(approval) => {
		enabled.value = approval !== undefined;
	},
);

function handleToggle(value: boolean) {
	enabled.value = value;
	emit('update:modelValue', value ? defaultApproval.value : undefined);
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.toggleRow">
			<N8nSwitch2
				:model-value="enabled"
				:label="i18n.baseText('agents.channels.approval.label')"
				data-test-id="agent-channel-approval-toggle"
				@update:model-value="handleToggle"
			/>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.channels.approval.hint') }}
			</N8nText>
		</div>

		<AgentApprovalSelector
			v-if="enabled"
			:model-value="props.modelValue"
			:options="options"
			:label="i18n.baseText('agents.channels.approval.actions.label')"
			:hint="i18n.baseText('agents.channels.approval.actions.hint')"
			:placeholder="i18n.baseText('agents.channels.approval.actions.placeholder')"
			test-id-prefix="agent-channel-approval"
			@update:model-value="emit('update:modelValue', $event)"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.toggleRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--2xs);
}
</style>
