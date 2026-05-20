<script setup lang="ts">
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

// ---------------------------------------------------------------------------
// Generic helper for numeric config fields
// ---------------------------------------------------------------------------

type ConfigObj = NonNullable<AgentJsonConfig['config']>;

/** Keys of the config object whose value type is `number | undefined`. */
type NumberConfigKey = keyof {
	[K in keyof ConfigObj as ConfigObj[K] extends number | undefined ? K : never]: unknown;
};

/**
 * Creates a ref, debounced config-emit, input handler, and watch-sync
 * function for one numeric field inside `config`.
 *
 * @param key          Config key (must be a numeric field).
 * @param defaultValue Local value when the key is absent from the config.
 *                     Pass `null` for optional fields that render as an empty
 *                     placeholder — the key is removed from the config when null.
 * @param parse        Converts raw input to the new value.
 *                     Return `undefined` to reject the input (no update).
 *                     Return `null` to clear the key from the config.
 */
function makeField<T extends number | null>(
	key: NumberConfigKey,
	defaultValue: T,
	parse: (raw: string) => T | undefined,
) {
	const value = ref((props.config?.config?.[key] ?? defaultValue) as T);

	const debouncedEmit = useDebounceFn(() => {
		const cfg = { ...(props.config?.config ?? {}) };
		if (value.value === null) {
			delete (cfg as Partial<ConfigObj>)[key];
		} else {
			(cfg as ConfigObj)[key] = value.value as number;
		}
		emit('update:config', { config: cfg });
	}, 500);

	return {
		modelValue: computed(() => (value.value !== null ? String(value.value) : '')),
		onInput(raw: string) {
			const next = parse(raw);
			if (next === undefined) return;
			value.value = next;
			void debouncedEmit();
		},
		sync(cfg: AgentJsonConfig | null) {
			value.value = (cfg?.config?.[key] ?? defaultValue) as T;
		},
	};
}

// ---------------------------------------------------------------------------
// Numeric config fields — add new ones here
// ---------------------------------------------------------------------------

const {
	modelValue: concurrencyModelValue,
	onInput: onConcurrencyInput,
	sync: syncConcurrency,
} = makeField('toolCallConcurrency', 1, (raw) => {
	const n = Number(raw);
	return Number.isFinite(n) && n >= 1 ? n : undefined;
});

const {
	modelValue: maxIterationsModelValue,
	onInput: onMaxIterationsInput,
	sync: syncMaxIterations,
} = makeField('maxIterations', null as number | null, (raw) => {
	if (raw === '') return null as number | null;
	const n = Number(raw);
	return Number.isFinite(n) && n >= 1 && n <= 200 ? Math.round(n) : undefined;
});

// ---------------------------------------------------------------------------
// Thinking — provider-gated, handled separately
// ---------------------------------------------------------------------------

const thinkingCfg = computed(() => props.config?.config?.thinking ?? null);
const thinkingEnabled = ref(thinkingCfg.value !== null);
const budgetTokens = ref(thinkingCfg.value?.budgetTokens ?? 1024);
const reasoningEffort = ref<ReasoningEffort>(
	(thinkingCfg.value?.reasoningEffort as ReasoningEffort) ?? 'medium',
);

watch(
	() => props.config,
	(cfg) => {
		if (!cfg) return;
		const t = cfg.config?.thinking ?? null;
		thinkingEnabled.value = t !== null;
		budgetTokens.value = t?.budgetTokens ?? 1024;
		reasoningEffort.value = (t?.reasoningEffort as ReasoningEffort) ?? 'medium';
		syncConcurrency(cfg);
		syncMaxIterations(cfg);
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
					:model-value="concurrencyModelValue"
					:disabled="props.disabled"
					:class="$style.shortInput"
					data-testid="agent-concurrency-input"
					@update:model-value="onConcurrencyInput"
				/>
			</div>

			<div :class="$style.row">
				<div :class="$style.rowLabel">
					<N8nText size="small" :bold="true">{{
						i18n.baseText('agents.builder.advanced.maxIterations.label')
					}}</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('agents.builder.advanced.maxIterations.hint') }}
					</N8nText>
				</div>
				<N8nInput
					type="number"
					:model-value="maxIterationsModelValue"
					:placeholder="i18n.baseText('agents.builder.advanced.maxIterations.placeholder')"
					:disabled="props.disabled"
					:class="$style.shortInput"
					data-testid="agent-max-iterations-input"
					@update:model-value="onMaxIterationsInput"
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
