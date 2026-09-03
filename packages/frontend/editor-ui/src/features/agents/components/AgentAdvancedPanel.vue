<script setup lang="ts">
/**
 * Behavior panel — execution-behavior knobs that used to live in the old
 * AgentOverviewPanel: native web search, reasoning depth, and tool-call
 * concurrency.
 */
import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { AGENT_REASONING_LEVELS, type AgentReasoningLevel } from '@n8n/api-types';
import {
	N8nIcon,
	N8nInputNumber,
	N8nOption,
	N8nSelect,
	N8nSwitch2,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useModelCatalog } from '../composables/useModelCatalog';
import type { AgentJsonConfig } from '../types';
import {
	PROVIDER_CAPABILITIES,
	ANTHROPIC_CACHE_TTL_OPTIONS,
	type AnthropicCacheTtl,
} from '../provider-capabilities';
import { modelToString, parseModelString, parseProvider } from '../utils/model-string';
import {
	getNativeWebSearchArgs,
	getWebSearchMethod,
	type FallbackWebSearchProvider,
	type NativeWebSearchArgs,
	type WebSearchMethod,
	withWebSearchConfig,
} from '../utils/nativeWebSearch';
import shared from '../styles/agent-panel.module.scss';

const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const { catalog, ensureLoaded } = useModelCatalog();
const DEFAULT_CAPABILITIES = {
	promptCaching: false,
	webSearch: false,
	providerTools: [],
} as const;
const ANTHROPIC_WEB_SEARCH_DEFAULT_MAX_USES = 5;
const SEARCH_CONTEXT_SIZE_OPTIONS = ['low', 'medium', 'high'] as const;
type SearchContextSize = (typeof SEARCH_CONTEXT_SIZE_OPTIONS)[number];
type WebSearchSelectValue = 'off' | WebSearchMethod;

function normalizeReasoningLevel(value: unknown): AgentReasoningLevel {
	return AGENT_REASONING_LEVELS.find((level) => level === value) ?? 'medium';
}

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		disabled?: boolean;
		collapsible?: boolean;
		projectId?: string;
	}>(),
	{
		disabled: false,
		collapsible: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const isExpanded = ref(!props.collapsible);

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
const hasNativeWebSearch = computed(() => Boolean(capabilities.value.webSearch));

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

const webSearchEnabled = ref(props.config?.config?.webSearch?.enabled === true);
const webSearchMethod = ref<WebSearchSelectValue>(
	webSearchEnabled.value ? getWebSearchMethod(props.config, hasNativeWebSearch.value) : 'off',
);
const webSearchArgs = ref<NativeWebSearchArgs>(
	getNativeWebSearchArgs(props.config, capabilities.value.webSearch),
);
const webSearchMaxUses = ref('');
const webSearchExternalAccess = ref(true);
const webSearchContextSize = ref<SearchContextSize>('medium');
const fallbackWebSearchProvider = ref<FallbackWebSearchProvider>(
	props.config?.config?.webSearch?.provider === 'searxng' ? 'searxng' : 'brave',
);
const fallbackWebSearchCredential = ref(props.config?.config?.webSearch?.credential ?? '');
const reasoningEnabled = ref(props.config?.config?.reasoning !== undefined);
const reasoningLevel = ref<AgentReasoningLevel>(
	normalizeReasoningLevel(props.config?.config?.reasoning),
);

function anthropicTtlFrom(cfg: AgentJsonConfig | null): AnthropicCacheTtl {
	return cfg?.config?.promptCaching?.anthropic?.ttl ?? PROMPT_CACHING_TTL_DEFAULT;
}

const anthropicTtl = ref<AnthropicCacheTtl>(anthropicTtlFrom(props.config));

function syncWebSearchOptions(args: NativeWebSearchArgs) {
	webSearchMaxUses.value =
		typeof args.maxUses === 'number'
			? String(args.maxUses)
			: String(ANTHROPIC_WEB_SEARCH_DEFAULT_MAX_USES);
	webSearchExternalAccess.value =
		typeof args.externalWebAccess === 'boolean' ? args.externalWebAccess : true;
	webSearchContextSize.value =
		args.searchContextSize === 'low' ||
		args.searchContextSize === 'medium' ||
		args.searchContextSize === 'high'
			? args.searchContextSize
			: 'medium';
}

syncWebSearchOptions(webSearchArgs.value);

watch(
	() => props.config,
	(cfg) => {
		if (!cfg) return;
		reasoningEnabled.value = cfg.config?.reasoning !== undefined;
		reasoningLevel.value = normalizeReasoningLevel(cfg.config?.reasoning);
		anthropicTtl.value = anthropicTtlFrom(cfg);
		syncConcurrency(cfg);
		syncMaxIterations(cfg);
		webSearchEnabled.value = cfg.config?.webSearch?.enabled === true;
		webSearchMethod.value = webSearchEnabled.value
			? getWebSearchMethod(cfg, hasNativeWebSearch.value)
			: 'off';
		webSearchArgs.value = getNativeWebSearchArgs(cfg, capabilities.value.webSearch);
		fallbackWebSearchProvider.value = webSearchMethod.value === 'searxng' ? 'searxng' : 'brave';
		fallbackWebSearchCredential.value = cfg.config?.webSearch?.credential ?? '';
		syncWebSearchOptions(webSearchArgs.value);
	},
	{ deep: true },
);

const fallbackCredentialType = computed(() =>
	webSearchMethod.value === 'searxng' ? 'searXngApi' : 'braveSearchApi',
);
const fallbackCredentials = computed(() =>
	credentialsStore.allCredentials.filter(
		(credential) => credential.type === fallbackCredentialType.value,
	),
);

function buildWebSearchArgs(): NativeWebSearchArgs {
	const tool = capabilities.value.webSearch;
	if (!tool || webSearchMethod.value !== 'native') return {};

	if (tool === 'anthropic.web_search') {
		const maxUses = Number(webSearchMaxUses.value);
		return {
			...(Number.isFinite(maxUses) && maxUses > 0 && { maxUses }),
		};
	}

	if (tool === 'openai.web_search') {
		return {
			externalWebAccess: webSearchExternalAccess.value,
			searchContextSize: webSearchContextSize.value,
		};
	}

	return {};
}

function emitWebSearchConfig() {
	if (!webSearchEnabled.value) return;
	const method = webSearchMethod.value === 'off' ? 'native' : webSearchMethod.value;
	emit(
		'update:config',
		withWebSearchConfig(
			props.config,
			true,
			method,
			capabilities.value.webSearch,
			buildWebSearchArgs(),
			fallbackWebSearchCredential.value,
		),
	);
}

function onWebSearchOptionInput() {
	emitWebSearchConfig();
}

function onWebSearchMethodChange(value: WebSearchSelectValue) {
	webSearchMethod.value = value;
	webSearchEnabled.value = value !== 'off';
	const method = value === 'off' ? 'native' : value;
	const nextFallbackProvider = value === 'brave' || value === 'searxng' ? value : null;
	if (nextFallbackProvider && nextFallbackProvider !== fallbackWebSearchProvider.value) {
		fallbackWebSearchCredential.value = '';
	}
	if (nextFallbackProvider) {
		fallbackWebSearchProvider.value = nextFallbackProvider;
	}
	emit(
		'update:config',
		withWebSearchConfig(
			props.config,
			webSearchEnabled.value,
			method,
			capabilities.value.webSearch,
			buildWebSearchArgs(),
			fallbackWebSearchCredential.value,
		),
	);
}

function onFallbackCredentialChange(value: string) {
	fallbackWebSearchCredential.value = value;
	emit(
		'update:config',
		withWebSearchConfig(
			props.config,
			webSearchEnabled.value,
			webSearchMethod.value === 'off' ? 'native' : webSearchMethod.value,
			capabilities.value.webSearch,
			buildWebSearchArgs(),
			value,
		),
	);
}

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
	<div
		:class="$style.panel"
		:data-state="isExpanded ? 'open' : 'closed'"
		data-testid="agent-behavior-panel"
	>
		<button
			type="button"
			:class="[$style.header, { [$style.collapsibleHeader]: props.collapsible }]"
			:aria-expanded="isExpanded"
			:aria-disabled="!props.collapsible"
			data-testid="agent-advanced-trigger"
			@click="props.collapsible && (isExpanded = !isExpanded)"
		>
			<N8nText tag="h3" :bold="true" data-testid="agent-advanced-title">{{
				i18n.baseText('agents.builder.advanced.title')
			}}</N8nText>
			<N8nIcon
				v-if="props.collapsible"
				icon="chevron-down"
				size="small"
				:class="$style.chevron"
				data-testid="agent-advanced-chevron"
			/>
		</button>
		<div v-show="isExpanded" :class="$style.content" data-testid="agent-advanced-content">
			<div :class="$style.settingGroup">
				<div :class="$style.row">
					<div :class="$style.rowLabel">
						<N8nText step="sm" bold :class="shared.dataEntryLabel">{{
							i18n.baseText('agents.builder.advanced.webSearch.label')
						}}</N8nText>
						<N8nText size="small" :class="shared.dataEntrySubLabel">
							{{ i18n.baseText('agents.builder.advanced.webSearch.hint') }}
						</N8nText>
					</div>
					<N8nSelect
						:model-value="webSearchMethod"
						size="small"
						:disabled="props.disabled"
						:class="$style.shortInput"
						data-testid="agent-web-search-method"
						@update:model-value="(v) => onWebSearchMethodChange(v as WebSearchSelectValue)"
					>
						<N8nOption
							value="off"
							:label="i18n.baseText('agents.builder.advanced.webSearch.method.off')"
						/>
						<N8nOption
							v-if="capabilities.webSearch"
							value="native"
							:label="i18n.baseText('agents.builder.advanced.webSearch.method.native')"
						/>
						<N8nOption
							value="brave"
							:label="i18n.baseText('agents.builder.advanced.webSearch.fallbackProvider.brave')"
						/>
						<N8nOption
							value="searxng"
							:label="i18n.baseText('agents.builder.advanced.webSearch.fallbackProvider.searxng')"
						/>
					</N8nSelect>
				</div>

				<div
					v-if="webSearchEnabled"
					:class="$style.subSettings"
					data-testid="agent-web-search-settings"
				>
					<div
						v-if="webSearchMethod === 'native' && capabilities.webSearch === 'anthropic.web_search'"
						:class="$style.row"
					>
						<div :class="$style.rowLabel">
							<N8nText step="sm" bold :class="shared.dataEntryLabel">{{
								i18n.baseText('agents.builder.advanced.webSearch.maxUses.label')
							}}</N8nText>
							<N8nText size="small" :class="shared.dataEntrySubLabel">
								{{ i18n.baseText('agents.builder.advanced.webSearch.maxUses.hint') }}
							</N8nText>
						</div>
						<N8nInputNumber
							:model-value="Number(webSearchMaxUses)"
							:min="1"
							:precision="0"
							:controls="false"
							:disabled="props.disabled"
							:class="$style.shortInput"
							data-testid="agent-web-search-max-uses"
							@update:model-value="
								(v) => {
									webSearchMaxUses = String(v);
									onWebSearchOptionInput();
								}
							"
						/>
					</div>

					<div
						v-if="webSearchMethod === 'native' && capabilities.webSearch === 'openai.web_search'"
						:class="$style.row"
					>
						<div :class="$style.rowLabel">
							<N8nText step="sm" bold :class="shared.dataEntryLabel">{{
								i18n.baseText('agents.builder.advanced.webSearch.externalAccess.label')
							}}</N8nText>
							<N8nText size="small" :class="shared.dataEntrySubLabel">
								{{ i18n.baseText('agents.builder.advanced.webSearch.externalAccess.hint') }}
							</N8nText>
						</div>
						<N8nSwitch2
							:model-value="webSearchExternalAccess"
							:disabled="props.disabled"
							:class="$style.switchControl"
							data-testid="agent-web-search-external-access"
							@update:model-value="
								(v) => {
									webSearchExternalAccess = Boolean(v);
									onWebSearchOptionInput();
								}
							"
						/>
					</div>

					<div
						v-if="webSearchMethod === 'native' && capabilities.webSearch === 'openai.web_search'"
						:class="$style.row"
					>
						<N8nText step="sm" bold :class="shared.dataEntryLabel">{{
							i18n.baseText('agents.builder.advanced.webSearch.contextSize.label')
						}}</N8nText>
						<N8nSelect
							:model-value="webSearchContextSize"
							size="small"
							:disabled="props.disabled"
							:class="$style.shortInput"
							data-testid="agent-web-search-context-size"
							@update:model-value="
								(v) => {
									webSearchContextSize = v as SearchContextSize;
									onWebSearchOptionInput();
								}
							"
						>
							<N8nOption
								v-for="opt in SEARCH_CONTEXT_SIZE_OPTIONS"
								:key="opt"
								:value="opt"
								:label="opt"
							/>
						</N8nSelect>
					</div>

					<div v-if="webSearchMethod !== 'native'" :class="$style.row">
						<div :class="$style.rowLabel">
							<N8nText step="sm" bold :class="shared.dataEntryLabel">{{
								i18n.baseText('agents.builder.advanced.webSearch.credential.label')
							}}</N8nText>
							<N8nText size="small" :class="shared.dataEntrySubLabel">
								{{ i18n.baseText('agents.builder.advanced.webSearch.credential.hint') }}
							</N8nText>
						</div>
						<N8nSelect
							:model-value="fallbackWebSearchCredential"
							size="small"
							:disabled="props.disabled"
							:class="$style.credentialSelect"
							data-testid="agent-web-search-fallback-credential"
							@update:model-value="(v) => onFallbackCredentialChange(String(v))"
						>
							<N8nOption
								v-for="credential in fallbackCredentials"
								:key="credential.id"
								:value="credential.id"
								:label="credential.name"
							/>
						</N8nSelect>
					</div>
				</div>
			</div>

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
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';
.panel {
	width: 100%;
}

.panel.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.header {
	all: unset;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	width: 100%;
}

.header h3 {
	margin: 0;
}

.collapsibleHeader {
	cursor: pointer;

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
		border-radius: var(--radius--sm);
	}
}

.chevron {
	flex-shrink: 0;
	color: var(--text-color--subtler);
	transform: rotate(0deg);
	transition: transform var(--animation--duration) var(--animation--easing);
	@include motion.reduced-motion;
}

.panel[data-state='open'] .chevron {
	transform: rotate(180deg);
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
