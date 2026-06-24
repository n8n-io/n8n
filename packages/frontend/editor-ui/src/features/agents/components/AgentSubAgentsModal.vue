<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	N8nActionBox,
	N8nButton,
	N8nIcon,
	N8nHeading,
	N8nInput,
	N8nMarkdownEditor,
	N8nScrollArea,
	N8nText,
} from '@n8n/design-system';
import { SUB_AGENT_USE_WHEN_MAX_LENGTH } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';

export type AgentSubAgentOption = {
	id: string;
	name: string;
};

type AgentSubAgentsModalConfirmPayload = { agentId: string; useWhen?: string };

type AddSubAgentModalData = {
	agents: AgentSubAgentOption[];
	selectedAgent?: never;
	onConfirm: (payload: AgentSubAgentsModalConfirmPayload) => void;
	onRemove?: never;
};

type EditSubAgentModalData = {
	selectedAgent: AgentSubAgentOption;
	useWhen?: string;
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
const useWhen = ref(('useWhen' in props.data ? props.data.useWhen : '') ?? '');
const useWhenTrimmed = computed(() => useWhen.value.trim());
const useWhenError = computed(() => {
	if (useWhenTrimmed.value.length <= SUB_AGENT_USE_WHEN_MAX_LENGTH) return '';
	return i18n.baseText('agents.builder.subAgents.useWhen.validation.maxLength', {
		interpolate: { max: String(SUB_AGENT_USE_WHEN_MAX_LENGTH) },
	});
});
const canConfirm = computed(() => !useWhenError.value);

function closeModal() {
	uiStore.closeModal(props.modalName);
}

function onSelectAgent(agent: AgentSubAgentOption) {
	selectedAgent.value = agent;
	useWhen.value = '';
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
	<Modal
		:name="props.modalName"
		width="640px"
		:custom-class="$style.modal"
		data-testid="agent-sub-agents-modal"
	>
		<template #header>
			<N8nHeading tag="h2" size="large">
				{{
					selectedAgent ? selectedAgent.name : i18n.baseText('agents.builder.subAgents.modal.title')
				}}
			</N8nHeading>
		</template>

		<template #content>
			<div v-if="!selectedAgent" :class="$style.content">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.subAgents.modal.description') }}
				</N8nText>

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
							data-testid="agent-sub-agents-modal-row"
						>
							<div :class="$style.iconWrapper">
								<N8nIcon icon="bot" :size="24" :class="$style.itemIcon" />
							</div>

							<div :class="$style.rowBody">
								<N8nText size="small" color="text-dark" :class="$style.name">
									{{ agent.name }}
								</N8nText>
							</div>

							<div :class="$style.actions">
								<N8nButton
									variant="subtle"
									size="small"
									data-testid="agent-sub-agents-modal-add"
									@click="onSelectAgent(agent)"
								>
									{{ i18n.baseText('agents.builder.subAgents.modal.add') }}
								</N8nButton>
							</div>
						</div>
					</div>
				</N8nScrollArea>

				<N8nActionBox
					v-else-if="hasAgents && !hasMatchingAgents"
					:icon="{ type: 'icon', value: 'bot' }"
					:heading="i18n.baseText('agents.builder.subAgents.modal.noResults.title')"
					:description="i18n.baseText('agents.builder.subAgents.modal.noResults.description')"
					data-testid="agent-sub-agents-modal-no-results"
				/>

				<N8nActionBox
					v-else
					:icon="{ type: 'icon', value: 'bot' }"
					:heading="i18n.baseText('agents.builder.subAgents.modal.empty.title')"
					:description="i18n.baseText('agents.builder.subAgents.modal.empty.description')"
					data-testid="agent-sub-agents-modal-empty"
				/>
			</div>

			<div v-else :class="[$style.content, $style.configureContent]">
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
		</template>

		<template v-if="selectedAgent" #footer>
			<div :class="$style.footer">
				<N8nButton
					v-if="isEditing && data.onRemove"
					variant="subtle"
					data-testid="agent-sub-agents-modal-remove"
					@click="onRemove"
				>
					{{ i18n.baseText('agents.builder.subAgents.modal.remove') }}
				</N8nButton>
				<N8nButton
					v-else
					variant="subtle"
					data-testid="agent-sub-agents-modal-back"
					@click="onBack"
				>
					{{ i18n.baseText('generic.back') }}
				</N8nButton>
				<div :class="$style.footerActions">
					<N8nButton variant="subtle" @click="closeModal">
						{{ i18n.baseText('generic.cancel') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						:disabled="!canConfirm"
						data-testid="agent-sub-agents-modal-confirm"
						@click="onConfirm"
					>
						{{ i18n.baseText(isEditing ? 'generic.save' : 'agents.builder.subAgents.modal.add') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.modal {
	:global(.modal-content) {
		overflow: hidden;
	}
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	margin: calc(-1 * var(--spacing--lg));
	padding: var(--spacing--lg);
}

.configureContent {
	min-height: 460px;
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
	width: 32px;
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
	height: 300px;
}

.footer {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.footerActions {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
