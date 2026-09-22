<script setup lang="ts">
/** Advanced settings for memory and execution behavior. */
import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { AGENT_REASONING_LEVELS, type AgentReasoningLevel } from '@n8n/api-types';
import { N8nInputNumber, N8nOption, N8nSelect, N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import AgentMemoryModelSetting from './AgentMemoryModelSetting.vue';
import AgentPanel from './AgentPanel.vue';

import { useModelCatalog } from '../composables/useModelCatalog';
import type { AgentJsonConfig } from '../types';
import {
	PROVIDER_CAPABILITIES,
	ANTHROPIC_CACHE_TTL_OPTIONS,
	type AnthropicCacheTtl,
} from '../provider-capabilities';
import { modelToString, parseModelString, parseProvider } from '../utils/model-string';
import shared from '../styles/agent-panel.module.scss';

const i18n = useI18n();
const { catalog, ensureLoaded } = useModelCatalog();
const DEFAULT_CAPABILITIES = {
	promptCaching: false,
	webSearch: false,
	providerTools: [],
} as const;

function normalizeReasoningLevel(value: unknown): AgentReasoningLevel {
	return AGENT_REASONING_LEVELS.find((level) => level === value) ?? 'medium';
}

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		disabled?: boolean;
		projectId?: string;
	}>(),
	{
		disabled: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const provider = computed(() => parseProvider(props.config?.model));
const selectedModel = computed(() => parseModelString(modelToString(props.config?.model)));
const selectedCatalogModel = computed(() => {
	if (!selectedModel.value) return undefined;
	return catalog.value[selectedModel.value.provider]?.models[selectedModel.value.name];
});
const isReasoningUnavailable = computed(
	() => !selectedModel.value || selectedCatalogModel.value?.reasoning === false,
);
const reasoningHintKey = computed(() => {
	if (!selectedModel.value) return 'agents.builder.advanced.reasoning.noModelHint';
	if (selectedCatalogModel.value?.reasoning === false) {
		return 'agents.builder.advanced.reasoning.unsupportedHint';
	}
	return 'agents.builder.advanced.reasoning.hint';
});
const capabilities = computed(() => PROVIDER_CAPABILITIES[provider.value] ?? DEFAULT_CAPABILITIES);

watch(
	() => props.projectId,
	(projectId) => {
		if (projectId) void ensureLoaded(projectId);
	},
	{ immediate: true },
);

// ---------------------------------------------------------------------------
// Generic helper for numeric config fields
// ---------------------------------------------------------------------------

type ConfigObj = NonNullable<AgentJsonConfig['config']>;

/** Keys of the config object whose value type is `number | undefined`. */
type NumberConfigKey = keyof {
	[K in keyof ConfigObj as ConfigObj[K] extends number | undefined ? K : never]: unknown;
};

type NumberFieldOptions =
	| number
	| {
			displayDefault: number;
	  };

/**
 * Creates a ref, debounced config-emit, change handler, and watch-sync
 * function for one numeric field inside `config`. Designed for N8nInputNumber
 * which emits numbers directly (NaN when the field is cleared).
 *
 * Pass a number for fields that always persist their fallback (e.g. concurrency).
 * Pass `{ displayDefault }` for optional fields that show a runtime default in
 * the UI but omit the key from saved config when cleared.
 */
function makeNumberField(key: NumberConfigKey, options: NumberFieldOptions) {
	const displayDefault = typeof options === 'number' ? options : options.displayDefault;
	const persistFallback = typeof options === 'number';

	const resolveDisplay = (cfg: AgentJsonConfig | null) => cfg?.config?.[key] ?? displayDefault;

	const value = ref(resolveDisplay(props.config));

	const debouncedEmit = useDebounceFn(() => {
		const cfg = { ...(props.config?.config ?? {}) };
		if (value.value === undefined) {
			delete (cfg as Partial<ConfigObj>)[key];
		} else {
			(cfg as ConfigObj)[key] = value.value;
		}
		emit('update:config', { config: cfg });
	}, 500);

	const emitConfig = (nextValue: number | undefined) => {
		const cfg = { ...(props.config?.config ?? {}) };
		if (nextValue === undefined) {
			delete (cfg as Partial<ConfigObj>)[key];
		} else {
			(cfg as ConfigObj)[key] = nextValue;
		}
		emit('update:config', { config: cfg });
	};

	return {
		modelValue: value,
		onChange(n: number) {
			if (persistFallback) {
				value.value = isNaN(n) ? displayDefault : n;
				void debouncedEmit();
				return;
			}

			if (isNaN(n)) {
				value.value = displayDefault;
				emitConfig(undefined);
				return;
			}

			value.value = n;
			emitConfig(n);
		},
		sync(cfg: AgentJsonConfig | null) {
			value.value = resolveDisplay(cfg);
		},
	};
}

// ---------------------------------------------------------------------------
// Numeric config fields — add new ones here
// ---------------------------------------------------------------------------

const CONCURRENCY_MIN = 1;
const CONCURRENCY_MAX = 100;
const CONCURRENCY_DEFAULT = 5;
const MAX_ITERATIONS_MIN = 1;
const MAX_ITERATIONS_MAX = 200;
const MAX_ITERATIONS_DEFAULT = 30;
const PROMPT_CACHING_TTL_DEFAULT: AnthropicCacheTtl = '1h';

const {
	modelValue: concurrencyModelValue,
	onChange: onConcurrencyChange,
	sync: syncConcurrency,
} = makeNumberField('toolCallConcurrency', CONCURRENCY_DEFAULT);

const {
	modelValue: maxIterationsModelValue,
	onChange: onMaxIterationsChange,
	sync: syncMaxIterations,
} = makeNumberField('maxIterations', { displayDefault: MAX_ITERATIONS_DEFAULT });

// ---------------------------------------------------------------------------
// Reasoning
// ---------------------------------------------------------------------------

const reasoningEnabled = ref(props.config?.config?.reasoning !== undefined);
const reasoningLevel = ref<AgentReasoningLevel>(
	normalizeReasoningLevel(props.config?.config?.reasoning),
);

function anthropicTtlFrom(cfg: AgentJsonConfig | null): AnthropicCacheTtl {
	return cfg?.config?.promptCaching?.anthropic?.ttl ?? PROMPT_CACHING_TTL_DEFAULT;
}

const anthropicTtl = ref<AnthropicCacheTtl>(anthropicTtlFrom(props.config));

watch(
	() => props.config,
	(config) => {
		if (!config) return;
		reasoningEnabled.value = config.config?.reasoning !== undefined;
		reasoningLevel.value = normalizeReasoningLevel(config.config?.reasoning);
		anthropicTtl.value = anthropicTtlFrom(config);
		syncConcurrency(config);
		syncMaxIterations(config);
	},
	{ deep: true },
);

function emitReasoning() {
	emit('update:config', {
		config: { ...props.config?.config, reasoning: reasoningLevel.value },
	});
}

function onReasoningToggle(value: boolean) {
	reasoningEnabled.value = value;
	if (!value) {
		const rest = { ...(props.config?.config ?? {}) };
		delete rest.reasoning;
		emit('update:config', { config: rest });
		return;
	}
	emitReasoning();
}

function onReasoningLevelChange(value: AgentReasoningLevel) {
	reasoningLevel.value = value;
	emitReasoning();
}

function onAnthropicTtlChange(value: AnthropicCacheTtl) {
	anthropicTtl.value = value;
	emit('update:config', {
		config: {
			...props.config?.config,
			promptCaching: { enabled: true, anthropic: { ttl: value } },
		},
	});
}
</script>

<template>
	<div :class="$style.panels" data-testid="agent-behavior-panel">
		<AgentPanel
			:header="i18n.baseText('agents.builder.advanced.title')"
			:description="i18n.baseText('agents.builder.advanced.description')"
		>
			<div :class="$style.content">
				<AgentMemoryModelSetting
					:config="props.config"
					:disabled="props.disabled"
					:project-id="props.projectId"
					@update:config="emit('update:config', $event)"
				/>

				<div :class="$style.settingGroup">
					<div :class="$style.row">
						<div :class="$style.rowLabel">
							<N8nText step="sm" bold :class="shared.dataEntryLabel">{{
								i18n.baseText('agents.builder.advanced.reasoning.label')
							}}</N8nText>
							<N8nText
								size="small"
								:class="shared.dataEntrySubLabel"
								data-testid="agent-reasoning-hint"
							>
								{{ i18n.baseText(reasoningHintKey) }}
							</N8nText>
						</div>
						<N8nSwitch2
							:model-value="reasoningEnabled"
							:disabled="props.disabled || isReasoningUnavailable"
							:class="$style.switchControl"
							data-testid="agent-reasoning-toggle"
							@update:model-value="(v) => onReasoningToggle(Boolean(v))"
						/>
					</div>

					<div
						v-if="reasoningEnabled"
						:class="$style.subSettings"
						data-testid="agent-reasoning-settings"
					>
						<div :class="$style.row">
							<N8nText step="sm" bold :class="shared.dataEntryLabel">{{
								i18n.baseText('agents.builder.advanced.reasoningEffort.label')
							}}</N8nText>
							<N8nSelect
								:model-value="reasoningLevel"
								size="small"
								:disabled="props.disabled || isReasoningUnavailable"
								:class="$style.shortInput"
								data-testid="agent-reasoning-effort-select"
								@update:model-value="onReasoningLevelChange"
							>
								<N8nOption
									v-for="opt in AGENT_REASONING_LEVELS"
									:key="opt"
									:value="opt"
									:label="opt"
								/>
							</N8nSelect>
						</div>
					</div>
				</div>

				<div v-if="capabilities.promptCaching === 'ttl'" :class="$style.settingGroup">
					<div :class="$style.row">
						<div :class="$style.rowLabel">
							<N8nText step="sm" bold :class="shared.dataEntryLabel">{{
								i18n.baseText('agents.builder.advanced.promptCachingTtl.label')
							}}</N8nText>
							<N8nText size="small" :class="shared.dataEntrySubLabel">
								{{ i18n.baseText('agents.builder.advanced.promptCaching.hint') }}
							</N8nText>
						</div>
						<N8nSelect
							:model-value="anthropicTtl"
							size="small"
							:disabled="props.disabled"
							:class="$style.shortInput"
							data-testid="agent-prompt-caching-ttl-select"
							@update:model-value="(v) => onAnthropicTtlChange(v as AnthropicCacheTtl)"
						>
							<N8nOption
								v-for="opt in ANTHROPIC_CACHE_TTL_OPTIONS"
								:key="opt"
								:value="opt"
								:label="opt"
							/>
						</N8nSelect>
					</div>
				</div>

				<div :class="$style.row">
					<div :class="$style.rowLabel">
						<N8nText step="sm" bold :class="shared.dataEntryLabel">{{
							i18n.baseText('agents.builder.advanced.concurrency.label')
						}}</N8nText>
						<N8nText size="small" :class="shared.dataEntrySubLabel">
							{{ i18n.baseText('agents.builder.advanced.concurrency.hint') }}
						</N8nText>
					</div>
					<N8nInputNumber
						:model-value="concurrencyModelValue"
						:min="CONCURRENCY_MIN"
						:max="CONCURRENCY_MAX"
						:precision="0"
						:controls="false"
						:disabled="props.disabled"
						:class="$style.shortInput"
						data-testid="agent-concurrency-input"
						@update:model-value="onConcurrencyChange"
					/>
				</div>

				<div :class="$style.row">
					<div :class="$style.rowLabel">
						<N8nText step="sm" bold :class="shared.dataEntryLabel">{{
							i18n.baseText('agents.builder.advanced.maxIterations.label')
						}}</N8nText>
						<N8nText size="small" :class="shared.dataEntrySubLabel">
							{{ i18n.baseText('agents.builder.advanced.maxIterations.hint') }}
						</N8nText>
					</div>
					<N8nInputNumber
						:model-value="maxIterationsModelValue"
						:min="MAX_ITERATIONS_MIN"
						:max="MAX_ITERATIONS_MAX"
						:precision="0"
						:controls="false"
						:disabled="props.disabled"
						:class="$style.shortInput"
						data-testid="agent-max-iterations-input"
						@update:model-value="onMaxIterationsChange"
					/>
				</div>
			</div>
		</AgentPanel>
	</div>
</template>

<style module>
.panels {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.settingGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
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

.subSettings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding-left: var(--spacing--sm);
	border-left: var(--border);
}

.shortInput {
	width: 140px;
	flex-shrink: 0;
}

.credentialSelect {
	width: 220px;
	flex-shrink: 0;
}

.switchControl:not([data-disabled]) {
	cursor: pointer;
}
</style>
