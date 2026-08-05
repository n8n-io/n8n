<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type {
	InstanceAiConnectionUpdate,
	InstanceAiVerificationFailure,
	InstanceAiVerificationResponse,
} from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogFooter,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nOption,
	N8nRadioGroup,
	N8nRadioGroupItem,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import {
	INSTANCE_AI_MODEL_PROVIDERS,
	INSTANCE_AI_SANDBOX_PROVIDERS,
	INSTANCE_AI_SEARCH_PROVIDERS,
	type InstanceAiModelProvider,
	type InstanceAiSearchProvider,
} from '../instanceAiConnection.constants';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import type { InstanceAiOnboardingStep } from './useInstanceAiOnboarding';

const DAYTONA_API_URL = 'https://app.daytona.io/api';
const N8N_SANDBOX_HEADER = 'x-api-key';
const STATIC_SECRET_MASK = '••••••••••••';
const SANDBOX_DOCS_URL =
	'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-ai-assistant#configure-a-sandbox-provider';
const SEARXNG_DOCS_URL = 'https://docs.searxng.org/admin/installation.html';
const ENV_DOCS_URL =
	'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-ai-assistant-preview';
const DEFAULT_MODEL_PROVIDER = INSTANCE_AI_MODEL_PROVIDERS[0]!;
type VerificationSuccess = Extract<InstanceAiVerificationResponse, { ok: true }>;
const VERIFICATION_FAILURE_COPY: Record<InstanceAiVerificationFailure, BaseTextKey> = {
	unauthorized: 'instanceAi.onboarding.verification.unauthorized',
	forbidden: 'instanceAi.onboarding.verification.forbidden',
	timeout: 'instanceAi.onboarding.verification.timeout',
	rate_limited: 'instanceAi.onboarding.verification.rate_limited',
	quota_exceeded: 'instanceAi.onboarding.verification.quota_exceeded',
	unreachable: 'instanceAi.onboarding.verification.unreachable',
	invalid_response: 'instanceAi.onboarding.verification.invalid_response',
	provider_error: 'instanceAi.onboarding.verification.provider_error',
};

const props = defineProps<{
	open: boolean;
	step: InstanceAiOnboardingStep;
	editMode: boolean;
	sequence: InstanceAiOnboardingStep[];
	modelValue: string;
	sandboxValue: string;
	searchValue: string;
	composeFastPath: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	advance: [];
	back: [];
	edit: [step: Exclude<InstanceAiOnboardingStep, 'done'>];
	completed: [];
}>();

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
const credentialsStore = useCredentialsStore();

const busy = ref(false);
const failure = ref<InstanceAiVerificationFailure | null>(null);
const success = ref<VerificationSuccess | null>(null);
const modelProvider = ref<InstanceAiModelProvider>('anthropic');
const modelApiKey = ref('');
const modelBaseUrl = ref('');
const modelName = ref<string>(DEFAULT_MODEL_PROVIDER.models[0] ?? '');
const sandboxProvider = ref<'n8n-sandbox' | 'daytona' | null>(null);
const sandboxServiceUrl = ref('');
const sandboxApiKey = ref('');
const daytonaApiKey = ref('');
const searchProvider = ref<InstanceAiSearchProvider | null>(null);
const searchInput = ref('');
const baseline = ref('');

const modelConfig = computed(
	() =>
		INSTANCE_AI_MODEL_PROVIDERS.find(({ id }) => id === modelProvider.value) ??
		DEFAULT_MODEL_PROVIDER,
);
const modelConnectionLocked = computed(() => store.settings?.envManaged.model.provider === true);
const modelNameLocked = computed(() => store.settings?.envManaged.model.model === true);
const sandboxEnvManaged = computed(() => store.settings?.sandboxEnvConfigured === true);
const searchEnvManaged = computed(() => store.settings?.searchEnvConfigured === true);

function formSnapshot(): string {
	return JSON.stringify({
		modelProvider: modelProvider.value,
		modelApiKey: modelApiKey.value,
		modelBaseUrl: modelBaseUrl.value,
		modelName: modelName.value,
		sandboxProvider: sandboxProvider.value,
		sandboxServiceUrl: sandboxServiceUrl.value,
		sandboxApiKey: sandboxApiKey.value,
		daytonaApiKey: daytonaApiKey.value,
		searchProvider: searchProvider.value,
		searchValue: searchInput.value,
	});
}

const changed = computed(() => formSnapshot() !== baseline.value);
const stepReady = computed(() => {
	if (props.step === 'done') return true;
	if (props.step === 'model') {
		if (modelConnectionLocked.value)
			return modelNameLocked.value || modelName.value.trim().length > 0;
		return Boolean(
			modelName.value.trim() &&
				(modelProvider.value === 'custom' ? modelBaseUrl.value.trim() : modelApiKey.value.trim()),
		);
	}
	if (props.step === 'sandbox') {
		if (sandboxEnvManaged.value) return true;
		if (sandboxProvider.value === 'daytona') return Boolean(daytonaApiKey.value.trim());
		if (sandboxProvider.value === 'n8n-sandbox') {
			return Boolean(sandboxServiceUrl.value.trim() && sandboxApiKey.value.trim());
		}
		return false;
	}
	if (searchEnvManaged.value) return true;
	if (searchProvider.value === 'disabled') return true;
	return Boolean(searchProvider.value && searchInput.value.trim());
});
const primaryDisabled = computed(
	() => busy.value || !stepReady.value || (props.editMode && !changed.value),
);
const canGoBack = computed(() => {
	if (props.editMode) return false;
	return props.sequence.indexOf(props.step) > 0 && props.step !== 'done';
});
const visibleSetupSteps = computed(() => props.sequence.filter((step) => step !== 'done'));
const primaryLabel = computed(() => {
	if (busy.value) return i18n.baseText('instanceAi.onboarding.wizard.testing');
	if (props.step === 'done') return i18n.baseText('instanceAi.onboarding.wizard.startUsing');
	if (props.editMode) return i18n.baseText('instanceAi.onboarding.wizard.apply');
	return i18n.baseText('instanceAi.onboarding.wizard.continue');
});

function readString(data: unknown, field: string): string {
	if (typeof data !== 'object' || data === null) return '';
	const value = Reflect.get(data, field);
	return typeof value === 'string' ? value : '';
}

async function credentialData(id: string | null | undefined): Promise<unknown> {
	if (!id) return undefined;
	try {
		const credential = await credentialsStore.getCredentialData({ id });
		if (!credential || !('data' in credential)) return undefined;
		return credential.data;
	} catch {
		return undefined;
	}
}

async function hydrateModel(): Promise<void> {
	modelProvider.value = 'anthropic';
	modelApiKey.value = '';
	modelBaseUrl.value = '';
	modelName.value = store.settings?.modelName || DEFAULT_MODEL_PROVIDER.models[0] || '';
	if (modelConnectionLocked.value) {
		if (modelNameLocked.value) modelName.value = '';
		return;
	}
	const assigned = store.instanceModelCredentials.find(
		({ id }) => id === store.settings?.modelCredentialId,
	);
	if (!assigned) return;
	const data = await credentialData(assigned.id);
	modelApiKey.value = readString(data, 'apiKey');
	modelBaseUrl.value = readString(data, 'url');
	if (assigned.type === 'anthropicApi') modelProvider.value = 'anthropic';
	else if (assigned.type === 'openRouterApi') modelProvider.value = 'openrouter';
	else modelProvider.value = modelBaseUrl.value ? 'custom' : 'openai';
}

async function hydrateSandbox(): Promise<void> {
	sandboxProvider.value = null;
	sandboxServiceUrl.value = store.settings?.n8nSandboxServiceUrl ?? '';
	sandboxApiKey.value = '';
	daytonaApiKey.value = '';
	if (sandboxEnvManaged.value) return;
	const isDaytona = store.settings?.sandboxProvider === 'daytona';
	const credentialId = isDaytona
		? store.settings?.daytonaCredentialId
		: store.settings?.n8nSandboxCredentialId;
	if (!credentialId) return;
	sandboxProvider.value = isDaytona ? 'daytona' : 'n8n-sandbox';
	const data = await credentialData(credentialId);
	if (isDaytona) daytonaApiKey.value = readString(data, 'apiKey');
	else sandboxApiKey.value = readString(data, 'value');
}

async function hydrateSearch(): Promise<void> {
	searchProvider.value = store.settings?.searchDisabled ? 'disabled' : null;
	searchInput.value = '';
	if (searchEnvManaged.value) return;
	const assigned = store.serviceCredentials.find(
		({ id }) => id === store.settings?.searchCredentialId,
	);
	if (!assigned) return;
	const data = await credentialData(assigned.id);
	searchProvider.value = assigned.type === 'braveSearchApi' ? 'brave' : 'searxng';
	searchInput.value = readString(data, assigned.type === 'braveSearchApi' ? 'apiKey' : 'apiUrl');
}

async function hydrate(): Promise<void> {
	failure.value = null;
	success.value = null;
	if (props.step === 'model') await hydrateModel();
	if (props.step === 'sandbox') await hydrateSandbox();
	if (props.step === 'search') await hydrateSearch();
	await nextTick();
	baseline.value = formSnapshot();
}

watch(
	() => [props.open, props.step] as const,
	async ([open]) => {
		if (open) await hydrate();
	},
	{ immediate: true },
);

watch(
	[
		modelProvider,
		modelApiKey,
		modelBaseUrl,
		modelName,
		sandboxProvider,
		sandboxServiceUrl,
		sandboxApiKey,
		daytonaApiKey,
		searchProvider,
		searchInput,
	],
	() => {
		failure.value = null;
		success.value = null;
	},
);

function selectModelProvider(provider: unknown): void {
	const next = INSTANCE_AI_MODEL_PROVIDERS.find(({ id }) => id === provider);
	if (!next) return;
	modelProvider.value = next.id;
	modelApiKey.value = '';
	modelBaseUrl.value = '';
	modelName.value = next.models[0] ?? '';
}

function selectSandboxProvider(provider: unknown): void {
	const next = INSTANCE_AI_SANDBOX_PROVIDERS.find(({ id }) => id === provider);
	if (next) sandboxProvider.value = next.id;
}

function selectSearchProvider(provider: unknown): void {
	if (provider === 'disabled') {
		searchProvider.value = provider;
		return;
	}
	const next = INSTANCE_AI_SEARCH_PROVIDERS.find(({ id }) => id === provider);
	if (next) searchProvider.value = next.id;
}

function modelConnection(): InstanceAiConnectionUpdate {
	const data: Record<string, unknown> = {};
	if (modelApiKey.value.trim()) data.apiKey = modelApiKey.value.trim();
	if (modelProvider.value === 'custom') data.url = modelBaseUrl.value.trim();
	return { type: modelConfig.value.credentialType, data };
}

function sandboxConnection(): InstanceAiConnectionUpdate | undefined {
	if (sandboxProvider.value === 'daytona') {
		return {
			type: 'daytonaApi',
			data: { apiUrl: DAYTONA_API_URL, apiKey: daytonaApiKey.value.trim() },
		};
	}
	if (sandboxProvider.value === 'n8n-sandbox') {
		return {
			type: 'httpHeaderAuth',
			data: { name: N8N_SANDBOX_HEADER, value: sandboxApiKey.value.trim() },
		};
	}
	return undefined;
}

function searchConnection(): InstanceAiConnectionUpdate | undefined {
	const provider = INSTANCE_AI_SEARCH_PROVIDERS.find(({ id }) => id === searchProvider.value);
	if (!provider) return undefined;
	return {
		type: provider.credentialType,
		data: {
			[provider.id === 'brave' ? 'apiKey' : 'apiUrl']: searchInput.value.trim(),
		},
	};
}

async function saveVerifiedModel(): Promise<boolean> {
	if (modelConnectionLocked.value) {
		if (!modelNameLocked.value) store.setField('modelName', modelName.value.trim());
	} else {
		store.setField('modelConnection', modelConnection());
		store.setField('modelName', modelName.value.trim());
	}
	if (sandboxEnvManaged.value && store.settings?.sandboxEnabled !== true) {
		store.setField('sandboxEnabled', true);
	}
	const saved = await store.save(false);
	if (saved) await store.refreshInstanceModelCredentials();
	return saved;
}

async function saveVerifiedSandbox(connection: InstanceAiConnectionUpdate): Promise<boolean> {
	store.setField('sandboxConnection', connection);
	store.setField('sandboxProvider', sandboxProvider.value ?? undefined);
	store.setField('sandboxEnabled', true);
	if (sandboxProvider.value === 'n8n-sandbox') {
		store.setField('n8nSandboxServiceUrl', sandboxServiceUrl.value.trim());
	}
	const saved = await store.save(false);
	if (saved) await store.refreshCredentials();
	return saved;
}

async function saveSearchDecision(connection?: InstanceAiConnectionUpdate): Promise<boolean> {
	if (searchProvider.value === 'disabled') {
		store.setField('searchDisabled', true);
	} else if (connection) {
		store.setField('searchConnection', connection);
		store.setField('searchDisabled', false);
	}
	const saved = await store.save(false);
	if (saved) await store.refreshCredentials();
	return saved;
}

async function runVerification(): Promise<InstanceAiVerificationResponse | null> {
	if (props.step === 'model') {
		return await store.verifyModel({
			...(modelConnectionLocked.value ? {} : { connection: modelConnection() }),
			modelName: modelName.value.trim(),
		});
	}
	if (props.step === 'sandbox') {
		if (sandboxEnvManaged.value) {
			return await store.verifySandbox({ provider: store.settings?.sandboxProvider });
		}
		const connection = sandboxConnection();
		if (!connection || !sandboxProvider.value) return null;
		return await store.verifySandbox({
			provider: sandboxProvider.value,
			connection,
			...(sandboxProvider.value === 'n8n-sandbox'
				? { serviceUrl: sandboxServiceUrl.value.trim() }
				: {}),
		});
	}
	if (props.step === 'search') {
		if (searchEnvManaged.value || searchProvider.value === 'disabled') return { ok: true };
		const connection = searchConnection();
		return connection ? await store.verifySearch({ connection }) : null;
	}
	return { ok: true };
}

async function handlePrimary(): Promise<void> {
	if (props.step === 'done') {
		emit('completed');
		return;
	}
	busy.value = true;
	failure.value = null;
	success.value = null;
	try {
		const result = await runVerification();
		if (!result?.ok) {
			failure.value = result?.failure ?? 'provider_error';
			return;
		}
		success.value = result;
		let saved = true;
		if (props.step === 'model') saved = await saveVerifiedModel();
		if (props.step === 'sandbox') {
			if (sandboxEnvManaged.value) {
				store.setField('sandboxEnabled', true);
				saved = await store.save(false);
			} else {
				const connection = sandboxConnection();
				saved = connection ? await saveVerifiedSandbox(connection) : false;
			}
		}
		if (props.step === 'search' && !searchEnvManaged.value) {
			saved = await saveSearchDecision(searchConnection());
		}
		if (saved) emit('advance');
	} catch {
		failure.value = 'provider_error';
	} finally {
		busy.value = false;
	}
}

function handleOpenChange(value: boolean): void {
	if (!value && busy.value) return;
	emit('update:open', value);
}

function preventOutsideClose(event: Event): void {
	event.preventDefault();
}

const failureKey = computed(() => VERIFICATION_FAILURE_COPY[failure.value ?? 'provider_error']);
const successMessage = computed(() => {
	if (!success.value) return '';
	if (props.step === 'model') {
		return i18n.baseText('instanceAi.onboarding.model.success', {
			interpolate: { latency: String(success.value.latencyMs ?? 0) },
		});
	}
	if (props.step === 'sandbox') {
		return i18n.baseText('instanceAi.onboarding.sandbox.success', {
			interpolate: { seconds: ((success.value.startupMs ?? 0) / 1000).toFixed(1) },
		});
	}
	return i18n.baseText('instanceAi.onboarding.search.success', {
		interpolate: { count: String(success.value.resultCount ?? 0) },
	});
});
const modelProviderLabel = (provider: (typeof INSTANCE_AI_MODEL_PROVIDERS)[number]) =>
	provider.label ?? i18n.baseText('instanceAi.onboarding.model.customProvider');
</script>

<template>
	<N8nDialog
		:open="open"
		:size="step === 'done' && composeFastPath ? 'small' : 'large'"
		:show-close-button="!busy && step !== 'done'"
		:aria-label="i18n.baseText('instanceAi.onboarding.wizard.ariaLabel')"
		data-test-id="assistant-setup-wizard"
		@update:open="handleOpenChange"
		@interact-outside="preventOutsideClose"
	>
		<div :class="$style.body">
			<template v-if="step === 'model'">
				<div>
					<N8nHeading tag="h2" size="large" bold>
						{{ i18n.baseText('instanceAi.onboarding.model.title') }}
					</N8nHeading>
					<N8nText tag="p" :class="$style.description">
						{{ i18n.baseText('instanceAi.onboarding.model.lede') }}
					</N8nText>
				</div>

				<N8nCallout v-if="modelConnectionLocked" theme="info">
					<N8nText bold>{{ i18n.baseText('instanceAi.onboarding.env.title') }}</N8nText>
					{{ i18n.baseText('instanceAi.onboarding.env.description') }}
					<N8nLink :to="ENV_DOCS_URL" new-window>
						{{ i18n.baseText('instanceAi.onboarding.env.docs') }}
					</N8nLink>
				</N8nCallout>

				<div :class="$style.fields">
					<N8nInputLabel
						:class="$style.compactLabel"
						:label="i18n.baseText('instanceAi.onboarding.model.provider')"
						input-name="assistant-model-provider"
					>
						<N8nInput
							v-if="modelConnectionLocked"
							id="assistant-model-provider"
							:model-value="STATIC_SECRET_MASK"
							disabled
						/>
						<N8nSelect
							v-else
							id="assistant-model-provider"
							:model-value="modelProvider"
							:teleported="true"
							data-test-id="assistant-model-provider"
							@update:model-value="selectModelProvider"
						>
							<N8nOption
								v-for="provider in INSTANCE_AI_MODEL_PROVIDERS"
								:key="provider.id"
								:value="provider.id"
								:label="modelProviderLabel(provider)"
							/>
						</N8nSelect>
					</N8nInputLabel>

					<N8nInputLabel
						v-if="modelProvider === 'custom' && !modelConnectionLocked"
						:class="$style.compactLabel"
						:label="i18n.baseText('instanceAi.onboarding.model.baseUrl')"
						input-name="assistant-model-base-url"
					>
						<N8nInput
							id="assistant-model-base-url"
							v-model="modelBaseUrl"
							class="ph-no-capture"
							type="text"
							autocomplete="off"
							:spellcheck="false"
							placeholder="http://ollama.internal:11434/v1"
							data-test-id="assistant-model-base-url"
						/>
					</N8nInputLabel>

					<N8nInputLabel
						:class="$style.compactLabel"
						:label="i18n.baseText('instanceAi.onboarding.model.apiKey')"
						input-name="assistant-model-api-key"
					>
						<N8nInput
							id="assistant-model-api-key"
							v-model="modelApiKey"
							class="ph-no-capture"
							type="password"
							autocomplete="new-password"
							:spellcheck="false"
							:disabled="modelConnectionLocked"
							:placeholder="modelConnectionLocked ? STATIC_SECRET_MASK : modelConfig.placeholder"
							data-test-id="assistant-model-api-key"
						/>
					</N8nInputLabel>

					<N8nInputLabel
						:class="$style.compactLabel"
						:label="i18n.baseText('instanceAi.onboarding.model.model')"
						input-name="assistant-model-name"
					>
						<N8nSelect
							v-if="modelConfig.models.length && !modelNameLocked"
							id="assistant-model-name"
							:model-value="modelName"
							:teleported="true"
							data-test-id="assistant-model-name"
							@update:model-value="modelName = String($event ?? '')"
						>
							<N8nOption
								v-for="(model, index) in modelConfig.models"
								:key="model"
								:value="model"
								:label="
									index === 0
										? `${model} · ${i18n.baseText('instanceAi.onboarding.recommended')}`
										: model
								"
							/>
						</N8nSelect>
						<N8nInput
							v-else
							id="assistant-model-name"
							v-model="modelName"
							class="ph-no-capture"
							:disabled="modelNameLocked"
							:placeholder="modelNameLocked ? STATIC_SECRET_MASK : 'qwen3-coder'"
							:spellcheck="false"
							data-test-id="assistant-model-name"
						/>
					</N8nInputLabel>
					<N8nText
						v-if="modelProvider === 'anthropic' && !modelNameLocked"
						step="xs"
						color="text-light"
						:class="$style.fieldHint"
					>
						{{ i18n.baseText('instanceAi.onboarding.model.anthropicHint') }}
					</N8nText>
				</div>

				<N8nCallout
					v-if="modelProvider === 'custom' && !modelConnectionLocked"
					theme="warning"
					icon="triangle-alert"
				>
					{{ i18n.baseText('instanceAi.onboarding.model.weakModelWarning') }}
				</N8nCallout>
			</template>

			<template v-else-if="step === 'sandbox'">
				<div>
					<N8nHeading tag="h2" size="large" bold>
						{{ i18n.baseText('instanceAi.onboarding.sandbox.title') }}
					</N8nHeading>
					<N8nText tag="p" :class="$style.description">
						{{ i18n.baseText('instanceAi.onboarding.sandbox.lede') }}
					</N8nText>
				</div>
				<N8nCallout v-if="sandboxEnvManaged" theme="info">
					<N8nText bold>{{ i18n.baseText('instanceAi.onboarding.env.title') }}</N8nText>
					{{ i18n.baseText('instanceAi.onboarding.env.description') }}
				</N8nCallout>
				<N8nRadioGroup
					v-else
					:model-value="sandboxProvider ?? undefined"
					orientation="vertical"
					:class="$style.joinedCards"
					@update:model-value="selectSandboxProvider"
				>
					<div
						v-for="provider in INSTANCE_AI_SANDBOX_PROVIDERS"
						:key="provider.id"
						:class="[$style.optionCard, sandboxProvider === provider.id && $style.selected]"
						:data-test-id="`assistant-sandbox-${provider.id}`"
						@click="selectSandboxProvider(provider.id)"
					>
						<N8nRadioGroupItem
							:id="`assistant-sandbox-radio-${provider.id}`"
							:value="provider.id"
							:aria-label="provider.onboardingLabel"
							:class="$style.optionControl"
						/>
						<span :class="$style.optionCopy">
							<span :class="$style.optionTitle">
								<N8nText bold step="sm">{{ provider.onboardingLabel }}</N8nText>
								<N8nBadge
									:theme="provider.id === 'n8n-sandbox' ? 'secondary' : 'tertiary'"
									size="small"
									:show-border="provider.id !== 'n8n-sandbox'"
									:class="
										provider.id === 'n8n-sandbox' ? $style.recommendedBadge : $style.paidBadge
									"
									bold
								>
									{{
										provider.id === 'n8n-sandbox'
											? i18n.baseText('instanceAi.onboarding.sandbox.freeRecommended')
											: i18n.baseText('instanceAi.onboarding.sandbox.paid')
									}}
								</N8nBadge>
							</span>
							<N8nText color="text-light" step="sm" :class="$style.optionDescription">
								{{
									provider.id === 'n8n-sandbox'
										? i18n.baseText('instanceAi.onboarding.sandbox.n8nDescription')
										: i18n.baseText('instanceAi.onboarding.sandbox.daytonaDescription')
								}}
							</N8nText>
						</span>
					</div>
				</N8nRadioGroup>

				<div v-if="!sandboxEnvManaged && sandboxProvider === 'n8n-sandbox'" :class="$style.fields">
					<N8nText step="xs">
						{{ i18n.baseText('instanceAi.onboarding.sandbox.installDescription') }}
						<N8nLink :to="SANDBOX_DOCS_URL" new-window>
							{{ i18n.baseText('instanceAi.onboarding.sandbox.installLink') }}
						</N8nLink>
					</N8nText>
					<N8nInputLabel
						:class="$style.compactLabel"
						:label="i18n.baseText('instanceAi.onboarding.sandbox.serviceUrl')"
						input-name="assistant-sandbox-url"
					>
						<N8nInput
							id="assistant-sandbox-url"
							v-model="sandboxServiceUrl"
							class="ph-no-capture"
							type="text"
							autocomplete="off"
							:spellcheck="false"
							placeholder="http://sandbox.internal:3200"
							data-test-id="assistant-sandbox-url"
						/>
					</N8nInputLabel>
					<N8nInputLabel
						:class="$style.compactLabel"
						:label="i18n.baseText('instanceAi.onboarding.sandbox.apiKey')"
						input-name="assistant-sandbox-api-key"
					>
						<N8nInput
							id="assistant-sandbox-api-key"
							v-model="sandboxApiKey"
							class="ph-no-capture"
							type="password"
							autocomplete="new-password"
							:spellcheck="false"
							:placeholder="i18n.baseText('instanceAi.onboarding.sandbox.apiKeyPlaceholder')"
							data-test-id="assistant-sandbox-api-key"
						/>
					</N8nInputLabel>
				</div>
				<div v-else-if="!sandboxEnvManaged && sandboxProvider === 'daytona'" :class="$style.fields">
					<N8nInputLabel
						:class="$style.compactLabel"
						:label="i18n.baseText('instanceAi.onboarding.sandbox.apiKey')"
						input-name="assistant-daytona-api-key"
					>
						<N8nInput
							id="assistant-daytona-api-key"
							v-model="daytonaApiKey"
							class="ph-no-capture"
							type="password"
							autocomplete="new-password"
							:spellcheck="false"
							placeholder="dtn_…"
							data-test-id="assistant-daytona-api-key"
						/>
					</N8nInputLabel>
					<N8nText step="xs" color="text-light">
						{{ i18n.baseText('instanceAi.onboarding.sandbox.daytonaKey') }}
						<N8nLink to="https://app.daytona.io" new-window>Daytona</N8nLink>
					</N8nText>
				</div>
			</template>

			<template v-else-if="step === 'search'">
				<div>
					<N8nHeading tag="h2" size="large" bold>
						{{ i18n.baseText('instanceAi.onboarding.search.title') }}
					</N8nHeading>
					<N8nText tag="p" :class="$style.description">
						{{ i18n.baseText('instanceAi.onboarding.search.lede') }}
					</N8nText>
				</div>
				<N8nCallout v-if="searchEnvManaged" theme="info">
					<N8nText bold>{{ i18n.baseText('instanceAi.onboarding.env.title') }}</N8nText>
					{{ i18n.baseText('instanceAi.onboarding.env.description') }}
				</N8nCallout>
				<N8nRadioGroup
					v-else
					:model-value="searchProvider ?? undefined"
					orientation="vertical"
					:class="$style.joinedCards"
					@update:model-value="selectSearchProvider"
				>
					<div
						v-for="provider in [
							...INSTANCE_AI_SEARCH_PROVIDERS,
							{
								id: 'disabled' as const,
								label: i18n.baseText('instanceAi.onboarding.search.disable'),
							},
						]"
						:key="provider.id"
						:class="[$style.optionCard, searchProvider === provider.id && $style.selected]"
						:data-test-id="`assistant-search-${provider.id}`"
						@click="selectSearchProvider(provider.id)"
					>
						<N8nRadioGroupItem
							:id="`assistant-search-radio-${provider.id}`"
							:value="provider.id"
							:aria-label="provider.label"
							:class="$style.optionControl"
						/>
						<span :class="$style.optionCopy">
							<span :class="$style.optionTitle">
								<N8nText bold step="sm">{{ provider.label }}</N8nText>
								<N8nBadge
									v-if="provider.id === 'searxng'"
									theme="secondary"
									size="medium"
									:show-border="false"
								>
									{{ i18n.baseText('instanceAi.onboarding.search.free') }}
								</N8nBadge>
							</span>
							<N8nText color="text-light" step="sm" :class="$style.optionDescription">
								{{
									provider.id === 'searxng'
										? i18n.baseText('instanceAi.onboarding.search.searxngDescription')
										: provider.id === 'brave'
											? i18n.baseText('instanceAi.onboarding.search.braveDescription')
											: i18n.baseText('instanceAi.onboarding.search.disabledDescription')
								}}
							</N8nText>
						</span>
					</div>
				</N8nRadioGroup>
				<div
					v-if="!searchEnvManaged && searchProvider && searchProvider !== 'disabled'"
					:class="$style.fields"
				>
					<N8nText v-if="searchProvider === 'searxng'" step="xs">
						{{ i18n.baseText('instanceAi.onboarding.search.installDescription') }}
						<N8nLink :to="SEARXNG_DOCS_URL" new-window>
							{{ i18n.baseText('instanceAi.onboarding.search.installLink') }}
						</N8nLink>
						{{ i18n.baseText('instanceAi.onboarding.search.installSuffix') }}
					</N8nText>
					<N8nInputLabel
						:class="$style.compactLabel"
						:label="
							searchProvider === 'brave'
								? i18n.baseText('instanceAi.onboarding.search.apiKey')
								: i18n.baseText('instanceAi.onboarding.search.instanceUrl')
						"
						input-name="assistant-search-value"
					>
						<N8nInput
							id="assistant-search-value"
							v-model="searchInput"
							class="ph-no-capture"
							:type="searchProvider === 'brave' ? 'password' : 'text'"
							autocomplete="off"
							:spellcheck="false"
							:placeholder="searchProvider === 'brave' ? 'BSA…' : 'http://searxng.internal:8080'"
							data-test-id="assistant-search-value"
						/>
					</N8nInputLabel>
				</div>
			</template>

			<template v-else>
				<div :class="$style.done">
					<N8nIcon icon="circle-check" :size="32" :class="$style.successIcon" />
					<N8nHeading tag="h2" size="large" align="center" bold>
						{{ i18n.baseText('instanceAi.onboarding.done.title') }}
					</N8nHeading>
					<div v-if="!composeFastPath" :class="$style.summary">
						<button
							v-for="item in [
								{
									id: 'model' as const,
									label: i18n.baseText('instanceAi.onboarding.model.label'),
									description: i18n.baseText('instanceAi.onboarding.model.description'),
									value: modelValue,
								},
								{
									id: 'sandbox' as const,
									label: i18n.baseText('instanceAi.onboarding.sandbox.label'),
									description: i18n.baseText('instanceAi.onboarding.sandbox.description'),
									value: sandboxValue,
								},
								{
									id: 'search' as const,
									label: i18n.baseText('instanceAi.onboarding.search.label'),
									description: i18n.baseText('instanceAi.onboarding.search.description'),
									value: props.searchValue,
								},
							]"
							:key="item.id"
							type="button"
							:class="$style.summaryRow"
							@click="emit('edit', item.id)"
						>
							<span :class="$style.summaryCopy">
								<N8nText bold>{{ item.label }}</N8nText>
								<N8nText step="xs" color="text-light">{{ item.description }}</N8nText>
							</span>
							<N8nText step="xs" color="text-light" :class="$style.mono">
								{{ item.value }}
							</N8nText>
							<N8nIcon icon="chevron-right" size="small" color="text-light" />
						</button>
					</div>
					<N8nText size="small" color="text-light" align="center">
						{{ i18n.baseText('instanceAi.onboarding.done.footnote') }}
					</N8nText>
					<N8nButton
						v-if="composeFastPath"
						variant="solid"
						:label="primaryLabel"
						data-test-id="wizard-primary"
						:class="$style.inlineDoneAction"
						@click="handlePrimary"
					/>
				</div>
			</template>

			<Transition name="onboarding-callout">
				<N8nCallout
					v-if="success"
					theme="success"
					icon="circle-check"
					data-test-id="assistant-verification-success"
				>
					{{ successMessage }}
				</N8nCallout>
			</Transition>

			<Transition name="onboarding-callout">
				<N8nCallout
					v-if="failure"
					theme="danger"
					icon="circle-x"
					data-test-id="assistant-verification-error"
				>
					{{ i18n.baseText(failureKey) }}
				</N8nCallout>
			</Transition>
		</div>

		<N8nDialogFooter v-if="!(step === 'done' && composeFastPath)" :class="$style.footer">
			<N8nButton
				v-if="canGoBack"
				variant="outline"
				:label="i18n.baseText('generic.back')"
				:disabled="busy"
				data-test-id="wizard-back"
				@click="emit('back')"
			/>
			<div v-if="step !== 'done' && !editMode" :class="$style.dots" aria-hidden="true">
				<span
					v-for="setupStep in visibleSetupSteps"
					:key="setupStep"
					:class="[$style.dot, setupStep === step && $style.activeDot]"
				/>
			</div>
			<N8nButton
				variant="solid"
				:label="primaryLabel"
				:loading="busy"
				:disabled="primaryDisabled"
				data-test-id="wizard-primary"
				@click="handlePrimary"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
	max-height: calc(100dvh - var(--spacing--4xl));
	overflow-x: hidden;
	overflow-y: auto;
}

.description {
	margin: var(--spacing--2xs) 0 0;
	line-height: var(--line-height--lg);
}

.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
}

.compactLabel :global(.n8n-input-label) {
	padding-bottom: var(--spacing--4xs);
}

.fieldHint {
	margin-top: calc(var(--spacing--2xs) * -1);
}

.joinedCards {
	width: 100%;
	gap: 0;
}

.optionCard {
	position: relative;
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	width: 100%;
	box-sizing: border-box;
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: 0;
	background: var(--background--surface);
	color: var(--text-color);
	text-align: left;
	cursor: pointer;
	user-select: none;
}

.optionCard:first-child {
	border-radius: var(--radius--md) var(--radius--md) 0 0;
}

.optionCard:last-child {
	border-radius: 0 0 var(--radius--md) var(--radius--md);
}

.optionCard + .optionCard {
	margin-top: calc(var(--border-width--base) * -1);
}

.optionCard.selected {
	z-index: 1;
	border-color: var(--color--primary);
	background: var(--color--primary--tint-3);
	box-shadow: 0 0 0 var(--border-width--base) var(--color--primary);
}

.optionCard > :first-child {
	width: auto;
	flex-shrink: 0;
}

@media (hover: hover) and (pointer: fine) {
	.optionCard:hover {
		background: var(--background--hover);
	}

	.optionCard.selected:hover {
		background: var(--color--primary--tint-3);
	}
}

.optionControl {
	margin-top: var(--spacing--5xs);
}

.optionCopy {
	min-width: 0;
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.optionTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.recommendedBadge,
.paidBadge {
	padding-inline: var(--spacing--3xs);
}

.paidBadge {
	border-radius: var(--radius--full);
}

.optionDescription {
	display: block;
}

.done {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
}

.successIcon {
	color: var(--text-color--success);
}

.inlineDoneAction {
	margin-top: var(--spacing--2xs);
}

.summary {
	width: 100%;
	overflow: hidden;
	border: var(--border);
	border-radius: var(--radius--md);
	background: var(--background--surface);
}

.summaryRow {
	width: 100%;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: 0;
	border-top: var(--border-width--base) var(--border-style--base) var(--border-color--subtle);
	background: transparent;
	color: var(--text-color);
	font: inherit;
	text-align: left;
	cursor: pointer;
}

.summaryRow:first-child {
	border-top: 0;
}

@media (hover: hover) and (pointer: fine) {
	.summaryRow:hover {
		background: var(--background--hover);
	}
}

.summaryCopy {
	min-width: 0;
	flex: 1;
	display: flex;
	flex-direction: column;
}

.mono {
	font-family: var(--font-family--monospace);
}

.footer {
	position: relative;
	align-items: center;
	justify-content: space-between;
}

.body + .footer {
	margin: var(--spacing--sm) calc(var(--spacing--lg) * -1) calc(var(--spacing--lg) * -1);
	padding: var(--spacing--sm) var(--spacing--md);
	border-top: var(--border-width--base) var(--border-style--base) var(--border-color--subtle);
}

.footer > :last-child {
	margin-left: auto;
}

.dots {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	display: flex;
	gap: var(--spacing--3xs);
}

.dot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: var(--border-color--strong);
}

.activeDot {
	background: var(--text-color);
}
</style>

<style lang="scss">
.onboarding-callout-enter-active,
.onboarding-callout-leave-active {
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out);
}

.onboarding-callout-enter-from,
.onboarding-callout-leave-to {
	opacity: 0;
	transform: translateY(calc(var(--spacing--4xs) * -1));
}

@media (prefers-reduced-motion: reduce) {
	.onboarding-callout-enter-active,
	.onboarding-callout-leave-active {
		transition: none;
	}
}
</style>
