<script setup lang="ts">
import type {
	AgentHitlConfiguration,
	AgentToolGuardrailConfig,
	AgentToolGuardrailKind,
} from '@n8n/api-types';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import type { AgentJsonToolRef } from '../types';
import type { AgentHitlContext } from './agent-hitl.types';
import AgentGuardrailModal from './AgentGuardrailModal.vue';

defineOptions({ inheritAttrs: false });

/**
 * Guardrail edits that replace a tool modal: the tool modal closes around the
 * `open-guardrail` event and this modal takes over, so the guardrail form never
 * stacks on top of a modal. `onExit` reopens the tool modal it replaced.
 */
export interface AgentGuardrailModalData {
	/** The entry to edit. Null opens the create flow with `kind` preselected. */
	guardrail: AgentToolGuardrailConfig | null;
	kind?: AgentToolGuardrailKind;
	getGuardrails: () => AgentToolGuardrailConfig[];
	getTools: () => AgentJsonToolRef[];
	/** The agent's human-review configurations, for the `approval` response target. */
	getApprovalConfigurations?: () => AgentHitlConfiguration[];
	/** Write access to the agent's configurations, for the modal's add-reviewer flow. */
	getApprovalContext?: () => AgentHitlContext | undefined;
	/** The agent's project: the check workflow picker lists its workflows. */
	getProjectId?: () => string | undefined;
	onUpdateGuardrails: (tools: AgentToolGuardrailConfig[]) => void;
	disabled?: MaybeRefOrGetter<boolean>;
	/** Reopens the tool modal this one replaced. Runs on every close path. */
	onExit: () => void;
}

const props = defineProps<{
	modalName: string;
	data: AgentGuardrailModalData;
}>();

const uiStore = useUIStore();
const isOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

function close() {
	uiStore.closeModal(props.modalName);
	props.data.onExit();
}

function onSave(guardrail: AgentToolGuardrailConfig) {
	if (toValue(props.data.disabled)) return;
	const current = props.data.getGuardrails();
	const next = props.data.guardrail
		? current.map((entry) => (entry.id === guardrail.id ? guardrail : entry))
		: [...current, guardrail];
	props.data.onUpdateGuardrails(next);
}

// The modal closes itself through its update:open path; this only commits the config.
function onRemove() {
	if (toValue(props.data.disabled)) return;
	props.data.onUpdateGuardrails(
		props.data.getGuardrails().filter((guardrail) => guardrail.id !== props.data.guardrail?.id),
	);
}
</script>

<template>
	<AgentGuardrailModal
		:open="isOpen"
		:disabled="toValue(data.disabled)"
		:guardrail="data.guardrail"
		:kind="data.kind ?? 'keywords'"
		:tools="data.getTools()"
		:approval-configurations="data.getApprovalConfigurations?.() ?? []"
		:approval-context="data.getApprovalContext?.()"
		:project-id="data.getProjectId?.()"
		:existing-ids="data.getGuardrails().map((guardrail) => guardrail.id)"
		data-testid="agent-guardrail-modal-host"
		@update:open="!$event && close()"
		@save="onSave"
		@remove="onRemove"
	/>
</template>
