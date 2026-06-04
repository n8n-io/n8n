<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
	N8nCard,
	N8nIcon,
	N8nIconButton,
	N8nInputNumber2,
	N8nScrollArea,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';

import { useProjectAgentsList } from '../composables/useProjectAgentsList';
import type { AgentJsonConfig } from '../types';
import { AGENT_SUB_AGENTS_MODAL_KEY } from '../constants';

const SUB_AGENT_MAX_CHILDREN_MIN = 1;
const SUB_AGENT_MAX_CHILDREN_MAX = 20;
const SUB_AGENT_MAX_CHILDREN_DEFAULT = 5;

const props = defineProps<{
	config: AgentJsonConfig | null;
	disabled: boolean;
	projectId: string;
	agentId: string;
}>();

const emit = defineEmits<{
	'update:config': [updates: Partial<AgentJsonConfig>];
}>();

const i18n = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const { list: projectAgents, ensureLoaded: ensureProjectAgentsLoaded } = useProjectAgentsList(
	computed(() => props.projectId),
);

onMounted(() => {
	void ensureProjectAgentsLoaded().catch(() => {});
});

function resolveMaxChildrenDisplay(value: number | undefined): number {
	return value ?? SUB_AGENT_MAX_CHILDREN_DEFAULT;
}

const maxChildrenModelValue = ref(resolveMaxChildrenDisplay(props.config?.subAgents?.maxChildren));

watch(
	() => props.config?.subAgents?.maxChildren,
	(value) => {
		maxChildrenModelValue.value = resolveMaxChildrenDisplay(value);
	},
);

const selectedSubAgentRefs = computed(() => props.config?.subAgents?.agents ?? []);
const selectedSubAgentIds = computed(() =>
	selectedSubAgentRefs.value.map(({ agentId }) => agentId),
);
const selectedSubAgentIdSet = computed(() => new Set(selectedSubAgentIds.value));
const availableSubAgents = computed(() =>
	(projectAgents.value ?? []).filter(
		(agent) =>
			agent.id !== props.agentId &&
			Boolean(agent.activeVersionId) &&
			!selectedSubAgentIdSet.value.has(agent.id),
	),
);
const selectedSubAgents = computed(() =>
	selectedSubAgentIds.value.map((agentId) => {
		const agent = projectAgents.value?.find((candidate) => candidate.id === agentId);
		return {
			id: agentId,
			name: agent?.name ?? agentId,
			description: agent?.description ?? null,
		};
	}),
);

function emitSubAgentsAgents(agents: typeof selectedSubAgentRefs.value) {
	emit('update:config', {
		subAgents: {
			...(props.config?.subAgents ?? {}),
			agents,
		},
	});
}

function onMaxChildrenChange(n: number) {
	const subAgents = { ...(props.config?.subAgents ?? {}) };
	if (isNaN(n)) {
		delete subAgents.maxChildren;
		maxChildrenModelValue.value = SUB_AGENT_MAX_CHILDREN_DEFAULT;
	} else {
		subAgents.maxChildren = n;
		maxChildrenModelValue.value = n;
	}
	emit('update:config', { subAgents });
}

async function onOpenAddSubAgentsModal() {
	if (props.disabled) return;

	try {
		await ensureProjectAgentsLoaded();
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.subAgents.loadError'));
		return;
	}

	uiStore.openModalWithData({
		name: AGENT_SUB_AGENTS_MODAL_KEY,
		data: {
			agents: availableSubAgents.value.map(({ id, name, description }) => ({
				id,
				name,
				description,
			})),
			onConfirm: (agentIds: string[]) => {
				const newAgentRefs = agentIds
					.filter((agentId) => !selectedSubAgentIdSet.value.has(agentId))
					.map((agentId) => ({ agentId }));

				if (newAgentRefs.length === 0) return;

				emitSubAgentsAgents([...selectedSubAgentRefs.value, ...newAgentRefs]);
			},
		},
	});
}

function onRemoveSubAgent(agentId: string) {
	emitSubAgentsAgents(
		selectedSubAgentRefs.value.filter((subAgent) => subAgent.agentId !== agentId),
	);
}
</script>

<template>
	<div :class="[$style.subAgentsPanel, disabled && $style.disabled]">
		<div :class="$style.subAgentsHeader">
			<div :class="$style.subAgentsText">
				<N8nText tag="h3" :bold="true">
					{{ i18n.baseText('agents.builder.subAgents.title') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.subAgents.description') }}
				</N8nText>
			</div>
			<div :class="$style.subAgentsHeaderActions">
				<N8nTooltip :content="i18n.baseText('agents.builder.subAgents.add')" placement="top">
					<N8nIconButton
						icon="plus"
						variant="ghost"
						size="small"
						icon-size="medium"
						:disabled="disabled"
						:aria-label="i18n.baseText('agents.builder.subAgents.add')"
						data-testid="agent-sub-agents-open-add-modal"
						@click="onOpenAddSubAgentsModal"
					/>
				</N8nTooltip>
			</div>
		</div>

		<div :class="$style.settingRow">
			<div :class="$style.settingLabel">
				<N8nText size="small" :bold="true">
					{{ i18n.baseText('agents.builder.subAgents.maxChildren.label') }}
				</N8nText>
				<N8nText size="xsmall" color="text-light">
					{{ i18n.baseText('agents.builder.subAgents.maxChildren.hint') }}
				</N8nText>
			</div>
			<N8nInputNumber2
				:model-value="maxChildrenModelValue"
				:min="SUB_AGENT_MAX_CHILDREN_MIN"
				:max="SUB_AGENT_MAX_CHILDREN_MAX"
				:precision="0"
				:disabled="disabled"
				:class="$style.shortInput"
				data-testid="agent-sub-agents-max-children-input"
				@update:model-value="onMaxChildrenChange"
			/>
		</div>

		<hr v-if="selectedSubAgentRefs.length > 0" aria-hidden="true" :class="$style.divider" />

		<div v-if="selectedSubAgents.length > 0" :class="$style.subAgentsContent">
			<N8nScrollArea
				max-height="calc((var(--spacing--2xl) + var(--spacing--sm)) * 5)"
				type="auto"
				:class="$style.rows"
			>
				<div :class="$style.rowList">
					<N8nCard
						v-for="subAgent in selectedSubAgents"
						:key="subAgent.id"
						:class="$style.row"
						data-testid="agent-sub-agent-row"
					>
						<template #prepend>
							<N8nIcon icon="bot" size="medium" :class="$style.itemIcon" />
						</template>

						<N8nText size="xsmall" color="text-dark" :bold="true" :class="$style.name">
							{{ subAgent.name }}
						</N8nText>
						<N8nText
							v-if="subAgent.description"
							size="xsmall"
							color="text-light"
							:class="$style.metadata"
						>
							{{ subAgent.description }}
						</N8nText>

						<template #append>
							<N8nTooltip
								:content="
									i18n.baseText('agents.builder.subAgents.remove', {
										interpolate: { name: subAgent.name },
									})
								"
								placement="top"
							>
								<N8nIconButton
									icon="trash-2"
									variant="ghost"
									size="mini"
									icon-size="small"
									:disabled="disabled"
									:aria-label="
										i18n.baseText('agents.builder.subAgents.remove', {
											interpolate: { name: subAgent.name },
										})
									"
									data-testid="agent-sub-agent-remove"
									@click="onRemoveSubAgent(subAgent.id)"
								/>
							</N8nTooltip>
						</template>
					</N8nCard>
				</div>
			</N8nScrollArea>
		</div>
	</div>
</template>

<style lang="scss" module>
.subAgentsPanel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.subAgentsPanel.disabled > :not(.subAgentsHeader) {
	pointer-events: none;
	opacity: 0.6;
}

.subAgentsHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	width: 100%;
}

.subAgentsText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.subAgentsHeaderActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.settingRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: var(--spacing--xl);
	width: 100%;
}

.settingLabel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.shortInput {
	width: 140px;
	flex-shrink: 0;
}

.divider {
	border: none;
	border-top: var(--border);
	margin: var(--spacing--2xs) 0;
}

.subAgentsContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.rowList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-right: var(--spacing--xs);
}

.rows {
	scrollbar-gutter: stable;
}

.row {
	--card--append--width: auto;
	flex-shrink: 0;
}

.itemIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.name,
.metadata {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}
</style>
