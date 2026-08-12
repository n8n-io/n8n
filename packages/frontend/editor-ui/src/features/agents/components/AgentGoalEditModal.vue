<script setup lang="ts">
import type { AgentGoalConfig, GoalToolAttachmentConfig } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import N8nOption from '@n8n/design-system/components/N8nOption';
import N8nSelect from '@n8n/design-system/components/N8nSelect';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import Modal from '@/app/components/Modal.vue';
import { MODAL_CONFIRM } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { wouldCreateCycle } from './goal-graph/goalGraphEdit';

const GOAL_ID_REGEX = /^[A-Za-z0-9_-]+$/;
const GOAL_ID_MAX_LENGTH = 64;
const GOAL_NAME_MAX_LENGTH = 128;

export type AgentGoalEditModalData = {
	goalId: string;
	/** Snapshot for id-uniqueness checks and the requires options. */
	goals: AgentGoalConfig[];
	/** Known tool names of this agent, for the attachment select. */
	toolNames: string[];
	onSave: (payload: { originalId: string; goal: AgentGoalConfig }) => void;
	onDelete: (goalId: string) => void;
};

const props = defineProps<{
	modalName: string;
	data: AgentGoalEditModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

const originalId = props.data.goalId;
const source = props.data.goals.find((g) => g.id === originalId);

const id = ref(source?.id ?? '');
const name = ref(source?.name ?? '');
const summary = ref(source?.summary ?? '');
const instructions = ref(source?.instructions ?? '');
const achievedWhen = ref(source?.achievedWhen ?? '');
const failedWhen = ref(source?.failedWhen ?? '');
const unlockedWhen = ref(source?.unlockedWhen ?? '');
const requires = ref<string[]>([...(source?.requires ?? [])]);

interface ToolRow {
	tool: string;
	availableWhen: string;
	bindings: string;
	outputMappings: string;
}

function stringifyRecord(record: Record<string, string> | undefined): string {
	return record && Object.keys(record).length > 0 ? JSON.stringify(record, null, 2) : '';
}

const toolRows = ref<ToolRow[]>(
	(source?.tools ?? []).map((att) => ({
		tool: att.tool,
		availableWhen: att.availableWhen ?? '',
		bindings: stringifyRecord(att.bindings),
		outputMappings: stringifyRecord(att.outputMappings),
	})),
);

const saveAttempted = ref(false);

const idError = computed(() => {
	const value = id.value.trim();
	if (!value || value.length > GOAL_ID_MAX_LENGTH || !GOAL_ID_REGEX.test(value)) {
		return i18n.baseText('agents.builder.goals.editModal.id.invalid');
	}
	const taken = props.data.goals.some((g) => g.id !== originalId && g.id === value);
	return taken ? i18n.baseText('agents.builder.goals.editModal.id.duplicate') : '';
});

const nameError = computed(() => {
	const value = name.value.trim();
	if (!value || value.length > GOAL_NAME_MAX_LENGTH) {
		return i18n.baseText('agents.builder.goals.editModal.name.invalid');
	}
	return '';
});

type ParsedRecord = { ok: true; value: Record<string, string> | undefined } | { ok: false };

function parseJsonRecord(text: string): ParsedRecord {
	const trimmed = text.trim();
	if (!trimmed) return { ok: true, value: undefined };
	try {
		const parsed: unknown = JSON.parse(trimmed);
		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return { ok: false };
		}
		if (Object.values(parsed).some((v) => typeof v !== 'string')) return { ok: false };
		return { ok: true, value: parsed as Record<string, string> };
	} catch {
		return { ok: false };
	}
}

// Rows without a tool name are dropped on save, so only named rows can block it.
const toolRowErrors = computed(() =>
	toolRows.value.map((row) => ({
		bindings: row.tool.trim() !== '' && !parseJsonRecord(row.bindings).ok,
		outputMappings: row.tool.trim() !== '' && !parseJsonRecord(row.outputMappings).ok,
	})),
);

const requiresOptions = computed(() =>
	props.data.goals
		.filter((g) => g.id !== originalId)
		.map((g) => ({
			id: g.id,
			name: g.name,
			// Selecting `g` as a prerequisite adds the edge g → this goal; it is a
			// cycle when g itself (transitively) requires this goal.
			cycle: !requires.value.includes(g.id) && wouldCreateCycle(props.data.goals, g.id, originalId),
		})),
);

function onToolRowUpdate(index: number, patch: Partial<ToolRow>) {
	toolRows.value = toolRows.value.map((row, i) => (i === index ? { ...row, ...patch } : row));
}

function addToolRow() {
	toolRows.value = [
		...toolRows.value,
		{ tool: '', availableWhen: '', bindings: '', outputMappings: '' },
	];
}

function removeToolRow(index: number) {
	toolRows.value = toolRows.value.filter((_, i) => i !== index);
}

function closeModal() {
	uiStore.closeModal(props.modalName);
}

function optional(value: string): string | undefined {
	const trimmed = value.trim();
	return trimmed === '' ? undefined : trimmed;
}

function buildTools(): GoalToolAttachmentConfig[] | undefined {
	const tools: GoalToolAttachmentConfig[] = [];
	for (const row of toolRows.value) {
		const tool = row.tool.trim();
		if (!tool) continue;
		const bindings = parseJsonRecord(row.bindings);
		const outputMappings = parseJsonRecord(row.outputMappings);
		if (!bindings.ok || !outputMappings.ok) return undefined;
		const availableWhen = optional(row.availableWhen);
		tools.push({
			tool,
			...(availableWhen ? { availableWhen } : {}),
			...(bindings.value ? { bindings: bindings.value } : {}),
			...(outputMappings.value ? { outputMappings: outputMappings.value } : {}),
		});
	}
	return tools.length > 0 ? tools : undefined;
}

function onSave() {
	saveAttempted.value = true;
	const hasToolErrors = toolRowErrors.value.some((e) => e.bindings || e.outputMappings);
	if (idError.value || nameError.value || hasToolErrors) return;

	const summaryValue = optional(summary.value);
	const achievedWhenValue = optional(achievedWhen.value);
	const failedWhenValue = optional(failedWhen.value);
	const unlockedWhenValue = optional(unlockedWhen.value);
	const tools = buildTools();

	const goal: AgentGoalConfig = {
		id: id.value.trim(),
		name: name.value.trim(),
		instructions: instructions.value,
		...(summaryValue ? { summary: summaryValue } : {}),
		...(achievedWhenValue ? { achievedWhen: achievedWhenValue } : {}),
		...(failedWhenValue ? { failedWhen: failedWhenValue } : {}),
		...(unlockedWhenValue ? { unlockedWhen: unlockedWhenValue } : {}),
		...(requires.value.length > 0 ? { requires: [...requires.value] } : {}),
		...(tools ? { tools } : {}),
	};

	props.data.onSave({ originalId, goal });
	closeModal();
}

async function onDelete() {
	const confirmed = await openAgentConfirmationModal({
		title: i18n.baseText('agents.builder.goals.deleteConfirm.title'),
		description: i18n.baseText('agents.builder.goals.deleteConfirm.description'),
		confirmButtonText: i18n.baseText('agents.builder.goals.deleteConfirm.confirm'),
		cancelButtonText: i18n.baseText('agents.builder.goals.editModal.cancel'),
	});
	if (confirmed !== MODAL_CONFIRM) return;
	props.data.onDelete(originalId);
	closeModal();
}
</script>

<template>
	<Modal :name="modalName" width="720px" data-testid="agent-goal-edit-modal">
		<template #header>
			<N8nHeading tag="h2" size="large">
				{{ i18n.baseText('agents.builder.goals.editModal.title') }}
			</N8nHeading>
		</template>

		<template #content>
			<div :class="$style.content">
				<div :class="$style.row">
					<div :class="$style.field">
						<N8nText size="small" bold>
							{{ i18n.baseText('agents.builder.goals.editModal.id.label') }}
						</N8nText>
						<N8nInput
							:model-value="id"
							:class="$style.mono"
							data-testid="goal-edit-id"
							@update:model-value="id = String($event)"
						/>
						<N8nText v-if="saveAttempted && idError" :class="$style.error" size="small">
							{{ idError }}
						</N8nText>
					</div>
					<div :class="$style.field">
						<N8nText size="small" bold>
							{{ i18n.baseText('agents.builder.goals.editModal.name.label') }}
						</N8nText>
						<N8nInput
							:model-value="name"
							data-testid="goal-edit-name"
							@update:model-value="name = String($event)"
						/>
						<N8nText v-if="saveAttempted && nameError" :class="$style.error" size="small">
							{{ nameError }}
						</N8nText>
					</div>
				</div>

				<div :class="$style.field">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.builder.goals.editModal.summary.label') }}
					</N8nText>
					<N8nInput
						:model-value="summary"
						data-testid="goal-edit-summary"
						@update:model-value="summary = String($event)"
					/>
				</div>

				<div :class="$style.field">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.builder.goals.editModal.instructions.label') }}
					</N8nText>
					<N8nInput
						:model-value="instructions"
						type="textarea"
						:rows="5"
						data-testid="goal-edit-instructions"
						@update:model-value="instructions = String($event)"
					/>
				</div>

				<div :class="$style.row">
					<div :class="$style.field">
						<N8nText size="small" bold>
							{{ i18n.baseText('agents.builder.goals.editModal.achievedWhen.label') }}
						</N8nText>
						<N8nInput
							:model-value="achievedWhen"
							:class="$style.mono"
							placeholder="={{ $state.slotName }}"
							data-testid="goal-edit-achieved-when"
							@update:model-value="achievedWhen = String($event)"
						/>
					</div>
					<div :class="$style.field">
						<N8nText size="small" bold>
							{{ i18n.baseText('agents.builder.goals.editModal.failedWhen.label') }}
						</N8nText>
						<N8nInput
							:model-value="failedWhen"
							:class="$style.mono"
							placeholder="={{ $state.slotName }}"
							data-testid="goal-edit-failed-when"
							@update:model-value="failedWhen = String($event)"
						/>
					</div>
					<div :class="$style.field">
						<N8nText size="small" bold>
							{{ i18n.baseText('agents.builder.goals.editModal.unlockedWhen.label') }}
						</N8nText>
						<N8nInput
							:model-value="unlockedWhen"
							:class="$style.mono"
							placeholder="={{ $state.slotName }}"
							data-testid="goal-edit-unlocked-when"
							@update:model-value="unlockedWhen = String($event)"
						/>
					</div>
				</div>

				<div :class="$style.field">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.builder.goals.editModal.requires.label') }}
					</N8nText>
					<N8nSelect
						:model-value="requires"
						multiple
						filterable
						:teleported="false"
						data-testid="goal-edit-requires"
						@update:model-value="requires = $event"
					>
						<N8nOption
							v-for="option in requiresOptions"
							:key="option.id"
							:value="option.id"
							:disabled="option.cycle"
							:label="
								option.cycle
									? `${option.name} ${i18n.baseText('agents.builder.goals.editModal.requires.cycleOption')}`
									: option.name
							"
						/>
					</N8nSelect>
				</div>

				<div :class="$style.field">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.builder.goals.editModal.tools.label') }}
					</N8nText>
					<div
						v-for="(row, index) in toolRows"
						:key="index"
						:class="$style.toolRow"
						data-testid="goal-edit-tool-row"
					>
						<div :class="$style.toolRowHeader">
							<div :class="$style.toolRowName">
								<N8nSelect
									v-if="props.data.toolNames.length > 0"
									:model-value="row.tool"
									filterable
									allow-create
									:teleported="false"
									:placeholder="i18n.baseText('agents.builder.goals.editModal.tools.tool')"
									data-testid="goal-edit-tool-name"
									@update:model-value="onToolRowUpdate(index, { tool: String($event) })"
								>
									<N8nOption
										v-for="toolName in props.data.toolNames"
										:key="toolName"
										:value="toolName"
										:label="toolName"
									/>
								</N8nSelect>
								<N8nInput
									v-else
									:model-value="row.tool"
									:placeholder="i18n.baseText('agents.builder.goals.editModal.tools.tool')"
									data-testid="goal-edit-tool-name"
									@update:model-value="onToolRowUpdate(index, { tool: String($event) })"
								/>
							</div>
							<N8nButton
								variant="ghost"
								size="small"
								icon-only
								:aria-label="i18n.baseText('agents.builder.goals.editModal.tools.remove')"
								data-testid="goal-edit-tool-remove"
								@click="removeToolRow(index)"
							>
								<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
							</N8nButton>
						</div>
						<div :class="$style.field">
							<N8nText size="xsmall" color="text-light">
								{{ i18n.baseText('agents.builder.goals.editModal.tools.availableWhen') }}
							</N8nText>
							<N8nInput
								:model-value="row.availableWhen"
								:class="$style.mono"
								placeholder="={{ $state.slotName }}"
								@update:model-value="onToolRowUpdate(index, { availableWhen: String($event) })"
							/>
						</div>
						<div :class="$style.toolJsonRow">
							<div :class="$style.field">
								<N8nText size="xsmall" color="text-light">
									{{ i18n.baseText('agents.builder.goals.editModal.tools.bindings') }}
								</N8nText>
								<N8nInput
									:model-value="row.bindings"
									type="textarea"
									:rows="3"
									:class="$style.mono"
									placeholder='{ "param": "={{ $state.slotName }}" }'
									data-testid="goal-edit-tool-bindings"
									@update:model-value="onToolRowUpdate(index, { bindings: String($event) })"
								/>
								<N8nText
									v-if="saveAttempted && toolRowErrors[index]?.bindings"
									:class="$style.error"
									size="small"
								>
									{{ i18n.baseText('agents.builder.goals.editModal.tools.invalidJson') }}
								</N8nText>
							</div>
							<div :class="$style.field">
								<N8nText size="xsmall" color="text-light">
									{{ i18n.baseText('agents.builder.goals.editModal.tools.outputMappings') }}
								</N8nText>
								<N8nInput
									:model-value="row.outputMappings"
									type="textarea"
									:rows="3"
									:class="$style.mono"
									placeholder='{ "slotName": "={{ $json.value }}" }'
									data-testid="goal-edit-tool-output-mappings"
									@update:model-value="onToolRowUpdate(index, { outputMappings: String($event) })"
								/>
								<N8nText
									v-if="saveAttempted && toolRowErrors[index]?.outputMappings"
									:class="$style.error"
									size="small"
								>
									{{ i18n.baseText('agents.builder.goals.editModal.tools.invalidJson') }}
								</N8nText>
							</div>
						</div>
					</div>
					<N8nButton
						variant="subtle"
						size="small"
						:class="$style.addToolBtn"
						data-testid="goal-edit-tool-add"
						@click="addToolRow"
					>
						<template #icon><N8nIcon icon="plus" :size="16" /></template>
						{{ i18n.baseText('agents.builder.goals.editModal.tools.add') }}
					</N8nButton>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" data-testid="goal-edit-delete" @click="onDelete">
					<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
					{{ i18n.baseText('agents.builder.goals.editModal.delete') }}
				</N8nButton>
				<div :class="$style.footerActions">
					<N8nButton variant="subtle" @click="closeModal">
						{{ i18n.baseText('agents.builder.goals.editModal.cancel') }}
					</N8nButton>
					<N8nButton variant="solid" data-testid="goal-edit-save" @click="onSave">
						{{ i18n.baseText('agents.builder.goals.editModal.save') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.row {
	display: flex;
	gap: var(--spacing--sm);
}

.row > .field {
	flex: 1;
	min-width: 0;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.mono :global(input),
.mono :global(textarea) {
	font-family: var(--font-family--monospace, monospace);
	font-size: var(--font-size--2xs);
}

.error {
	color: var(--color--danger);
}

.toolRow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
}

.toolRowHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.toolRowName {
	flex: 1;
	min-width: 0;
}

.toolJsonRow {
	display: flex;
	gap: var(--spacing--2xs);
}

.toolJsonRow > .field {
	flex: 1;
	min-width: 0;
}

.addToolBtn {
	align-self: flex-start;
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	width: 100%;
}

.footerActions {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
