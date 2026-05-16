<script setup lang="ts">
/**
 * Behavior panel — execution-behavior knobs that used to live in the old
 * AgentOverviewPanel: reasoning depth (provider-gated) and tool-call
 * concurrency.
 *
 * Thinking is always visible as a toggle but disabled (with a tooltip) when
 * the selected provider doesn't support it. The sub-control differs by
 * provider: Anthropic takes a `budgetTokens` number, OpenAI takes a
 * `reasoningEffort` low/medium/high select.
 */
import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import {
	N8nCollapsiblePanel,
	N8nInput,
	N8nSelect,
	N8nSwitch2,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import N8nOption from '@n8n/design-system/components/N8nOption';
import { useI18n } from '@n8n/i18n';

import type { AgentJsonConfig } from '../types';
import {
	PROVIDER_CAPABILITIES,
	REASONING_EFFORT_OPTIONS,
	type ReasoningEffort,
} from '../provider-capabilities';
import { parseProvider } from '../utils/model-string';

const i18n = useI18n();

const props = withDefaults(
	defineProps<{ config: AgentJsonConfig | null; disabled?: boolean; collapsible?: boolean }>(),
	{
		disabled: false,
		collapsible: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const isExpanded = ref(!props.collapsible);

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

watch(
	() => props.config,
	(cfg) => {
		if (!cfg) return;
		const t = cfg.config?.thinking ?? null;
		thinkingEnabled.value = t !== null;
		budgetTokens.value = t?.budgetTokens ?? 1024;
		reasoningEffort.value = (t?.reasoningEffort as ReasoningEffort) ?? 'medium';
		toolCallConcurrency.value = cfg.config?.toolCallConcurrency ?? 1;
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

const thinkingDisabledReason = computed(() =>
	capabilities.value.thinking
		? ''
		: i18n.baseText('agents.builder.advanced.thinking.unsupportedTooltip', {
				interpolate: {
					provider:
						provider.value ||
						i18n.baseText('agents.builder.advanced.thinking.unsupportedProviderFallback'),
				},
			}),
);
</script>

<template>
	<N8nCollapsiblePanel
		v-model="isExpanded"
		:class="$style.panel"
		:disabled="!props.collapsible"
		data-testid="agent-behavior-panel"
	>
		<template #title>
			<N8nText tag="h3" :bold="true">{{ i18n.baseText('agents.builder.advanced.title') }}</N8nText>
		</template>
		<div :class="$style.content">
			<div :class="$style.row">
				<div :class="$style.rowLabel">
					<N8nText size="small" :bold="true">{{
						i18n.baseText('agents.builder.advanced.thinking.label')
					}}</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('agents.builder.advanced.thinking.hint') }}
					</N8nText>
				</div>
				<N8nTooltip
					:content="thinkingDisabledReason"
					:disabled="!!capabilities.thinking"
					placement="top"
				>
					<N8nSwitch2
						:model-value="thinkingEnabled"
						:disabled="!capabilities.thinking || props.disabled"
						data-testid="agent-thinking-toggle"
						@update:model-value="(v) => onThinkingToggle(Boolean(v))"
					/>
				</N8nTooltip>
			</div>

			<div v-if="thinkingEnabled && capabilities.thinking === 'budgetTokens'" :class="$style.row">
				<N8nText size="small" :bold="true">{{
					i18n.baseText('agents.builder.advanced.budgetTokens.label')
				}}</N8nText>
				<N8nInput
					type="number"
					:model-value="String(budgetTokens)"
					:disabled="props.disabled"
					:class="$style.shortInput"
					data-testid="agent-budget-tokens-input"
					@update:model-value="onBudgetInput"
				/>
			</div>

			<div
				v-if="thinkingEnabled && capabilities.thinking === 'reasoningEffort'"
				:class="$style.row"
			>
				<N8nText size="small" :bold="true">{{
					i18n.baseText('agents.builder.advanced.reasoningEffort.label')
				}}</N8nText>
				<N8nSelect
					:model-value="reasoningEffort"
					size="small"
					:disabled="props.disabled"
					:class="$style.shortInput"
					data-testid="agent-reasoning-effort-select"
					@update:model-value="onReasoningEffortChange"
				>
					<N8nOption v-for="opt in REASONING_EFFORT_OPTIONS" :key="opt" :value="opt" :label="opt" />
				</N8nSelect>
			</div>

			<div :class="$style.row">
				<div :class="$style.rowLabel">
					<N8nText size="small" :bold="true">{{
						i18n.baseText('agents.builder.advanced.concurrency.label')
					}}</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('agents.builder.advanced.concurrency.hint') }}
					</N8nText>
				</div>
				<N8nInput
					type="number"
					:model-value="String(toolCallConcurrency)"
					:disabled="props.disabled"
					:class="$style.shortInput"
					data-testid="agent-concurrency-input"
					@update:model-value="onConcurrencyInput"
				/>
			</div>
		</div>
	</N8nCollapsiblePanel>
</template>

<style module>
.panel {
	width: 100%;
}

.panel.panel {
	border: 0;
	border-radius: 0;
	background-color: transparent;
	scroll-margin-bottom: 0;
}

.panel.panel > :first-child {
	padding: 0;
	min-height: auto;
}

.panel.panel > :first-child h3 {
	margin: 0;
}

.panel.panel > [data-state] > :first-child {
	padding: var(--spacing--sm) 0 0;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
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
