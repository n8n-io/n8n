<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';
import AgentPanel from './AgentPanel.vue';
import AgentApprovalRouteSelect from './AgentApprovalRouteSelect.vue';
import AgentHitlConfigurationModal from './AgentHitlConfigurationModal.vue';

const props = defineProps<{
	config: AgentJsonConfig | null;
	projectId: string;
	agentId: string;
	disabled: boolean;
}>();
const emit = defineEmits<{ 'update:config': [updates: Partial<AgentJsonConfig>] }>();
const i18n = useI18n();
const editing = ref<AgentHitlConfiguration>();
const modalOpen = ref(false);
const configurations = computed(() => props.config?.hitlConfigurations ?? []);
function save(configuration: AgentHitlConfiguration) {
	emit('update:config', {
		hitlConfigurations: [
			...configurations.value.filter((entry) => entry.id !== configuration.id),
			configuration,
		],
	});
	modalOpen.value = false;
}
const context = {
	get agentId() {
		return props.agentId;
	},
	getConfig: () => props.config,
	saveConfiguration: save,
};
watch(
	() => props.agentId,
	() => {
		modalOpen.value = false;
		editing.value = undefined;
	},
);

function remove() {
	const id = editing.value?.id;
	const route = props.config?.defaultApprovalRoute;
	const tools = props.config?.tools?.map((tool) =>
		tool.approvalRoute?.type === 'configuration' && tool.approvalRoute.configurationId === id
			? { ...tool, approvalRoute: undefined }
			: tool,
	);
	const mcpServers = props.config?.mcpServers?.map((server) =>
		server.approvalRoute?.type === 'configuration' && server.approvalRoute.configurationId === id
			? { ...server, approvalRoute: undefined }
			: server,
	);
	emit('update:config', {
		hitlConfigurations: configurations.value.filter((entry) => entry.id !== id),
		tools,
		mcpServers,
		...(route?.type === 'configuration' && route.configurationId === id
			? { defaultApprovalRoute: undefined }
			: {}),
	});
	modalOpen.value = false;
}
</script>

<template>
	<div>
		<AgentPanel
			:header="i18n.baseText('agents.hitl.title')"
			:description="i18n.baseText('agents.hitl.description')"
			data-testid="agent-hitl-panel"
		>
			<template #header-actions
				><N8nButton
					type="secondary"
					:disabled="disabled"
					:label="i18n.baseText('agents.hitl.create')"
					@click="
						editing = undefined;
						modalOpen = true;
					"
			/></template>
			<N8nText tag="label">{{ i18n.baseText('agents.hitl.defaultRoute') }}</N8nText>
			<AgentApprovalRouteSelect
				:model-value="config?.defaultApprovalRoute"
				:context="context"
				:project-id="projectId"
				agent-default
				:disabled="disabled"
				@update:model-value="emit('update:config', { defaultApprovalRoute: $event })"
			/>
			<div v-for="configuration in configurations" :key="configuration.id" :class="$style.row">
				<N8nText>{{ configuration.name }}</N8nText>
				<N8nButton
					type="tertiary"
					:disabled="disabled"
					:label="i18n.baseText('agents.hitl.edit')"
					@click="
						editing = configuration;
						modalOpen = true;
					"
				/>
			</div>
		</AgentPanel>
		<AgentHitlConfigurationModal
			v-if="modalOpen"
			:configuration="editing"
			:context="context"
			:project-id="projectId"
			:next-number="configurations.length + 1"
			@save="save"
			@remove="remove"
			@close="modalOpen = false"
		/>
	</div>
</template>

<style module lang="scss">
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}
</style>
