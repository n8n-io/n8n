<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
	SUB_AGENT_MAX_CHILDREN_DEFAULT,
	SUB_AGENT_MAX_CHILDREN_MAX,
	SUB_AGENT_MAX_CHILDREN_MIN,
	SUB_AGENT_TASK_DIFFICULTIES,
	type SubAgentTaskDifficulty,
} from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';
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
import { useUsersStore } from '@/features/settings/users/users.store';

import { useAgentModelCredentials } from '../composables/useAgentModelCredentials';
import { useModelCatalog } from '../composables/useModelCatalog';
import { useProjectAgentsList } from '../composables/useProjectAgentsList';
import AgentModelSelector from './AgentModelSelector.vue';
import {
	type AgentCredentialsByProvider,
	type AgentModelOption,
	type AgentModelProvider,
	type AgentModelSelection,
	type AgentModelsByProvider,
	isAgentModelProvider,
} from '../model-providers';
import type { AgentJsonConfig } from '../types';
import { AGENT_SUB_AGENTS_MODAL_KEY } from '../constants';
import { parseModelString, sanitizeModelId } from '../utils/model-string';

const DIFFICULTY_LABEL_KEYS: Record<SubAgentTaskDifficulty, BaseTextKey> = {
	low: 'agents.builder.subAgents.modelsByDifficulty.low.label',
	medium: 'agents.builder.subAgents.modelsByDifficulty.medium.label',
	high: 'agents.builder.subAgents.modelsByDifficulty.high.label',
};

const DIFFICULTY_DESCRIPTION_KEYS: Record<SubAgentTaskDifficulty, BaseTextKey> = {
	low: 'agents.builder.subAgents.modelsByDifficulty.low.description',
	medium: 'agents.builder.subAgents.modelsByDifficulty.medium.description',
	high: 'agents.builder.subAgents.modelsByDifficulty.high.description',
};

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
const usersStore = useUsersStore();
const { list: projectAgents, ensureLoaded: ensureProjectAgentsLoaded } = useProjectAgentsList(
	computed(() => props.projectId),
);
const { ensureLoaded, getModelsForPicker, isLoading } = useModelCatalog();
const projectIdRef = computed(() => props.projectId);
const { credentialsByProvider } = useAgentModelCredentials(
	usersStore.currentUserId ?? 'anonymous',
	projectIdRef,
);
const maxChildrenHintInterpolate = {
	min: String(SUB_AGENT_MAX_CHILDREN_MIN),
	max: String(SUB_AGENT_MAX_CHILDREN_MAX),
};

onMounted(() => {
	void ensureProjectAgentsLoaded().catch(() => {});
});

watch(
	projectIdRef,
	(id) => {
		if (id) void ensureLoaded(id);
	},
	{ immediate: true },
);

const filteredModels = computed<AgentModelsByProvider>(() =>
	getModelsForPicker(credentialsByProvider.value),
);

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

function buildSubAgentsUpdate(
	overrides: Partial<NonNullable<AgentJsonConfig['subAgents']>>,
): Partial<AgentJsonConfig> {
	return {
		subAgents: {
			...(props.config?.subAgents ?? {}),
			...overrides,
		},
	};
}

function emitSubAgentsAgents(agents: typeof selectedSubAgentRefs.value) {
	emit('update:config', buildSubAgentsUpdate({ agents }));
}

function onMaxChildrenChange(n: number) {
	if (props.disabled) return;

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

function credentialsForDifficulty(
	difficulty: SubAgentTaskDifficulty,
): AgentCredentialsByProvider | null {
	const global = credentialsByProvider.value;
	const mapping = props.config?.subAgents?.modelsByDifficulty?.[difficulty];
	if (!mapping?.model) return global;

	const parsed = parseModelString(mapping.model);
	if (!parsed || !isAgentModelProvider(parsed.provider)) return global;

	return {
		...(global ?? {}),
		[parsed.provider]: mapping.credential,
	};
}

function selectedModelForDifficulty(difficulty: SubAgentTaskDifficulty): AgentModelOption | null {
	const mapping = props.config?.subAgents?.modelsByDifficulty?.[difficulty];
	if (!mapping?.model) return null;

	const parsed = parseModelString(mapping.model);
	if (!parsed || !isAgentModelProvider(parsed.provider)) return null;

	const registryEntry = filteredModels.value[parsed.provider]?.models.find(
		(model) => model.model === parsed.name,
	);
	if (registryEntry) return registryEntry;

	return {
		provider: parsed.provider,
		model: parsed.name,
		name: parsed.name,
		description: null,
		createdAt: null,
		metadata: {
			functionCalling: false,
			available: true,
		},
	};
}

function hasDifficultyMapping(difficulty: SubAgentTaskDifficulty): boolean {
	return Boolean(props.config?.subAgents?.modelsByDifficulty?.[difficulty]);
}

function emitModelsByDifficulty(
	difficulty: SubAgentTaskDifficulty,
	mapping: { model: string; credential: string } | undefined,
) {
	const existing = { ...(props.config?.subAgents?.modelsByDifficulty ?? {}) };
	if (mapping) {
		existing[difficulty] = mapping;
	} else {
		delete existing[difficulty];
	}

	const subAgents = { ...(props.config?.subAgents ?? {}) };
	if (Object.keys(existing).length > 0) {
		subAgents.modelsByDifficulty = existing;
	} else {
		delete subAgents.modelsByDifficulty;
	}

	emit('update:config', { subAgents });
}

function onDifficultyModelChange(
	difficulty: SubAgentTaskDifficulty,
	selection: AgentModelSelection,
) {
	if (props.disabled) return;

	const credentialId = credentialsForDifficulty(difficulty)?.[selection.provider];
	if (!credentialId) {
		toast.showError(new Error(i18n.baseText('credentials.noResults')), i18n.baseText('error'));
		return;
	}

	const model = `${selection.provider}/${sanitizeModelId(selection.provider, selection.model)}`;
	emitModelsByDifficulty(difficulty, { model, credential: credentialId });
}

function onDifficultySelectCredential(
	difficulty: SubAgentTaskDifficulty,
	provider: AgentModelProvider,
	credentialId: string | null,
) {
	if (props.disabled) return;

	const mapping = props.config?.subAgents?.modelsByDifficulty?.[difficulty];
	if (!mapping?.model || !credentialId) return;

	const parsed = parseModelString(mapping.model);
	if (parsed?.provider !== provider) return;

	emitModelsByDifficulty(difficulty, { ...mapping, credential: credentialId });
}

function clearDifficultyMapping(difficulty: SubAgentTaskDifficulty) {
	if (props.disabled) return;

	emitModelsByDifficulty(difficulty, undefined);
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
	if (props.disabled) return;

	emitSubAgentsAgents(
		selectedSubAgentRefs.value.filter((subAgent) => subAgent.agentId !== agentId),
	);
}
</script>

<template>
	<div :class="[$style.subAgentsPanel, disabled && $style.disabled]" :aria-disabled="disabled">
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
					{{
						i18n.baseText('agents.builder.subAgents.maxChildren.hint', {
							interpolate: maxChildrenHintInterpolate,
						})
					}}
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

		<div :class="$style.inlineModelsSection" data-testid="agent-sub-agents-inline-models">
			<div :class="$style.inlineModelsIntro">
				<N8nText size="small" :bold="true">
					{{ i18n.baseText('agents.builder.subAgents.modelsByDifficulty.title') }}
				</N8nText>
				<N8nText size="xsmall" color="text-light">
					{{ i18n.baseText('agents.builder.subAgents.modelsByDifficulty.hint') }}
				</N8nText>
			</div>

			<div :class="$style.difficultyRows">
				<div
					v-for="difficulty in SUB_AGENT_TASK_DIFFICULTIES"
					:key="difficulty"
					:class="$style.difficultyRow"
					:data-testid="`agent-sub-agents-difficulty-row-${difficulty}`"
				>
					<div :class="$style.difficultyLabel">
						<N8nText size="small" :bold="true">
							{{ i18n.baseText(DIFFICULTY_LABEL_KEYS[difficulty]) }}
						</N8nText>
						<N8nText size="xsmall" color="text-light">
							{{ i18n.baseText(DIFFICULTY_DESCRIPTION_KEYS[difficulty]) }}
						</N8nText>
					</div>
					<div :class="$style.difficultyControls">
						<AgentModelSelector
							:selected-model="selectedModelForDifficulty(difficulty)"
							:credentials="credentialsForDifficulty(difficulty)"
							:models-by-provider="filteredModels"
							:is-loading="isLoading"
							:project-id="projectId"
							:warn-missing-credentials="true"
							:disabled="disabled"
							horizontal
							:data-testid="`agent-sub-agents-difficulty-${difficulty}-model`"
							@change="(selection) => onDifficultyModelChange(difficulty, selection)"
							@select-credential="
								(provider, credentialId) =>
									onDifficultySelectCredential(difficulty, provider, credentialId)
							"
						/>
						<N8nTooltip
							v-if="hasDifficultyMapping(difficulty)"
							:content="i18n.baseText('agents.builder.subAgents.modelsByDifficulty.clear')"
							placement="top"
						>
							<N8nIconButton
								icon="x"
								variant="ghost"
								size="mini"
								icon-size="small"
								:disabled="disabled"
								:aria-label="i18n.baseText('agents.builder.subAgents.modelsByDifficulty.clear')"
								:data-testid="`agent-sub-agents-difficulty-${difficulty}-clear`"
								@click="clearDifficultyMapping(difficulty)"
							/>
						</N8nTooltip>
					</div>
				</div>
			</div>
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

.inlineModelsSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 100%;
}

.inlineModelsIntro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.difficultyRows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding-left: var(--spacing--sm);
	border-left: var(--border);
}

.difficultyRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: var(--spacing--xl);
}

.difficultyLabel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.difficultyControls {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	min-width: calc(var(--spacing--5xl) + var(--spacing--2xs));
}

.difficultyControls > :first-child {
	flex: 1;
	min-width: calc(var(--spacing--5xl) - var(--spacing--xl));
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
