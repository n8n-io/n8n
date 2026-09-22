<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nIconButton,
	N8nMarkdownEditor,
	N8nText,
} from '@n8n/design-system';
import { SUB_AGENT_USE_WHEN_MAX_LENGTH } from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { useUIStore } from '@/app/stores/ui.store';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import type {
	AgentConnectionItem,
	ToolConnectionItem,
} from '@/features/shared/toolsConnection/types';
import AgentModalMultiStep from './modals/AgentModalMultiStep.vue';

export type AgentSubAgentOption = {
	id: string;
	name: string;
	added?: boolean;
	useWhen?: string;
	invalidReasons?: string[];
	agentHref?: string;
};

type AgentSubAgentsModalConfirmPayload = { agentId: string; useWhen?: string };

type AddSubAgentModalData = {
	agents: AgentSubAgentOption[];
	selectedAgent?: never;
	onCreateAgent?: () => void;
	onConfirm: (payload: AgentSubAgentsModalConfirmPayload) => void;
	onRemove?: (agentId: string) => void;
};

type EditSubAgentModalData = {
	selectedAgent: AgentSubAgentOption;
	agentHref?: string;
	useWhen?: string;
	/** Reasons this sub-agent is flagged invalid — same strings as the capability chip's tooltip. */
	invalidReasons?: string[];
	onConfirm: (payload: AgentSubAgentsModalConfirmPayload) => void;
	onRemove?: (agentId: string) => void;
};

export type AgentSubAgentsModalData = AddSubAgentModalData | EditSubAgentModalData;

const props = defineProps<{
	modalName: string;
	data: AgentSubAgentsModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const availableAgents = computed(() => ('agents' in props.data ? props.data.agents : []));
const pickerItems = computed<AgentConnectionItem[]>(() =>
	availableAgents.value.map((agent) => ({
		id: `agent:${agent.id}`,
		kind: 'agent',
		agentId: agent.id,
		title: agent.name,
		status: agent.added ? 'connected' : 'none',
		category: 'agents',
	})),
);
const isEditing = computed(() => Boolean(props.data.selectedAgent));
const selectedAgent = ref<AgentSubAgentOption | null>(props.data.selectedAgent ?? null);
const selectedAgentIsAdded = computed(() => isEditing.value || Boolean(selectedAgent.value?.added));
const invalidReasons = computed(() => {
	if ('invalidReasons' in props.data) return props.data.invalidReasons ?? [];
	return selectedAgent.value?.invalidReasons ?? [];
});
const selectedAgentHref = computed(() => {
	if ('agentHref' in props.data) return props.data.agentHref;
	return selectedAgent.value?.agentHref;
});
const useWhen = ref(('useWhen' in props.data ? props.data.useWhen : '') ?? '');
const useWhenTrimmed = computed(() => useWhen.value.trim());
const useWhenError = computed(() => {
	if (useWhenTrimmed.value.length <= SUB_AGENT_USE_WHEN_MAX_LENGTH) return '';
	return i18n.baseText('agents.builder.subAgents.useWhen.validation.maxLength', {
		interpolate: { max: String(SUB_AGENT_USE_WHEN_MAX_LENGTH) },
	});
});
const canConfirm = computed(() => !useWhenError.value);
const currentStep = computed(() => (selectedAgent.value ? 'configure' : 'select'));
const title = computed(
	() => selectedAgent.value?.name ?? i18n.baseText('agents.builder.subAgents.modal.title'),
);

function closeModal() {
	uiStore.closeModal(props.modalName);
}

function onSelectAgent(agent: AgentSubAgentOption) {
	selectedAgent.value = agent;
	useWhen.value = agent.useWhen ?? '';
}

function onPickerItemActivate(item: ToolConnectionItem) {
	if (item.kind !== 'agent') return;
	const agent = availableAgents.value.find((candidate) => candidate.id === item.agentId);
	if (agent) onSelectAgent(agent);
}

function onCreateAgent() {
	if (!('onCreateAgent' in props.data) || !props.data.onCreateAgent) return;
	closeModal();
	props.data.onCreateAgent();
}

function onBack() {
	if (isEditing.value) return;
	selectedAgent.value = null;
	useWhen.value = '';
}

function onRemove() {
	if (!selectedAgent.value) return;
	props.data.onRemove?.(selectedAgent.value.id);
	closeModal();
}

function onConfirm() {
	if (!selectedAgent.value || !canConfirm.value) return;

	props.data.onConfirm({
		agentId: selectedAgent.value.id,
		...(useWhenTrimmed.value ? { useWhen: useWhenTrimmed.value } : {}),
	});
	closeModal();
}
</script>

<template>
	<AgentModalMultiStep
		:open="modalOpen"
		:step="currentStep"
		:title="title"
		:show-back="Boolean(selectedAgent) && !isEditing"
		:show-footer="Boolean(selectedAgent)"
		data-testid="agent-sub-agents-modal"
		@update:open="!$event && closeModal()"
		@back="onBack"
	>
		<template #headerActions>
			<N8nIconButton
				v-if="selectedAgent && selectedAgentHref"
				icon="external-link"
				variant="ghost"
				size="small"
				:href="selectedAgentHref"
				target="_blank"
				rel="noopener noreferrer"
				:title="i18n.baseText('agents.builder.subAgents.open')"
				:aria-label="i18n.baseText('agents.builder.subAgents.open')"
				data-testid="agent-sub-agents-modal-open"
			/>
		</template>

		<ToolsConnectionModal
			v-show="!selectedAgent"
			:open="modalOpen"
			:items="pickerItems"
			:categories="['agents']"
			:detail-item="null"
			:search-placeholder="i18n.baseText('agents.builder.subAgents.modal.search.placeholder')"
			:empty-message="i18n.baseText('agents.builder.subAgents.modal.empty.title')"
			:no-results-message="i18n.baseText('agents.builder.subAgents.modal.noResults.title')"
			:create-action="
				'onCreateAgent' in data && data.onCreateAgent
					? {
							category: 'agents',
							label: i18n.baseText('projects.header.create.agent'),
							description: i18n.baseText('projectRoles.agent:create.tooltip'),
							testId: 'agent-sub-agents-modal-create',
						}
					: undefined
			"
			:connect-label="() => i18n.baseText('agents.builder.subAgents.modal.add')"
			:connect-aria-label="
				(item) =>
					i18n.baseText('agents.builder.subAgents.modal.addAriaLabel' as BaseTextKey, {
						interpolate: { name: item.title },
					})
			"
			:connected-label="() => i18n.baseText('agents.builder.subAgents.modal.added' as BaseTextKey)"
			embedded
			show-connect-actions
			persistent-scrollbar
			@connect="onPickerItemActivate"
			@open-detail="onPickerItemActivate"
			@create="onCreateAgent"
		/>

		<div v-if="selectedAgent" :class="[$style.content, $style.configureContent]">
			<N8nCallout
				v-if="invalidReasons.length > 0"
				theme="danger"
				data-testid="agent-sub-agents-modal-invalid-callout"
			>
				<div v-for="reason in invalidReasons" :key="reason">{{ reason }}</div>
			</N8nCallout>
			<div :class="$style.field">
				<label :class="$style.label">
					<N8nText size="small" :bold="true">
						{{ i18n.baseText('agents.builder.subAgents.useWhen.label') }}
					</N8nText>
				</label>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.subAgents.useWhen.hint') }}
				</N8nText>
				<N8nMarkdownEditor
					:class="$style.useWhenEditor"
					:model-value="useWhen"
					:placeholder="i18n.baseText('agents.builder.subAgents.useWhen.placeholder')"
					show-toolbar="floating"
					max-height="100%"
					data-testid="agent-sub-agents-modal-use-when"
					@update:model-value="useWhen = $event"
				/>
				<N8nText v-if="useWhenError" size="small" color="danger">
					{{ useWhenError }}
				</N8nText>
				<N8nText size="xsmall" color="text-light">
					{{
						i18n.baseText('agents.builder.subAgents.useWhen.characterCount', {
							interpolate: {
								count: String(useWhen.length),
								max: String(SUB_AGENT_USE_WHEN_MAX_LENGTH),
							},
						})
					}}
				</N8nText>
			</div>
		</div>

		<template v-if="selectedAgent && selectedAgentIsAdded && data.onRemove" #footerLeft>
			<N8nButton variant="ghost" data-testid="agent-sub-agents-modal-remove" @click="onRemove">
				<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
				{{ i18n.baseText('agents.builder.subAgents.modal.remove') }}
			</N8nButton>
		</template>
		<template v-if="selectedAgent" #footerActions>
			<N8nButton variant="solid" data-testid="agent-sub-agents-modal-confirm" @click="onConfirm">
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</template>
	</AgentModalMultiStep>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.configureContent {
	gap: var(--spacing--lg);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	flex: 1;
	min-height: 0;
}

.label {
	display: block;
}

.useWhenEditor {
	height: min(40dvh, calc(var(--height--5xl) * 3));
}
</style>
