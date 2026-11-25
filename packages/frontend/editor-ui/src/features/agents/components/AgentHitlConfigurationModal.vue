<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { N8nButton, N8nIcon, N8nSelect2, N8nSettingsRowGroup } from '@n8n/design-system';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useI18n } from '@n8n/i18n';
import type { AgentHitlConfiguration } from '@n8n/api-types';
import type { AgentHitlContext } from './agent-hitl.types';
import { approvalName, type ApprovalDestination } from '../utils/approvalDestination';
import { hitlConfigurationToolKeys, hitlToolKeys } from '../utils/hitlConfiguration';
import AgentApprovalDestinationMenu from './AgentApprovalDestinationMenu.vue';
import AgentFormSettingRow from './AgentFormSettingRow.vue';
import AgentHitlToolsSelect from './AgentHitlToolsSelect.vue';
import AgentModal from './modals/AgentModal.vue';

const props = defineProps<{
	projectId: string;
	context: AgentHitlContext;
	configuration: AgentHitlConfiguration;
	hideRemove?: boolean;
}>();
const emit = defineEmits<{
	save: [configuration: AgentHitlConfiguration, toolKeys?: string[]];
	close: [];
	remove: [];
}>();
const i18n = useI18n();
const workflowList = useWorkflowsListStore();
const destination = ref<ApprovalDestination>({
	...props.configuration,
	name:
		props.configuration.method === 'channel'
			? (props.configuration.recipient.name ?? props.configuration.recipient.id)
			: approvalName(props.configuration),
});
const customName = ref(props.configuration.nameOverridden ? props.configuration.name : '');
const name = computed({
	get: () => customName.value.trim() || destination.value.name,
	set: (value: string) => {
		customName.value = value;
	},
});
const expiry = ref(props.configuration.expirySeconds);
const expiryOptions = [
	{ value: 'none', label: i18n.baseText('agents.hitl.expiry.none') },
	{ value: '3600', label: i18n.baseText('agents.hitl.expiry.hour') },
	{ value: '86400', label: i18n.baseText('agents.hitl.expiry.day') },
	{ value: '604800', label: i18n.baseText('agents.hitl.expiry.week') },
];
const toolKeys = ref(hitlConfigurationToolKeys(props.context.getConfig(), props.configuration.id));
const toolsChanged = ref(false);
const hasTools = computed(() => hitlToolKeys(props.context.getConfig()).length > 0);

onMounted(async () => {
	const selected = destination.value;
	if (selected.method !== 'workflow' || !props.configuration.nameOverridden) return;
	try {
		const [workflow] = await workflowList.searchWorkflows({
			projectId: props.projectId,
			ids: [selected.workflowId],
			select: ['id', 'name'],
		});
		if (workflow && destination.value === selected) selected.name = workflow.name;
	} catch {
		// Keep the saved label if the workflow is unavailable.
	}
});

function updateExpiry(value: unknown) {
	const seconds = Number(value);
	if (value === 'none') expiry.value = undefined;
	else if (seconds === 3600 || seconds === 86400 || seconds === 604800) expiry.value = seconds;
}
function save() {
	emit(
		'save',
		{
			...destination.value,
			id: props.configuration.id,
			name: name.value.trim(),
			nameOverridden: Boolean(customName.value.trim()),
			expirySeconds: expiry.value,
		},
		toolsChanged.value ? toolKeys.value : undefined,
	);
}
</script>

<template>
	<AgentModal :open="true" v-model:title="name" editable-title stacked @update:open="emit('close')">
		<div :class="$style.fields">
			<N8nSettingsRowGroup :class="$style.group">
				<AgentFormSettingRow
					layout="vertical"
					:class="$style.row"
					:title="i18n.baseText('agents.hitl.mcpRoute')"
					:description="i18n.baseText('agents.hitl.destinationHint')"
				>
					<AgentApprovalDestinationMenu
						:context="context"
						:project-id="projectId"
						:label="i18n.baseText('agents.hitl.mcpRoute')"
						@select="destination = $event"
					>
						<template #trigger>
							<button
								type="button"
								:class="$style.destinationTrigger"
								data-testid="agent-hitl-destination"
							>
								<N8nIcon
									:icon="destination.method === 'workflow' ? 'workflow' : destination.channel"
									aria-hidden="true"
								/>
								<span :class="$style.destinationName">{{ destination.name }}</span>
								<N8nIcon
									icon="chevron-down"
									:class="$style.destinationChevron"
									aria-hidden="true"
								/>
							</button>
						</template>
					</AgentApprovalDestinationMenu>
				</AgentFormSettingRow>
			</N8nSettingsRowGroup>
			<N8nSettingsRowGroup :class="$style.group">
				<div v-if="hasTools" :class="$style.row">
					<AgentHitlToolsSelect
						embedded
						:model-value="toolKeys"
						:config="context.getConfig()"
						:get-custom-tool-name="context.getCustomToolName"
						@update:model-value="
							toolKeys = $event;
							toolsChanged = true;
						"
					/>
				</div>
				<AgentFormSettingRow :class="$style.row" :title="i18n.baseText('agents.hitl.expiry')">
					<N8nSelect2
						:model-value="String(expiry ?? 'none')"
						:items="expiryOptions"
						:teleported="false"
						:aria-label="i18n.baseText('agents.hitl.expiry')"
						data-testid="agent-hitl-expiry"
						@update:model-value="updateExpiry"
					/>
				</AgentFormSettingRow>
			</N8nSettingsRowGroup>
		</div>
		<template v-if="!hideRemove" #footerLeft>
			<N8nButton
				variant="ghost"
				icon="trash-2"
				data-testid="agent-hitl-remove"
				@click="emit('remove')"
			>
				{{ i18n.baseText('agents.builder.tools.remove') }}
			</N8nButton>
		</template>
		<template #footerActions>
			<N8nButton
				:label="i18n.baseText('agents.hitl.save')"
				data-testid="agent-hitl-save"
				@click="save"
			/>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/focus';
@use '@n8n/design-system/css/mixins/input';
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.group {
	overflow: visible;
	background: transparent;
}
.row {
	padding: var(--spacing--sm) var(--spacing--md);
}
.group > * + * {
	border-top: var(--border);
}
.destinationTrigger {
	@include input.size-variables('small');
	@include input.theme-variables();
	@include focus.focus-visible-ring;

	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: 100%;
	min-height: var(--input--height);
	padding: 0 var(--input--padding);
	border: var(--border);
	border-color: var(--input--border-color);
	border-radius: var(--input--radius);
	background-color: var(--input--color--background);
	color: var(--input--color--text);
	font-size: var(--input--font-size);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--md);
	cursor: pointer;

	&:hover:not(:focus-visible) {
		border-color: var(--input--border-color--hover);
	}

	&:focus-visible {
		border-color: var(--input--border-color--focus);
	}

	> svg {
		flex-shrink: 0;
	}
}
.destinationName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.destinationChevron {
	margin-inline-start: auto;
}
</style>
