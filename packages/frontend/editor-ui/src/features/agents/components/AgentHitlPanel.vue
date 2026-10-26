<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';
import AgentPanel from './AgentPanel.vue';
import AgentChipRow from './AgentChipRow.vue';
import AgentChipButton from './AgentChipButton.vue';
import AgentItemContextMenu from './AgentItemContextMenu.vue';
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
	if (props.disabled) return;
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

function remove(id = editing.value?.id) {
	if (props.disabled || !id) return;
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
			<AgentChipRow
				:label="i18n.baseText('agents.hitl.title')"
				:item-count="configurations.length"
				:add-label="i18n.baseText('agents.hitl.create')"
				:show-label="false"
				:disabled="disabled"
				add-button-test-id="agent-hitl-add"
				@add="
					editing = undefined;
					modalOpen = true;
				"
			>
				<AgentItemContextMenu
					v-for="configuration in configurations"
					:key="configuration.id"
					:disabled="disabled"
					@remove="remove(configuration.id)"
				>
					<AgentChipButton
						:disabled="disabled"
						:class="$style.configuration"
						:title="configuration.name"
						icon="shield"
						data-testid="agent-hitl-configuration"
						@click="
							editing = configuration;
							modalOpen = true;
						"
					>
						{{ configuration.name }}
					</AgentChipButton>
				</AgentItemContextMenu>
			</AgentChipRow>
		</AgentPanel>
		<AgentHitlConfigurationModal
			v-if="modalOpen"
			:configuration="editing"
			:context="context"
			:project-id="projectId"
			:next-number="configurations.length + 1"
			@save="save"
			@remove="remove()"
			@close="modalOpen = false"
		/>
	</div>
</template>

<style module lang="scss">
.configuration {
	min-width: 0;
	max-width: min(var(--spacing--5xl), 100%);
}
</style>
