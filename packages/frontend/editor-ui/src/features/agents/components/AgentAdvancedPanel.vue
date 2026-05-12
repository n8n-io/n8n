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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { AgentMemoryProfilesResponse } from '@n8n/api-types';
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
import { useRootStore } from '@n8n/stores/useRootStore';

import { getAgentMemoryProfiles } from '../composables/useAgentApi';
import type { AgentJsonConfig } from '../types';
import {
	PROVIDER_CAPABILITIES,
	REASONING_EFFORT_OPTIONS,
	type ReasoningEffort,
} from '../provider-capabilities';
import { parseProvider } from '../utils/model-string';
import AgentMiniEditor from './AgentMiniEditor.vue';

const PROFILE_POLL_INTERVAL_MS = 5000;
const i18n = useI18n();
const rootStore = useRootStore();

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		projectId?: string;
		agentId?: string;
		disabled?: boolean;
		collapsible?: boolean;
	}>(),
	{
		agentId: undefined,
		disabled: false,
		collapsible: false,
		projectId: undefined,
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
const requireToolApproval = ref(props.config?.config?.requireToolApproval ?? false);
const profileKey = computed(() =>
	props.projectId && props.agentId ? `${props.projectId}:${props.agentId}` : null,
);
const loadedProfileKey = ref<string | null>(null);
const loadingProfileKeys = ref(new Set<string>());
const profileError = ref(false);
const profile = ref<AgentMemoryProfilesResponse | null>(null);
let profilePollInterval: ReturnType<typeof setInterval> | null = null;

const canLoadProfile = computed(() => !props.disabled && Boolean(props.projectId && props.agentId));
const profileLoaded = computed(() => loadedProfileKey.value === profileKey.value);
const profileLoading = computed(
	() => profileKey.value !== null && loadingProfileKeys.value.has(profileKey.value),
);

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

async function loadProfile() {
	const key = profileKey.value;
	const projectId = props.projectId;
	const agentId = props.agentId;
	if (!canLoadProfile.value || !projectId || !agentId || !key) return;
	if (loadingProfileKeys.value.has(key)) return;

	loadingProfileKeys.value = new Set([...loadingProfileKeys.value, key]);
	profileError.value = false;

	try {
		const loadedProfile = await getAgentMemoryProfiles(rootStore.restApiContext, projectId, agentId);
		if (profileKey.value !== key) return;
		profile.value = loadedProfile;
		loadedProfileKey.value = key;
	} catch {
		if (profileKey.value !== key) return;
		profileError.value = true;
	} finally {
		const nextLoadingKeys = new Set(loadingProfileKeys.value);
		nextLoadingKeys.delete(key);
		loadingProfileKeys.value = nextLoadingKeys;
	}
}

function stopProfilePolling() {
	if (profilePollInterval === null) return;
	clearInterval(profilePollInterval);
	profilePollInterval = null;
}

function startProfilePolling() {
	stopProfilePolling();
	if (!isExpanded.value || !canLoadProfile.value) return;

	profilePollInterval = setInterval(() => {
		void loadProfile();
	}, PROFILE_POLL_INTERVAL_MS);
}

watch(isExpanded, (expanded) => {
	if (!expanded) {
		stopProfilePolling();
		return;
	}

	void loadProfile();
	startProfilePolling();
});

watch(
	profileKey,
	() => {
		profile.value = null;
		loadedProfileKey.value = null;
		if (isExpanded.value) {
			void loadProfile();
			startProfilePolling();
		}
	},
);

watch(canLoadProfile, (canLoad) => {
	if (!canLoad) {
		stopProfilePolling();
		return;
	}

	if (isExpanded.value) {
		void loadProfile();
		startProfilePolling();
	}
});

onMounted(() => {
	if (!isExpanded.value || !canLoadProfile.value) return;
	void loadProfile();
	startProfilePolling();
});

onBeforeUnmount(stopProfilePolling);

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
		<div :class="$style.content" data-testid="agent-advanced-content">
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

			<div :class="$style.row">
				<div :class="$style.rowLabel">
					<N8nText size="small" :bold="true">{{
						i18n.baseText('agents.builder.advanced.approval.label')
					}}</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('agents.builder.advanced.approval.hint') }}
					</N8nText>
				</div>
				<N8nSwitch2
					:model-value="requireToolApproval"
					:disabled="props.disabled"
					data-testid="agent-require-approval-toggle"
					@update:model-value="(v) => onApprovalToggle(Boolean(v))"
				/>
			</div>

			<div :class="$style.profileDivider" data-testid="agent-user-profile-divider" />

			<section :class="$style.profileSection" data-testid="agent-user-profile-section">
				<div :class="$style.rowLabel">
					<N8nText size="small" :bold="true">
						{{ i18n.baseText('agents.builder.memory.profiles.title') }}
					</N8nText>
					<N8nText v-if="profileLoading" size="xsmall" color="text-light">
						{{ i18n.baseText('agents.builder.memory.profiles.loading') }}
					</N8nText>
					<N8nText v-else-if="profileError" size="xsmall" color="danger">
						{{ i18n.baseText('agents.builder.memory.profiles.error') }}
					</N8nText>
					<template v-else>
						<N8nText size="xsmall" color="text-light">
							{{ i18n.baseText('agents.builder.memory.profiles.userProfile.description') }}
						</N8nText>
					</template>
				</div>
				<div v-if="!profileLoading && !profileError" :class="$style.profileContent">
					<AgentMiniEditor
						:class="$style.profileEditor"
						:model-value="
							profile?.userProfile ??
							i18n.baseText('agents.builder.memory.profiles.userProfile.empty')
						"
						language="markdown"
						readonly
						min-height="240px"
						max-height="240px"
						data-testid="agent-memory-user-profile"
					/>
				</div>
			</section>
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

.profileDivider {
	border-top: var(--border);
	margin: var(--spacing--xs) 0 0;
}

.profileSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.profileContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.profileEditor {
	height: 240px;
	min-height: 0;
	display: flex;
}

.profileEditor > :global(.cm-editor) {
	flex: 1;
	min-height: 0;
}
</style>
