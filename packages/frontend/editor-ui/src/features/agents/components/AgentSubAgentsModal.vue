<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	N8nEmptyState,
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nMarkdownEditor,
	N8nScrollArea,
	N8nText,
} from '@n8n/design-system';
import { SUB_AGENT_USE_WHEN_MAX_LENGTH } from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { useUIStore } from '@/app/stores/ui.store';
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
const hasAgents = computed(() => availableAgents.value.length > 0);
const searchQuery = ref('');
const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase());
const filteredAgents = computed(() =>
	normalizedSearchQuery.value
		? availableAgents.value.filter((agent) =>
				agent.name.toLowerCase().includes(normalizedSearchQuery.value),
			)
		: availableAgents.value,
);
const hasMatchingAgents = computed(() => filteredAgents.value.length > 0);
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

		<div v-show="!selectedAgent" :class="$style.content">
			<N8nInput
				v-if="hasAgents"
				v-model="searchQuery"
				:placeholder="i18n.baseText('agents.builder.subAgents.modal.search.placeholder')"
				clearable
				data-testid="agent-sub-agents-modal-search"
			>
				<template #prefix>
					<N8nIcon icon="search" :size="16" />
				</template>
			</N8nInput>

			<N8nScrollArea v-if="hasAgents && hasMatchingAgents" max-height="420px" type="auto">
				<div :class="$style.rows">
					<div
						v-for="agent in filteredAgents"
						:key="agent.id"
						:class="$style.row"
						role="group"
						:aria-label="agent.name"
						data-testid="agent-sub-agents-modal-row"
					>
						<div :class="$style.iconWrapper">
							<N8nIcon icon="bot" :size="24" :class="$style.itemIcon" />
						</div>

						<div :class="$style.rowBody">
							<N8nText size="medium" bold color="text-dark" :class="$style.name">
								{{ agent.name }}
							</N8nText>
						</div>

						<div :class="$style.actions">
							<button
								v-if="agent.added"
								type="button"
								:class="$style.addedTrigger"
								data-testid="agent-sub-agents-modal-added"
								@click="onSelectAgent(agent)"
							>
								<N8nIcon icon="check" :size="14" :class="$style.addedIcon" aria-hidden="true" />
								{{ i18n.baseText('agents.builder.subAgents.modal.added' as BaseTextKey) }}
							</button>
							<N8nButton
								v-else
								variant="subtle"
								size="small"
								:aria-label="
									i18n.baseText('agents.builder.subAgents.modal.addAriaLabel' as BaseTextKey, {
										interpolate: { name: agent.name },
									})
								"
								data-testid="agent-sub-agents-modal-add"
								@click="onSelectAgent(agent)"
							>
								{{ i18n.baseText('agents.builder.subAgents.modal.add') }}
							</N8nButton>
						</div>
					</div>
				</div>
			</N8nScrollArea>

			<N8nEmptyState
				v-else-if="hasAgents && !hasMatchingAgents"
				:icon="{ type: 'icon', value: 'bot' }"
				:heading="i18n.baseText('agents.builder.subAgents.modal.noResults.title')"
				:description="i18n.baseText('agents.builder.subAgents.modal.noResults.description')"
				data-testid="agent-sub-agents-modal-no-results"
			/>

			<N8nEmptyState
				v-else
				:icon="{ type: 'icon', value: 'bot' }"
				:heading="i18n.baseText('agents.builder.subAgents.modal.empty.title')"
				:description="i18n.baseText('agents.builder.subAgents.modal.empty.description')"
				data-testid="agent-sub-agents-modal-empty"
			/>
		</div>

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
@use '@n8n/design-system/css/mixins/focus';

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.configureContent {
	gap: var(--spacing--lg);
}

.rows {
	display: flex;
	flex-direction: column;
	padding-right: var(--spacing--lg);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-shrink: 0;
	padding-block: var(--spacing--sm);
}

.iconWrapper {
	flex-shrink: 0;
	width: var(--spacing--xl);
	display: flex;
	align-items: center;
	justify-content: center;
}

.rowBody {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.name {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: var(--line-height--md);
	max-width: 100%;
}

.itemIcon {
	color: var(--text-color--subtle);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.addedTrigger {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border: 0;
	border-radius: var(--radius--2xs);
	background: none;
	color: var(--color--text--tint-1);
	font-family: inherit;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	white-space: nowrap;
	cursor: pointer;

	&:hover {
		background: var(--color--background--light-1);
	}

	@include focus.focus-visible-ring;
}

.addedIcon {
	flex-shrink: 0;
	color: var(--color--success);
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
