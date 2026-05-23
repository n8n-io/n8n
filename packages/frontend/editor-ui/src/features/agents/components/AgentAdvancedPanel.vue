<script setup lang="ts">
/**
 * Behavior panel — execution-behavior knobs that used to live in the old
 * AgentOverviewPanel: native web search, reasoning depth (provider-gated),
 * and tool-call concurrency.
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

import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { AgentJsonConfig } from '../types';
import {
	PROVIDER_CAPABILITIES,
	REASONING_EFFORT_OPTIONS,
	type ReasoningEffort,
} from '../provider-capabilities';
import { parseProvider } from '../utils/model-string';
import {
	getNativeWebSearchArgs,
	type NativeWebSearchArgs,
	withNativeWebSearchConfig,
} from '../utils/nativeWebSearch';

const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const DEFAULT_CAPABILITIES = { thinking: false, webSearch: false, providerTools: [] } as const;
const ANTHROPIC_WEB_SEARCH_DEFAULT_MAX_USES = 5;
const SEARCH_CONTEXT_SIZE_OPTIONS = ['low', 'medium', 'high'] as const;
const FALLBACK_WEB_SEARCH_PROVIDERS = ['brave', 'searxng'] as const;
type SearchContextSize = (typeof SEARCH_CONTEXT_SIZE_OPTIONS)[number];
type FallbackWebSearchProvider = (typeof FALLBACK_WEB_SEARCH_PROVIDERS)[number];

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
const capabilities = computed(() => PROVIDER_CAPABILITIES[provider.value] ?? DEFAULT_CAPABILITIES);

const webSearchEnabled = ref(props.config?.config?.webSearch?.enabled === true);
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
const thinkingCfg = computed(() => props.config?.config?.thinking ?? null);
const thinkingEnabled = ref(thinkingCfg.value !== null);
const budgetTokens = ref(thinkingCfg.value?.budgetTokens ?? 1024);
const reasoningEffort = ref<ReasoningEffort>(
	(thinkingCfg.value?.reasoningEffort as ReasoningEffort) ?? 'medium',
);
const toolCallConcurrency = ref(props.config?.config?.toolCallConcurrency ?? 1);

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
		const t = cfg.config?.thinking ?? null;
		thinkingEnabled.value = t !== null;
		budgetTokens.value = t?.budgetTokens ?? 1024;
		reasoningEffort.value = (t?.reasoningEffort as ReasoningEffort) ?? 'medium';
		toolCallConcurrency.value = cfg.config?.toolCallConcurrency ?? 1;
		webSearchEnabled.value = cfg.config?.webSearch?.enabled === true;
		webSearchArgs.value = getNativeWebSearchArgs(cfg, capabilities.value.webSearch);
		fallbackWebSearchProvider.value =
			cfg.config?.webSearch?.provider === 'searxng' ? 'searxng' : 'brave';
		fallbackWebSearchCredential.value = cfg.config?.webSearch?.credential ?? '';
		syncWebSearchOptions(webSearchArgs.value);
	},
	{ deep: true },
);

const fallbackCredentialType = computed(() =>
	fallbackWebSearchProvider.value === 'brave' ? 'braveSearchApi' : 'searXngApi',
);
const fallbackCredentials = computed(() =>
	credentialsStore.allCredentials.filter(
		(credential) => credential.type === fallbackCredentialType.value,
	),
);

function withFallbackWebSearchConfig(enabled: boolean): Partial<AgentJsonConfig> {
	return {
		config: {
			...(props.config?.config ?? {}),
			webSearch: enabled
				? {
						enabled: true,
						provider: fallbackWebSearchProvider.value,
						...(fallbackWebSearchCredential.value && {
							credential: fallbackWebSearchCredential.value,
						}),
					}
				: { enabled: false },
		},
	};
}

function onWebSearchToggle(value: boolean) {
	webSearchEnabled.value = value;
	if (!capabilities.value.webSearch) {
		emit('update:config', withFallbackWebSearchConfig(value));
		return;
	}
	emit(
		'update:config',
		withNativeWebSearchConfig(
			props.config,
			value,
			capabilities.value.webSearch,
			buildWebSearchArgs(),
		),
	);
}

function buildWebSearchArgs(): NativeWebSearchArgs {
	const tool = capabilities.value.webSearch;
	if (!tool) return {};

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

const emitWebSearchConfig = useDebounceFn(() => {
	if (!capabilities.value.webSearch || !webSearchEnabled.value) return;
	emit(
		'update:config',
		withNativeWebSearchConfig(
			props.config,
			true,
			capabilities.value.webSearch,
			buildWebSearchArgs(),
		),
	);
}, 500);

function onWebSearchOptionInput() {
	void emitWebSearchConfig();
}

function onFallbackProviderChange(value: FallbackWebSearchProvider) {
	fallbackWebSearchProvider.value = value;
	fallbackWebSearchCredential.value = '';
	emit('update:config', withFallbackWebSearchConfig(webSearchEnabled.value));
}

function onFallbackCredentialChange(value: string) {
	fallbackWebSearchCredential.value = value;
	emit('update:config', withFallbackWebSearchConfig(webSearchEnabled.value));
}

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

const webSearchDisabledReason = computed(() => '');
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
			<div :class="$style.settingGroup">
				<div :class="$style.row">
					<div :class="$style.rowLabel">
						<N8nText size="small" :bold="true">{{
							i18n.baseText('agents.builder.advanced.webSearch.label')
						}}</N8nText>
						<N8nText size="xsmall" color="text-light">
							{{ i18n.baseText('agents.builder.advanced.webSearch.hint') }}
						</N8nText>
					</div>
					<N8nTooltip :content="webSearchDisabledReason" :disabled="true" placement="top">
						<N8nSwitch2
							:model-value="webSearchEnabled"
							:disabled="props.disabled"
							:class="$style.switchControl"
							data-testid="agent-web-search-toggle"
							@update:model-value="(v) => onWebSearchToggle(Boolean(v))"
						/>
					</N8nTooltip>
				</div>

				<div
					v-if="webSearchEnabled"
					:class="$style.subSettings"
					data-testid="agent-web-search-settings"
				>
					<div v-if="capabilities.webSearch === 'anthropic.web_search'" :class="$style.row">
						<div :class="$style.rowLabel">
							<N8nText size="small" :bold="true">{{
								i18n.baseText('agents.builder.advanced.webSearch.maxUses.label')
							}}</N8nText>
							<N8nText size="xsmall" color="text-light">
								{{ i18n.baseText('agents.builder.advanced.webSearch.maxUses.hint') }}
							</N8nText>
						</div>
						<N8nInput
							type="number"
							:model-value="webSearchMaxUses"
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

					<div v-if="capabilities.webSearch === 'openai.web_search'" :class="$style.row">
						<div :class="$style.rowLabel">
							<N8nText size="small" :bold="true">{{
								i18n.baseText('agents.builder.advanced.webSearch.externalAccess.label')
							}}</N8nText>
							<N8nText size="xsmall" color="text-light">
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

					<div v-if="capabilities.webSearch === 'openai.web_search'" :class="$style.row">
						<N8nText size="small" :bold="true">{{
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

					<div v-if="!capabilities.webSearch" :class="$style.row">
						<N8nText size="small" :bold="true">{{
							i18n.baseText('agents.builder.advanced.webSearch.fallbackProvider.label')
						}}</N8nText>
						<N8nSelect
							:model-value="fallbackWebSearchProvider"
							size="small"
							:disabled="props.disabled"
							:class="$style.shortInput"
							data-testid="agent-web-search-fallback-provider"
							@update:model-value="(v) => onFallbackProviderChange(v as FallbackWebSearchProvider)"
						>
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

					<div v-if="!capabilities.webSearch" :class="$style.row">
						<div :class="$style.rowLabel">
							<N8nText size="small" :bold="true">{{
								i18n.baseText('agents.builder.advanced.webSearch.credential.label')
							}}</N8nText>
							<N8nText size="xsmall" color="text-light">
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
							:class="$style.switchControl"
							data-testid="agent-thinking-toggle"
							@update:model-value="(v) => onThinkingToggle(Boolean(v))"
						/>
					</N8nTooltip>
				</div>

				<div
					v-if="thinkingEnabled && capabilities.thinking"
					:class="$style.subSettings"
					data-testid="agent-thinking-settings"
				>
					<div v-if="capabilities.thinking === 'budgetTokens'" :class="$style.row">
						<div :class="$style.rowLabel">
							<N8nText size="small" :bold="true">{{
								i18n.baseText('agents.builder.advanced.budgetTokens.label')
							}}</N8nText>
							<N8nText size="xsmall" color="text-light">
								{{ i18n.baseText('agents.builder.advanced.budgetTokens.hint') }}
							</N8nText>
						</div>
						<N8nInput
							type="number"
							:model-value="String(budgetTokens)"
							:disabled="props.disabled"
							:class="$style.shortInput"
							data-testid="agent-budget-tokens-input"
							@update:model-value="onBudgetInput"
						/>
					</div>

					<div v-if="capabilities.thinking === 'reasoningEffort'" :class="$style.row">
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
							<N8nOption
								v-for="opt in REASONING_EFFORT_OPTIONS"
								:key="opt"
								:value="opt"
								:label="opt"
							/>
						</N8nSelect>
					</div>
				</div>
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
