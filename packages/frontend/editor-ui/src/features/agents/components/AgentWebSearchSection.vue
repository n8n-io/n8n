<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
	N8nButton,
	N8nDropdownMenu,
	N8nInputNumber,
	N8nSegmentControl,
	N8nSwitch2,
	N8nText,
	N8nIcon,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';

import { useAiGateway } from '@/app/composables/useAiGateway';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { AgentJsonConfig } from '../types';
import { AGENT_MODEL_PROVIDER_DEFINITIONS, isAgentModelProvider } from '../model-providers';
import { PROVIDER_CAPABILITIES } from '../provider-capabilities';
import { parseProvider } from '../utils/model-string';
import {
	getNativeWebSearchArgs,
	getWebSearchMethod,
	type FallbackWebSearchProvider,
	type NativeWebSearchArgs,
	type WebSearchMethod,
	withWebSearchConfig,
} from '../utils/nativeWebSearch';
import AgentCredentialSelect, {
	type AgentCredentialOption,
	type ManagedCredentialOption,
} from './AgentCredentialSelect.vue';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		disabled?: boolean;
		projectId?: string;
	}>(),
	{ disabled: false },
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();
const aiGateway = useAiGateway();

onMounted(() => {
	// Load the gateway config so the managed option can be gated, and the wallet
	// for its balance subtitle. Both self-guard when n8n Connect is disabled.
	void aiGateway.fetchConfig();
	if (aiGateway.isEnabled.value) void aiGateway.fetchWallet();
});
const DEFAULT_CAPABILITIES = { webSearch: false } as const;
const ANTHROPIC_WEB_SEARCH_DEFAULT_MAX_USES = 5;
const SEARCH_CONTEXT_SIZE_OPTIONS = ['low', 'medium', 'high'] as const;
type SearchContextSize = (typeof SEARCH_CONTEXT_SIZE_OPTIONS)[number];
type WebSearchSelectValue = 'off' | WebSearchMethod;

const searchContextSizeSegments = computed<Array<{ label: string; value: SearchContextSize }>>(
	function getSearchContextSizeSegments() {
		return [
			{
				label: i18n.baseText('agents.builder.advanced.webSearch.contextSize.low'),
				value: 'low',
			},
			{
				label: i18n.baseText('agents.builder.advanced.webSearch.contextSize.medium'),
				value: 'medium',
			},
			{
				label: i18n.baseText('agents.builder.advanced.webSearch.contextSize.high'),
				value: 'high',
			},
		];
	},
);
const provider = computed(() => parseProvider(props.config?.model));
const capabilities = computed(() => PROVIDER_CAPABILITIES[provider.value] ?? DEFAULT_CAPABILITIES);
const hasNativeWebSearch = computed(() => Boolean(capabilities.value.webSearch));
const nativeWebSearchLabel = computed(() =>
	isAgentModelProvider(provider.value)
		? AGENT_MODEL_PROVIDER_DEFINITIONS[provider.value].displayName
		: provider.value,
);

const webSearchMenuItems = computed<Array<DropdownMenuItemProps<WebSearchSelectValue>>>(() => [
	{
		id: 'off',
		label: i18n.baseText('agents.builder.advanced.webSearch.method.off'),
		checked: webSearchMethod.value === 'off',
	},
	...(capabilities.value.webSearch
		? [
				{
					id: 'native' as const,
					label: nativeWebSearchLabel.value,
					checked: webSearchMethod.value === 'native',
				},
			]
		: []),
	{
		id: 'brave',
		label: i18n.baseText('agents.builder.advanced.webSearch.fallbackProvider.brave'),
		checked: webSearchMethod.value === 'brave',
		divided: true,
	},
	{
		id: 'searxng',
		label: i18n.baseText('agents.builder.advanced.webSearch.fallbackProvider.searxng'),
		checked: webSearchMethod.value === 'searxng',
	},
]);
const selectedWebSearchLabel = computed(
	() => webSearchMenuItems.value.find((item) => item.checked)?.label ?? '',
);

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

// Balance pill for the managed row, matching NodeCredentials.
const balancePill = computed<{ text: string; type: 'default' | 'danger' } | undefined>(() => {
	const balance = aiGateway.balance.value;
	if (balance === undefined) return undefined;
	const depleted = balance <= 0;
	return {
		text: depleted
			? i18n.baseText('aiGateway.wallet.noCredits')
			: i18n.baseText('aiGateway.wallet.balanceRemaining', {
					interpolate: { balance: `$${Number(balance).toFixed(2)}` },
				}),
		type: depleted ? 'danger' : 'default',
	};
});

// n8n Connect (Gateway credits) is offered as a credential option only when the
// gateway can actually serve the selected provider's credential type. SearXNG is
// self-hosted, so this stays hidden for it.
const managedCredentialOption = computed<ManagedCredentialOption | null>(() => {
	if (
		!aiGateway.isEnabled.value ||
		!aiGateway.canServeCredentialType(fallbackCredentialType.value)
	) {
		return null;
	}
	return {
		value: AI_GATEWAY_MANAGED_TAG,
		label: i18n.baseText('aiGateway.credentialMode.n8nConnect.title'),
		...(balancePill.value && { pill: balancePill.value }),
	};
});

const fallbackCredentials = computed<AgentCredentialOption[]>(() =>
	credentialsStore.allCredentials
		.filter((credential) => credential.type === fallbackCredentialType.value)
		.map((credential) => ({
			id: credential.id,
			name: credential.name,
			typeDisplayName: credentialsStore.getCredentialTypeByName(credential.type)?.displayName,
			homeProject: credential.homeProject,
		})),
);

const projectForPermissions = computed(() => {
	if (projectsStore.currentProject?.id === props.projectId) return projectsStore.currentProject;
	if (projectsStore.personalProject?.id === props.projectId) return projectsStore.personalProject;
	return projectsStore.myProjects.find((project) => project.id === props.projectId) ?? null;
});

const credentialPermissions = computed(() => {
	const permissions = getResourcePermissions(projectForPermissions.value?.scopes).credential;
	return { ...permissions, create: !!permissions.create };
});

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

function onWebSearchContextSizeChange(value: SearchContextSize) {
	webSearchContextSize.value = value;
	onWebSearchOptionInput();
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

function onCreateFallbackCredential() {
	if (props.disabled || !credentialPermissions.value.create) return;
	uiStore.openNewCredential(
		fallbackCredentialType.value,
		false,
		false,
		props.projectId,
		undefined,
		undefined,
		undefined,
		{
			hideAskAssistant: true,
			onCredentialCreated: (credential) => onFallbackCredentialChange(credential.id),
		},
	);
}
</script>

<template>
	<div :class="$style.content" data-testid="agent-web-search-content">
		<div :class="$style.settingGroup">
			<div :class="$style.row">
				<div :class="$style.rowLabel">
					<N8nText step="sm" bold>{{
						i18n.baseText('agents.builder.advanced.webSearch.label')
					}}</N8nText>
					<N8nText step="sm" color="text-light">{{
						i18n.baseText('agents.builder.advanced.webSearch.hint')
					}}</N8nText>
				</div>

				<N8nDropdownMenu
					:items="webSearchMenuItems"
					:disabled="props.disabled"
					placement="bottom-end"
					data-testid="agent-web-search-method"
					@select="onWebSearchMethodChange"
				>
					<template #trigger>
						<N8nButton variant="outline" :disabled="props.disabled" :class="$style.shortInput">
							<span :class="$style.dropdownTriggerLabel">{{ selectedWebSearchLabel }}</span>
							<N8nIcon icon="chevron-down" size="small" color="text-light" />
						</N8nButton>
					</template>
				</N8nDropdownMenu>
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
						<N8nText step="sm" bold>{{
							i18n.baseText('agents.builder.advanced.webSearch.maxUses.label')
						}}</N8nText>
						<N8nText step="sm" color="text-light">
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
						<N8nText step="sm" bold>{{
							i18n.baseText('agents.builder.advanced.webSearch.externalAccess.label')
						}}</N8nText>
						<N8nText step="sm" color="text-light">
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
					<div :class="$style.rowLabel">
						<N8nText step="sm" bold>{{
							i18n.baseText('agents.builder.advanced.webSearch.contextSize.label')
						}}</N8nText>
						<N8nText step="sm" color="text-light">
							{{ i18n.baseText('agents.builder.advanced.webSearch.contextSize.hint') }}
						</N8nText>
					</div>
					<N8nSegmentControl
						:model-value="webSearchContextSize"
						:options="searchContextSizeSegments"
						size="default"
						:disabled="props.disabled"
						data-testid="agent-web-search-context-size"
						@update:model-value="onWebSearchContextSizeChange"
					/>
				</div>

				<div v-if="webSearchMethod !== 'native'" :class="$style.row">
					<div :class="$style.rowLabel">
						<N8nText step="sm" bold>{{
							i18n.baseText('agents.builder.advanced.webSearch.credential.label')
						}}</N8nText>
						<N8nText step="sm" color="text-light">
							{{ i18n.baseText('agents.builder.advanced.webSearch.credential.hint') }}
						</N8nText>
					</div>
					<AgentCredentialSelect
						:model-value="fallbackWebSearchCredential"
						:credentials="fallbackCredentials"
						:managed-option="managedCredentialOption"
						:placeholder="i18n.baseText('agents.builder.advanced.webSearch.credential.placeholder')"
						:credential-permissions="credentialPermissions"
						:disabled="props.disabled"
						:class="$style.credentialSelect"
						data-test-id="agent-web-search-fallback-credential"
						@update:model-value="onFallbackCredentialChange"
						@create="onCreateFallbackCredential"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.settingGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
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
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
}

.shortInput {
	max-width: 140px;
	width: fit-content;
	flex-shrink: 0;
}

.dropdownTriggerLabel {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.credentialSelect {
	max-width: 220px;
	flex-shrink: 0;
}

.switchControl:not([data-disabled]) {
	cursor: pointer;
}
</style>
