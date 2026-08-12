<script setup lang="ts">
import { computed } from 'vue';
import type { AgentGoalConfig, AgentSlotConfig } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useUIStore } from '@/app/stores/ui.store';
import type { GoalGraphLiveState } from '../composables/useAgentChatStream';
import { AGENT_GOAL_EDIT_MODAL_KEY } from '../constants';
import type { AgentGoalEditModalData } from './AgentGoalEditModal.vue';
import AgentSectionEditor from './AgentSectionEditor.vue';
import AgentGoalGraphCanvas from './goal-graph/AgentGoalGraphCanvas.vue';
import AgentSlotsEditor from './goal-graph/AgentSlotsEditor.vue';
import {
	addGoal,
	connectGoals,
	createDefaultGoal,
	disconnectGoals,
	removeGoal,
	updateGoal,
} from './goal-graph/goalGraphEdit';
import type { AgentJsonConfig } from '../types';

const props = withDefaults(defineProps<{ config: AgentJsonConfig | null; disabled?: boolean }>(), {
	disabled: false,
});

const emit = defineEmits<{ 'update:config': [config: AgentJsonConfig] }>();

const i18n = useI18n();
const uiStore = useUIStore();

const goals = computed(() => props.config?.goals ?? []);
const slots = computed(() => props.config?.slots ?? []);

// Structure-only preview: no run has happened, so statuses/tools are empty
// (goals render neutral). Slots are seeded with their declared initial values.
const previewState = computed<GoalGraphLiveState>(() => {
	const seeded: Record<string, unknown> = {};
	for (const slot of slots.value) {
		if (slot.initialValue !== undefined) seeded[slot.name] = slot.initialValue;
	}
	return { slots: seeded, statuses: {}, tools: {} };
});

// Best-effort tool names for the attachment select; goal attachments match
// tools by runtime name, so free text remains allowed in the modal.
const toolNames = computed<string[]>(() => {
	const names: string[] = [];
	for (const tool of props.config?.tools ?? []) {
		if (tool.type === 'custom') names.push(tool.id);
		else if (tool.type === 'workflow') names.push(tool.name ?? tool.workflow);
		else if (tool.type === 'node') names.push(tool.name);
	}
	return names;
});

function emitGoals(nextGoals: AgentGoalConfig[]) {
	if (!props.config) return;
	emit('update:config', { ...props.config, goals: nextGoals });
}

function emitSlots(nextSlots: AgentSlotConfig[]) {
	if (!props.config) return;
	emit('update:config', { ...props.config, slots: nextSlots });
}

function openGoalModal(goalId: string, goalsSnapshot: AgentGoalConfig[]) {
	const data: AgentGoalEditModalData = {
		goalId,
		goals: goalsSnapshot,
		toolNames: toolNames.value,
		// Read goals.value at invocation time — the JSON editor may have
		// changed the config while the modal was open.
		onSave: ({ originalId, goal }) => emitGoals(updateGoal(goals.value, originalId, goal)),
		onDelete: (id) => emitGoals(removeGoal(goals.value, id)),
	};
	uiStore.openModalWithData({ name: AGENT_GOAL_EDIT_MODAL_KEY, data });
}

function onAddGoal() {
	const goal = createDefaultGoal(goals.value, i18n.baseText('agents.builder.goals.newGoalName'));
	const next = addGoal(goals.value, goal);
	emitGoals(next);
	openGoalModal(goal.id, next);
}

function onEditGoal(goalId: string) {
	openGoalModal(goalId, goals.value);
}

function onConnect({ from, to }: { from: string; to: string }) {
	// The canvas pre-validates drops, so a failed result is just a no-op.
	const result = connectGoals(goals.value, from, to);
	if (result.ok) emitGoals(result.goals);
}

function onRemoveEdge({ from, to }: { from: string; to: string }) {
	emitGoals(disconnectGoals(goals.value, from, to));
}
</script>

<template>
	<div
		:class="[$style.container, props.disabled && $style.disabled]"
		data-testid="agent-goals-panel"
	>
		<div :class="$style.titleGroup">
			<N8nText :bold="true">
				{{ i18n.baseText('agents.builder.goals.label') }}
			</N8nText>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.builder.goals.hint') }}
			</N8nText>
		</div>
		<div :class="$style.split">
			<div :class="$style.editor">
				<AgentSectionEditor
					:config="props.config"
					:pick-keys="['slots', 'goals']"
					:read-only="props.disabled"
					@update:config="emit('update:config', $event)"
				/>
			</div>
			<div :class="$style.preview">
				<div :class="$style.previewLabel">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.builder.goals.preview') }}
					</N8nText>
				</div>
				<div :class="$style.previewCanvas">
					<AgentGoalGraphCanvas
						:goals="goals"
						:slots="slots"
						:state="previewState"
						:editable="!props.disabled && !!props.config"
						@add-goal="onAddGoal"
						@edit-goal="onEditGoal"
						@connect="onConnect"
						@remove-edge="onRemoveEdge"
					/>
				</div>
			</div>
			<AgentSlotsEditor :slots="slots" :disabled="props.disabled" @update:slots="emitSlots" />
		</div>
	</div>
</template>

<style module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.titleGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.split {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.editor {
	display: flex;
	width: 100%;
	min-height: 0;
	height: 360px;
}

/* AgentSectionEditor's root sizes its height (100%) but not its width — as a
   flex item it would shrink to content width, so stretch it explicitly. */
.editor > * {
	flex: 1;
	min-width: 0;
}

.preview {
	display: flex;
	flex-direction: column;
	width: 100%;
	min-height: 0;
	height: 460px;
	gap: var(--spacing--3xs);
}

.previewLabel {
	flex-shrink: 0;
}

.previewCanvas {
	display: flex;
	flex: 1;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.container.disabled {
	opacity: 0.6;
}
</style>
