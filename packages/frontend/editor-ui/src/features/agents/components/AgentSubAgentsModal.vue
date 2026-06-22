<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	N8nActionBox,
	N8nButton,
	N8nCard,
	N8nCheckbox,
	N8nHeading,
	N8nScrollArea,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';

export type AgentSubAgentOption = {
	id: string;
	name: string;
	description?: string | null;
};

export type AgentSubAgentsModalData = {
	agents: AgentSubAgentOption[];
	onConfirm: (agentIds: string[]) => void;
};

const props = defineProps<{
	modalName: string;
	data: AgentSubAgentsModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const selectedAgentIds = ref<string[]>([]);

const selectedAgentIdSet = computed(() => new Set(selectedAgentIds.value));
const canAdd = computed(() => selectedAgentIds.value.length > 0);

function closeModal() {
	uiStore.closeModal(props.modalName);
}

function setAgentSelected(agentId: string, selected: boolean) {
	if (selected) {
		if (!selectedAgentIdSet.value.has(agentId)) {
			selectedAgentIds.value = [...selectedAgentIds.value, agentId];
		}
		return;
	}

	selectedAgentIds.value = selectedAgentIds.value.filter((id) => id !== agentId);
}

function toggleAgent(agentId: string) {
	setAgentSelected(agentId, !selectedAgentIdSet.value.has(agentId));
}

function onCheckboxUpdate(agentId: string, value: string | number | boolean) {
	setAgentSelected(agentId, Boolean(value));
}

function onAdd() {
	if (!canAdd.value) return;

	props.data.onConfirm(selectedAgentIds.value);
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
				{{ i18n.baseText('agents.builder.subAgents.modal.title') }}
			</N8nHeading>
		</template>

		<template #content>
			<div :class="$style.content">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.subAgents.modal.description') }}
				</N8nText>

				<N8nScrollArea v-if="data.agents.length > 0" max-height="420px" type="auto">
					<div :class="$style.rows">
						<N8nCard
							v-for="agent in data.agents"
							:key="agent.id"
							:class="[$style.row, selectedAgentIdSet.has(agent.id) ? $style.selectedRow : '']"
							data-testid="agent-sub-agents-modal-row"
							@click="toggleAgent(agent.id)"
						>
							<template #prepend>
								<N8nCheckbox
									:model-value="selectedAgentIdSet.has(agent.id)"
									:aria-label="
										i18n.baseText('agents.builder.subAgents.modal.selectAgent', {
											interpolate: { name: agent.name },
										})
									"
									data-testid="agent-sub-agents-modal-checkbox"
									@click.stop
									@update:model-value="(value) => onCheckboxUpdate(agent.id, value)"
								/>
							</template>

							<div :class="$style.rowBody">
								<N8nText size="small" color="text-dark" :bold="true" :class="$style.name">
									{{ agent.name }}
								</N8nText>
								<N8nText
									v-if="agent.description"
									size="xsmall"
									color="text-light"
									:class="$style.description"
								>
									{{ agent.description }}
								</N8nText>
							</div>
						</N8nCard>
					</div>
				</N8nScrollArea>

				<N8nActionBox
					v-else
					:icon="{ type: 'icon', value: 'bot' }"
					:heading="i18n.baseText('agents.builder.subAgents.modal.empty.title')"
					:description="i18n.baseText('agents.builder.subAgents.modal.empty.description')"
					data-testid="agent-sub-agents-modal-empty"
				/>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="closeModal">
					{{ i18n.baseText('agents.builder.subAgents.modal.cancel') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					:disabled="!canAdd"
					data-testid="agent-sub-agents-modal-add"
					@click="onAdd"
				>
					{{ i18n.baseText('agents.builder.subAgents.modal.add') }}
				</N8nButton>
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

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-right: var(--spacing--xs);
}

.row {
	--card--prepend--width: auto;
	flex-shrink: 0;
	cursor: pointer;
}

.selectedRow {
	border-color: var(--color--primary);
}

.rowBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: 100%;
	min-width: 0;
}

.name {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}

.description {
	display: -webkit-box;
	overflow: hidden;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow-wrap: anywhere;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
