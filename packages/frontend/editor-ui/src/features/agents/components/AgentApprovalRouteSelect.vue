<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nCombobox2, N8nInputLabel, type ComboboxItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentApprovalRoute, AgentHitlConfiguration } from '@n8n/api-types';
import type { AgentHitlContext } from './agent-hitl.types';
import AgentHitlConfigurationModal from './AgentHitlConfigurationModal.vue';

const props = defineProps<{
	modelValue?: AgentApprovalRoute;
	context: AgentHitlContext;
	projectId: string;
	disabled?: boolean;
	label?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: AgentApprovalRoute | undefined] }>();
const i18n = useI18n();
const label = computed(() => props.label ?? i18n.baseText('agents.hitl.route'));
const creating = ref(false);
const open = ref(false);
const configurations = computed(() => props.context.getConfig()?.hitlConfigurations ?? []);
const items = computed<ComboboxItem[]>(() => [
	{
		value: 'create',
		label: i18n.baseText('agents.hitl.create'),
		icon: 'plus',
		onSelect: (event: Event) => {
			event.preventDefault();
			open.value = false;
			creating.value = true;
		},
	},
	{ type: 'separator' },
	{ value: 'default', label: i18n.baseText('agents.hitl.useDefault'), icon: 'user' },
	...configurations.value.map((configuration) => ({
		value: configuration.id,
		label: i18n.baseText(
			configuration.disallowRequesterApproval
				? 'agents.hitl.route.only'
				: 'agents.hitl.route.userOr',
			{ interpolate: { name: configuration.name } },
		),
		icon: configuration.method === 'workflow' ? ('workflow' as const) : configuration.channel,
	})),
]);
const selected = computed(() =>
	props.modelValue?.type === 'configuration' ? props.modelValue.configurationId : 'default',
);
function select(value: unknown) {
	if (typeof value !== 'string') return;
	emit(
		'update:modelValue',
		value === 'default' ? undefined : { type: 'configuration', configurationId: value },
	);
}
function save(configuration: AgentHitlConfiguration, toolKeys?: string[]) {
	props.context.saveConfiguration(configuration, toolKeys);
	emit('update:modelValue', { type: 'configuration', configurationId: configuration.id });
	creating.value = false;
}
</script>

<template>
	<div>
		<N8nInputLabel :label="label">
			<N8nCombobox2
				v-model:open="open"
				:model-value="selected"
				:items="items"
				:disabled="disabled"
				:teleported="false"
				size="large"
				:aria-label="label"
				data-testid="agent-approval-route"
				@update:model-value="select"
			/>
		</N8nInputLabel>
		<AgentHitlConfigurationModal
			v-if="creating"
			:context="context"
			:project-id="projectId"
			:next-number="configurations.length + 1"
			@save="save"
			@close="creating = false"
		/>
	</div>
</template>
