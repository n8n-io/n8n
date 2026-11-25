<script setup lang="ts">
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { approvalName, type ApprovalDestination } from '../utils/approvalDestination';
import AgentApprovalDestinationMenu from './AgentApprovalDestinationMenu.vue';
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';
import type { CustomToolEntry } from '../types';
import { hitlConfigurationUpdates, updateReviewRoute } from '../utils/hitlConfiguration';
import AgentChipRow from './AgentChipRow.vue';
import AgentChipButton from './AgentChipButton.vue';
import AgentItemContextMenu from './AgentItemContextMenu.vue';
import AgentHitlConfigurationModal from './AgentHitlConfigurationModal.vue';

const props = defineProps<{
	config: AgentJsonConfig | null;
	projectId: string;
	agentId: string;
	agentUnsaved?: boolean;
	isPublished?: boolean;
	ensureAgentPersisted?: () => Promise<void>;
	disabled: boolean;
	customTools?: Record<string, CustomToolEntry>;
}>();
const emit = defineEmits<{
	'update:config': [updates: Partial<AgentJsonConfig>];
	'agent-changed': [];
}>();
const i18n = useI18n();
const editing = ref<AgentHitlConfiguration>();
const modalOpen = ref(false);
const configurations = computed(() => props.config?.hitlConfigurations ?? []);
function save(configuration: AgentHitlConfiguration, toolKeys?: string[]) {
	if (props.disabled) return;
	emit('update:config', hitlConfigurationUpdates(props.config, configuration, toolKeys));
	modalOpen.value = false;
}
function add(destination: ApprovalDestination) {
	save({ ...destination, id: generateNanoId() });
}
const context = {
	get agentId() {
		return props.agentUnsaved ? undefined : props.agentId;
	},
	get isPublished() {
		return props.isPublished;
	},
	getConfig: () => props.config,
	getCustomToolName: (id: string) => props.customTools?.[id]?.descriptor.name,
	saveConfiguration: save,
	ensureAgentPersisted: () => props.ensureAgentPersisted?.() ?? Promise.resolve(),
	onChannelsChanged: () => emit('agent-changed'),
};
watch(
	() => props.agentId,
	() => {
		modalOpen.value = false;
		editing.value = undefined;
	},
);
// save() ignores a locked agent, so close the modal instead of discarding edits silently.
watch(
	() => props.disabled,
	(disabled) => {
		if (disabled) modalOpen.value = false;
	},
);

function remove(id = editing.value?.id) {
	if (props.disabled || !id) return;
	const tools = props.config?.tools?.map((tool) => ({
		...tool,
		approvalRoute: updateReviewRoute(tool.approvalRoute, id, false),
	}));
	const mcpServers = props.config?.mcpServers?.map((server) => ({
		...server,
		approvalRoute: updateReviewRoute(server.approvalRoute, id, false),
	}));
	emit('update:config', {
		hitlConfigurations: configurations.value.filter((entry) => entry.id !== id),
		tools,
		mcpServers,
	});
	modalOpen.value = false;
}
</script>

<template>
	<div data-testid="agent-hitl-panel">
		<AgentChipRow
			:label="i18n.baseText('agents.hitl.title')"
			:item-count="configurations.length"
			:add-label="i18n.baseText('agents.hitl.addReview')"
			:show-label="false"
			:disabled="disabled"
		>
			<template #add>
				<AgentApprovalDestinationMenu
					:context="context"
					:project-id="projectId"
					:disabled="disabled"
					:icon-only="configurations.length > 0"
					:label="i18n.baseText('agents.hitl.addReview')"
					test-id="agent-hitl-add"
					@select="add"
				/>
			</template>
			<AgentItemContextMenu
				v-for="configuration in configurations"
				:key="configuration.id"
				:disabled="disabled"
				@remove="remove(configuration.id)"
			>
				<AgentChipButton
					:disabled="disabled"
					:class="$style.configuration"
					:title="approvalName(configuration)"
					:icon="configuration.method === 'workflow' ? 'workflow' : configuration.channel"
					data-testid="agent-hitl-configuration"
					@click="
						editing = configuration;
						modalOpen = true;
					"
				>
					{{ approvalName(configuration) }}
				</AgentChipButton>
			</AgentItemContextMenu>
		</AgentChipRow>
		<AgentHitlConfigurationModal
			v-if="modalOpen && editing"
			:configuration="editing"
			:context="context"
			:project-id="projectId"
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
