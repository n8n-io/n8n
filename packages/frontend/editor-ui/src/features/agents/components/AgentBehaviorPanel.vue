<script setup lang="ts">
/**
 * Behavior panel — execution-behavior knobs that used to live in the old
 * AgentOverviewPanel: reasoning depth (provider-gated), tool-call
 * concurrency, and tool-approval gate.
 *
 * Thinking is always visible as a toggle but disabled (with a tooltip) when
 * the selected provider doesn't support it. The sub-control differs by
 * provider: Anthropic takes a `budgetTokens` number, OpenAI takes a
 * `reasoningEffort` low/medium/high select.
 */
import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { ElSwitch } from 'element-plus';
import { N8nInput, N8nSelect, N8nText, N8nTooltip } from '@n8n/design-system';
import N8nOption from '@n8n/design-system/components/N8nOption';

import type { AgentJsonConfig } from '../types';
import {
	PROVIDER_CAPABILITIES,
	REASONING_EFFORT_OPTIONS,
	type ReasoningEffort,
} from '../provider-capabilities';

const props = defineProps<{ config: AgentJsonConfig | null }>();
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

function parseProvider(
	raw: string | { provider: string | null; name: string | null } | undefined,
): string {
	if (!raw) return '';
	if (typeof raw === 'object') return raw.provider ?? '';
	const slashIdx = raw.indexOf('/');
	return slashIdx === -1 ? '' : raw.slice(0, slashIdx);
}

const provider = computed(() => parseProvider(props.config?.model));
const capabilities = computed(
	() => PROVIDER_CAPABILITIES[provider.value] ?? { thinking: false as const },
);

const thinkingCfg = computed(() => props.config?.config?.thinking ?? null);
const thinkingEnabled = ref(thinkingCfg.value !== null);
const budgetTokens = ref(thinkingCfg.value?.budgetTokens ?? 1024);
const reasoningEffort = ref<ReasoningEffort>(
	(thinkingCfg.value?.reasoningEffort as ReasoningEffort) ?? 'medium',
);
const toolCallConcurrency = ref(props.config?.config?.toolCallConcurrency ?? 1);
const requireToolApproval = ref(props.config?.config?.requireToolApproval ?? false);

watch(
	() => props.config,
	(cfg) => {
		if (!cfg) return;
		const t = cfg.config?.thinking ?? null;
		thinkingEnabled.value = t !== null;
		budgetTokens.value = t?.budgetTokens ?? 1024;
		reasoningEffort.value = (t?.reasoningEffort as ReasoningEffort) ?? 'medium';
		toolCallConcurrency.value = cfg.config?.toolCallConcurrency ?? 1;
		requireToolApproval.value = cfg.config?.requireToolApproval ?? false;
	},
	{ deep: true },
);

function emitThinking() {
	const cap = capabilities.value.thinking;
	if (!cap) return;
	const thinking =
		cap === 'budgetTokens'
			? { provider: 'anthropic' as const, budgetTokens: budgetTokens.value }
			: { provider: 'openai' as const, reasoningEffort: reasoningEffort.value };
	emit('update:config', { config: { ...props.config?.config, thinking } });
}

function onThinkingToggle(value: boolean) {
	if (!capabilities.value.thinking) return;
	thinkingEnabled.value = value;
	if (!value) {
		const rest = { ...(props.config?.config ?? {}) };
		delete rest.thinking;
		emit('update:config', { config: rest });
		return;
	}
	emitThinking();
}

const emitBudget = useDebounceFn(emitThinking, 500);
function onBudgetInput(value: string) {
	const n = Number(value);
	if (!Number.isFinite(n) || n < 1) return;
	budgetTokens.value = n;
	void emitBudget();
}

function onReasoningEffortChange(value: ReasoningEffort) {
	reasoningEffort.value = value;
	emitThinking();
}

const emitConcurrency = useDebounceFn(() => {
	emit('update:config', {
		config: { ...props.config?.config, toolCallConcurrency: toolCallConcurrency.value },
	});
}, 500);
function onConcurrencyInput(value: string) {
	const n = Number(value);
	if (!Number.isFinite(n) || n < 1) return;
	toolCallConcurrency.value = n;
	void emitConcurrency();
}

function onApprovalToggle(value: boolean) {
	requireToolApproval.value = value;
	emit('update:config', {
		config: { ...props.config?.config, requireToolApproval: value },
	});
}

const thinkingDisabledReason = computed(() =>
	capabilities.value.thinking
		? ''
		: `${provider.value || 'This provider'} does not support thinking`,
);
</script>

<template>
	<div :class="$style.panel" data-testid="agent-behavior-panel">
		<div :class="$style.header">
			<N8nText tag="h3" size="large" :bold="true">Behavior</N8nText>
			<N8nText size="small" color="text-light">
				Execution tuning — reasoning depth, tool parallelism, and approval gating.
			</N8nText>
		</div>

		<div :class="$style.row">
			<div :class="$style.rowLabel">
				<N8nText size="small" :bold="true">Thinking</N8nText>
				<N8nText size="xsmall" color="text-light">
					Let the model reason before responding.
				</N8nText>
			</div>
			<N8nTooltip
				:content="thinkingDisabledReason"
				:disabled="!!capabilities.thinking"
				placement="top"
			>
				<ElSwitch
					:model-value="thinkingEnabled"
					:disabled="!capabilities.thinking"
					data-testid="agent-thinking-toggle"
					@update:model-value="(v) => onThinkingToggle(Boolean(v))"
				/>
			</N8nTooltip>
		</div>

		<div v-if="thinkingEnabled && capabilities.thinking === 'budgetTokens'" :class="$style.row">
			<N8nText size="small" :bold="true">Budget tokens</N8nText>
			<N8nInput
				type="number"
				:model-value="String(budgetTokens)"
				:class="$style.shortInput"
				data-testid="agent-budget-tokens-input"
				@update:model-value="onBudgetInput"
			/>
		</div>

		<div v-if="thinkingEnabled && capabilities.thinking === 'reasoningEffort'" :class="$style.row">
			<N8nText size="small" :bold="true">Reasoning effort</N8nText>
			<N8nSelect
				:model-value="reasoningEffort"
				size="small"
				:class="$style.shortInput"
				data-testid="agent-reasoning-effort-select"
				@update:model-value="onReasoningEffortChange"
			>
				<N8nOption v-for="opt in REASONING_EFFORT_OPTIONS" :key="opt" :value="opt" :label="opt" />
			</N8nSelect>
		</div>

		<div :class="$style.row">
			<div :class="$style.rowLabel">
				<N8nText size="small" :bold="true">Tool call concurrency</N8nText>
				<N8nText size="xsmall" color="text-light">
					How many tool calls the agent can run in parallel.
				</N8nText>
			</div>
			<N8nInput
				type="number"
				:model-value="String(toolCallConcurrency)"
				:class="$style.shortInput"
				data-testid="agent-concurrency-input"
				@update:model-value="onConcurrencyInput"
			/>
		</div>

		<div :class="$style.row">
			<div :class="$style.rowLabel">
				<N8nText size="small" :bold="true">Require tool approval</N8nText>
				<N8nText size="xsmall" color="text-light">
					Pause before running tool calls until a human approves.
				</N8nText>
			</div>
			<ElSwitch
				:model-value="requireToolApproval"
				data-testid="agent-require-approval-toggle"
				@update:model-value="(v) => onApprovalToggle(Boolean(v))"
			/>
		</div>
	</div>
</template>

<style module>
.panel {
	padding: var(--spacing--lg);
	overflow-y: auto;
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	scrollbar-width: thin;
	scrollbar-color: var(--color--foreground--shade-1) transparent;
}

.panel::-webkit-scrollbar {
	width: 6px;
}

.panel::-webkit-scrollbar-track {
	background: transparent;
}

.panel::-webkit-scrollbar-thumb {
	background: var(--color--foreground--shade-1);
	border-radius: 999px;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: var(--spacing--xl);
}

.rowLabel {
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
</style>
