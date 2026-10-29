<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nInputLabel, N8nOption, N8nSelect } from '@n8n/design-system';
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
const configurations = computed(() => props.context.getConfig()?.hitlConfigurations ?? []);
const selected = computed(() =>
	props.modelValue?.type === 'configuration' ? props.modelValue.configurationId : 'default',
);
function select(value: string) {
	if (value === 'create') {
		creating.value = true;
		return;
	}
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
			<N8nSelect
				:model-value="selected"
				:disabled="disabled"
				:teleported="false"
				:aria-label="label"
				data-testid="agent-approval-route"
				@update:model-value="select"
			>
				<N8nOption value="default" :label="i18n.baseText('agents.hitl.useDefault')" />
				<N8nOption
					v-for="configuration in configurations"
					:key="configuration.id"
					:value="configuration.id"
					:label="configuration.name"
				/>
				<N8nOption value="create" :label="i18n.baseText('agents.hitl.create')" />
			</N8nSelect>
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
