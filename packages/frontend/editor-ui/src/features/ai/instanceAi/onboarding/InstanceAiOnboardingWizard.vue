<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type {
	InstanceAiConnectionUpdate,
	InstanceAiProviderConnection,
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
import { TIME } from '@/app/constants/durations';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { SANDBOX_PROVIDER_LABELS } from '../constants';
import { useInstanceCredentialTest } from '../composables/useInstanceCredentialTest';
import {
	INSTANCE_AI_MODEL_PROVIDERS,
	INSTANCE_AI_CURATED_MODELS,
	INSTANCE_AI_SANDBOX_PROVIDERS,
	INSTANCE_AI_SEARCH_PROVIDERS,
	type InstanceAiModelProvider,
	type InstanceAiSearchProvider,
} from '../instanceAiConnection.constants';
import { getAllInstanceAiModelOptions, getInstanceAiModelOptions } from '../instanceAiModelCatalog';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { sanitizeFailureDetail } from './sanitizeFailureDetail';
import type { InstanceAiOnboardingStep } from './useInstanceAiOnboarding';

const DAYTONA_API_URL = 'https://app.daytona.io/api';
const N8N_SANDBOX_HEADER = 'x-api-key';
const STATIC_SECRET_MASK = '••••••••••••';
const SANDBOX_DOCS_URL =
	'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-ai-assistant#configure-a-sandbox-provider';
const SEARCH_DOCS_URL =
	'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-ai-assistant#enable-web-search';
const BRAVE_SEARCH_KEYS_URL = 'https://api-dashboard.search.brave.com/app/keys';
const ENV_DOCS_URL = 'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-ai-assistant';
const SUCCESS_PAUSE_MS = TIME.SECOND * 1.5;
const DEFAULT_MODEL_PROVIDER = INSTANCE_AI_MODEL_PROVIDERS[0]!;
const DEFAULT_MODEL_NAME = INSTANCE_AI_CURATED_MODELS[DEFAULT_MODEL_PROVIDER.id][0] ?? '';
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

const props = withDefaults(
	defineProps<{
		open: boolean;
		step: InstanceAiOnboardingStep;
		editMode: boolean;
		sequence: InstanceAiOnboardingStep[];
		modelValue: string;
		sandboxValue: string;
		searchValue: string;
		composeFastPath: boolean;
		surface?: 'onboarding' | 'settings';
		allowUnchanged?: boolean;
	}>(),
	{ surface: 'onboarding', allowUnchanged: false },
);

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
const { credentialTestError, testSavedCredential } = useInstanceCredentialTest();

const busy = ref(false);
const failure = ref<InstanceAiVerificationFailure | null>(null);
const failureDetail = ref<string | null>(null);
const success = ref<VerificationSuccess | null>(null);
const modelProvider = ref<InstanceAiModelProvider>('anthropic');
const modelApiKey = ref('');
const modelBaseUrl = ref('');
const modelName = ref<string>(DEFAULT_MODEL_NAME);
const sandboxProvider = ref<'n8n-sandbox' | 'daytona' | null>(null);
const sandboxServiceUrl = ref('');
const sandboxApiKey = ref('');
const daytonaApiKey = ref('');
const searchProvider = ref<InstanceAiSearchProvider | null>(null);
const searchInput = ref('');
const selectedExistingCredentialId = ref('');
const hydratedModelProvider = ref<InstanceAiModelProvider | null>(null);
const baseline = ref('');
let hydrationGeneration = 0;

const modelConfig = computed(
	() =>
		INSTANCE_AI_MODEL_PROVIDERS.find(({ id }) => id === modelProvider.value) ??
		DEFAULT_MODEL_PROVIDER,
);
const modelConnectionLocked = computed(() => store.settings?.envManaged?.model?.provider === true);
const modelNameLocked = computed(() => store.settings?.envManaged?.model?.model === true);
const modelOptions = computed(() =>
	modelConnectionLocked.value
		? getAllInstanceAiModelOptions(store.modelCatalog, modelName.value)
		: getInstanceAiModelOptions(modelProvider.value, store.modelCatalog, modelName.value),
);
const sandboxEnvManaged = computed(() => store.settings?.sandboxEnvConfigured === true);
const searchEnvManaged = computed(() => store.settings?.searchEnvConfigured === true);
const readOnly = computed(() => !store.canManageInstanceCredentials);
const isProxyDaytonaSelection = computed(
	() =>
		props.step === 'sandbox' &&
		store.isProxyEnabled &&
		sandboxProvider.value === 'daytona' &&
		!selectedExistingCredentialId.value,
);

function assignedCredentialId(): string | null {
	if (props.step === 'model') return store.settings?.modelCredentialId ?? null;
	if (props.step === 'sandbox') {
		return store.settings?.sandboxProvider === 'daytona'
			? (store.settings?.daytonaCredentialId ?? null)
			: (store.settings?.n8nSandboxCredentialId ?? null);
	}
	if (props.step === 'search') return store.settings?.searchCredentialId ?? null;
	return null;
}

function credentialProviderLabel(credential: InstanceAiProviderConnection): string {
	if (credential.type === 'daytonaApi') return SANDBOX_PROVIDER_LABELS.daytona;
	if (credential.type === 'httpHeaderAuth') return SANDBOX_PROVIDER_LABELS['n8n-sandbox'];
	return credentialsStore.getCredentialTypeByName(credential.type)?.displayName ?? credential.type;
}

const allCompatibleCredentials = computed(() => {
	if (props.step === 'done') return [];
	const credentials =
		props.step === 'model' ? store.instanceModelCredentials : store.serviceCredentials;
	const allowedTypes = new Set<string>(
		props.step === 'model'
			? INSTANCE_AI_MODEL_PROVIDERS.map(({ credentialType }) => credentialType)
			: props.step === 'sandbox'
				? ['daytonaApi', 'httpHeaderAuth']
				: INSTANCE_AI_SEARCH_PROVIDERS.map(({ credentialType }) => credentialType),
	);
	return credentials.filter((credential) => allowedTypes.has(credential.type));
});

const compatibleCredentials = computed(() => {
	const assignedId = assignedCredentialId();
	return allCompatibleCredentials.value.filter(
		(credential) => readOnly.value || credential.id !== assignedId,
	);
});

const selectedExistingCredential = computed(() =>
	compatibleCredentials.value.find(({ id }) => id === selectedExistingCredentialId.value),
);
const editableConnectionLabel = computed(() =>
	assignedCredentialId()
		? i18n.baseText('instanceAi.onboarding.existingConnection.current')
		: i18n.baseText('instanceAi.onboarding.existingConnection.new'),
);
const environmentManaged = computed(() => {
	if (props.step === 'model') return modelConnectionLocked.value;
	if (props.step === 'sandbox') return sandboxEnvManaged.value;
	if (props.step === 'search') return searchEnvManaged.value;
	return false;
});
const showExistingCredentialSelect = computed(
	() =>
		props.surface === 'settings' &&
		!modelConnectionLocked.value &&
		!environmentManaged.value &&
		allCompatibleCredentials.value.length > 1,
);

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
		selectedExistingCredentialId: selectedExistingCredentialId.value,
	});
}

const changed = computed(() => formSnapshot() !== baseline.value);
const stepReady = computed(() => {
	if (props.step === 'done') return true;
	if (props.step === 'model') {
		if (modelConnectionLocked.value)
			return modelNameLocked.value || modelName.value.trim().length > 0;
		if (selectedExistingCredentialId.value) return modelName.value.trim().length > 0;
		return Boolean(
			modelName.value.trim() &&
				(modelProvider.value === 'custom' ? modelBaseUrl.value.trim() : modelApiKey.value.trim()),
		);
	}
	if (props.step === 'sandbox') {
		if (sandboxEnvManaged.value) return true;
		if (selectedExistingCredentialId.value) {
			return sandboxProvider.value === 'n8n-sandbox'
				? Boolean(sandboxServiceUrl.value.trim())
				: true;
		}
		if (isProxyDaytonaSelection.value) return true;
		if (sandboxProvider.value === 'daytona') return Boolean(daytonaApiKey.value.trim());
		if (sandboxProvider.value === 'n8n-sandbox') {
			return Boolean(sandboxServiceUrl.value.trim() && sandboxApiKey.value.trim());
		}
		return false;
	}
	if (searchEnvManaged.value) return true;
	if (selectedExistingCredentialId.value) return true;
	if (searchProvider.value === 'disabled') return true;
	return Boolean(searchProvider.value && searchInput.value.trim());
});
const primaryDisabled = computed(
	() =>
		busy.value ||
		!stepReady.value ||
		(props.editMode &&
			environmentManaged.value &&
			(props.step !== 'model' || modelNameLocked.value)) ||
		(props.editMode && !props.allowUnchanged && !changed.value),
);
const canGoBack = computed(() => {
	if (props.editMode) return false;
	return props.sequence.indexOf(props.step) > 0 && props.step !== 'done';
});
const visibleSetupSteps = computed(() => props.sequence.filter((step) => step !== 'done'));
const primaryLabel = computed(() => {
	if (busy.value) return i18n.baseText('instanceAi.onboarding.wizard.testing');
	if (props.step === 'done') return i18n.baseText('instanceAi.onboarding.wizard.startUsing');
	if (props.editMode) return i18n.baseText('generic.save');
	return i18n.baseText('instanceAi.onboarding.wizard.continue');
});
const settingsTestPrefix = computed(() =>
	props.step === 'done' ? 'n8n-agent' : `n8n-agent-${props.step}`,
);
const dialogTestId = computed(() =>
	props.surface === 'settings' ? `${settingsTestPrefix.value}-dialog` : 'assistant-setup-wizard',
);
const primaryTestId = computed(() =>
	props.surface === 'settings' ? `${settingsTestPrefix.value}-dialog-save` : 'wizard-primary',
);
const cancelTestId = computed(() =>
	props.surface === 'settings' ? `${settingsTestPrefix.value}-dialog-cancel` : 'wizard-cancel',
);
const backTestId = computed(() =>
	props.surface === 'settings' ? `${settingsTestPrefix.value}-dialog-back` : 'wizard-back',
);
const progressTestId = computed(() =>
	props.surface === 'settings' ? `${settingsTestPrefix.value}-dialog-step` : 'wizard-progress',
);
const existingCredentialTestId = computed(() =>
	props.surface === 'settings'
		? `${settingsTestPrefix.value}-existing-credential-select`
		: 'assistant-existing-credential',
);

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

function modelProviderForCredentialType(type: string): InstanceAiModelProvider {
	if (type === 'anthropicApi') return 'anthropic';
	if (type === 'openRouterApi') return 'openrouter';
	return 'openai';
}

function applyExistingCredential(credential: InstanceAiProviderConnection): void {
	selectedExistingCredentialId.value = credential.id;
	if (props.step === 'model') {
		modelProvider.value = modelProviderForCredentialType(credential.type);
		modelName.value =
			(credential.id === assignedCredentialId() ? store.settings?.modelName : null) ||
			INSTANCE_AI_CURATED_MODELS[modelProvider.value][0] ||
			'';
	} else if (props.step === 'sandbox') {
		sandboxProvider.value = credential.type === 'daytonaApi' ? 'daytona' : 'n8n-sandbox';
	} else if (props.step === 'search') {
		searchProvider.value = credential.type === 'braveSearchApi' ? 'brave' : 'searxng';
	}
}

async function selectExistingCredential(value: unknown): Promise<void> {
	const credential = compatibleCredentials.value.find(({ id }) => id === value);
	if (credential) {
		applyExistingCredential(credential);
		return;
	}
	selectedExistingCredentialId.value = '';
	const generation = ++hydrationGeneration;
	if (props.step === 'model') await hydrateModel(generation);
	if (props.step === 'sandbox') await hydrateSandbox(generation);
	if (props.step === 'search') await hydrateSearch(generation);
}

async function hydrateModel(generation: number, rememberProvider = true): Promise<void> {
	if (rememberProvider) hydratedModelProvider.value = null;
	selectedExistingCredentialId.value = '';
	modelProvider.value = 'anthropic';
	modelApiKey.value = '';
	modelBaseUrl.value = '';
	modelName.value = store.settings?.modelName || DEFAULT_MODEL_NAME;
	if (modelConnectionLocked.value) {
		if (modelNameLocked.value) modelName.value = '';
		return;
	}
	const assigned = store.instanceModelCredentials.find(
		({ id }) => id === store.settings?.modelCredentialId,
	);
	if (!assigned) return;
	if (readOnly.value) {
		applyExistingCredential(assigned);
		if (rememberProvider) hydratedModelProvider.value = modelProvider.value;
		return;
	}
	const data = await credentialData(assigned.id);
	if (generation !== hydrationGeneration) return;
	modelApiKey.value = readString(data, 'apiKey');
	modelBaseUrl.value = readString(data, 'url');
	modelProvider.value =
		assigned.type === 'openAiApi' && modelBaseUrl.value
			? 'custom'
			: modelProviderForCredentialType(assigned.type);
	if (rememberProvider) hydratedModelProvider.value = modelProvider.value;
}

async function hydrateSandbox(generation: number): Promise<void> {
	selectedExistingCredentialId.value = '';
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
	const assigned = store.serviceCredentials.find(({ id }) => id === credentialId);
	if (readOnly.value && assigned) {
		applyExistingCredential(assigned);
		return;
	}
	const data = await credentialData(credentialId);
	if (generation !== hydrationGeneration) return;
	if (isDaytona) daytonaApiKey.value = readString(data, 'apiKey');
	else sandboxApiKey.value = readString(data, 'value');
}

async function hydrateSearch(generation: number): Promise<void> {
	selectedExistingCredentialId.value = '';
	searchProvider.value = store.settings?.searchDisabled ? 'disabled' : null;
	searchInput.value = '';
	if (searchEnvManaged.value) return;
	const assigned = store.serviceCredentials.find(
		({ id }) => id === store.settings?.searchCredentialId,
	);
	if (!assigned) return;
	if (readOnly.value) {
		applyExistingCredential(assigned);
		return;
	}
	const data = await credentialData(assigned.id);
	if (generation !== hydrationGeneration) return;
	searchProvider.value = assigned.type === 'braveSearchApi' ? 'brave' : 'searxng';
	searchInput.value = readString(data, assigned.type === 'braveSearchApi' ? 'apiKey' : 'apiUrl');
}

async function hydrate(): Promise<void> {
	const generation = ++hydrationGeneration;
	failure.value = null;
	failureDetail.value = null;
	success.value = null;
	if (props.step === 'model') await hydrateModel(generation);
	if (props.step === 'sandbox') await hydrateSandbox(generation);
	if (props.step === 'search') await hydrateSearch(generation);
	if (generation !== hydrationGeneration) return;
	await nextTick();
	baseline.value = formSnapshot();
}

watch(
	() => [props.open, props.step] as const,
	async ([open]) => {
		if (!open) return;
		await hydrate();
		if (props.step === 'model' && modelProvider.value !== 'custom') {
			void store.loadModelCatalog();
		}
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
		selectedExistingCredentialId,
	],
	() => {
		failure.value = null;
		failureDetail.value = null;
		success.value = null;
		credentialTestError.value = '';
	},
);

async function selectModelProvider(provider: unknown): Promise<void> {
	const next = INSTANCE_AI_MODEL_PROVIDERS.find(({ id }) => id === provider);
	if (!next) return;
	const assigned = store.instanceModelCredentials.find(
		({ id }) => id === store.settings?.modelCredentialId,
	);
	if (assigned && hydratedModelProvider.value === next.id) {
		await hydrateModel(++hydrationGeneration, false);
		return;
	}
	selectedExistingCredentialId.value = '';
	modelProvider.value = next.id;
	modelApiKey.value = '';
	modelBaseUrl.value = '';
	modelName.value = INSTANCE_AI_CURATED_MODELS[next.id][0] ?? '';
	if (next.id !== 'custom') void store.loadModelCatalog();
}

function selectSandboxProvider(provider: unknown): void {
	const next = INSTANCE_AI_SANDBOX_PROVIDERS.find(({ id }) => id === provider);
	if (next) {
		selectedExistingCredentialId.value = '';
		sandboxProvider.value = next.id;
	}
}

function selectSearchProvider(provider: unknown): void {
	selectedExistingCredentialId.value = '';
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

async function saveExistingCredential(): Promise<boolean> {
	const credential = selectedExistingCredential.value;
	if (!credential) return false;
	if (props.step === 'model') {
		store.setField('modelCredentialId', credential.id);
		store.setField('modelName', modelName.value.trim());
	} else if (props.step === 'sandbox') {
		const provider = credential.type === 'daytonaApi' ? 'daytona' : 'n8n-sandbox';
		store.setField('daytonaCredentialId', provider === 'daytona' ? credential.id : null);
		store.setField('n8nSandboxCredentialId', provider === 'n8n-sandbox' ? credential.id : null);
		store.setField('sandboxProvider', provider);
		store.setField('sandboxEnabled', true);
		if (provider === 'n8n-sandbox') {
			store.setField('n8nSandboxServiceUrl', sandboxServiceUrl.value.trim());
		}
	} else if (props.step === 'search') {
		store.setField('searchCredentialId', credential.id);
		store.setField('searchDisabled', false);
	}
	const saved = await store.save(false);
	if (!saved) return false;
	if (props.step === 'model') await store.refreshInstanceModelCredentials();
	else await store.refreshCredentials();
	return true;
}

async function verifyExistingCredential(): Promise<InstanceAiVerificationResponse> {
	const credential = selectedExistingCredential.value;
	if (!credential) return { ok: false, failure: 'provider_error' };
	return (await testSavedCredential(credential.id, credential.name, credential.type))
		? { ok: true }
		: {
				ok: false,
				failure: 'provider_error',
				error: credentialTestError.value
					? sanitizeFailureDetail(credentialTestError.value)
					: undefined,
			};
}

async function runVerification(): Promise<InstanceAiVerificationResponse | null> {
	if (selectedExistingCredentialId.value) return await verifyExistingCredential();
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
		if (isProxyDaytonaSelection.value) return { ok: true };
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
	failureDetail.value = null;
	success.value = null;
	try {
		const result = await runVerification();
		if (!result?.ok) {
			failure.value = result?.failure ?? 'provider_error';
			failureDetail.value = result?.ok === false ? (result.error ?? null) : null;
			return;
		}
		let saved = true;
		if (selectedExistingCredentialId.value) {
			saved = await saveExistingCredential();
		} else if (props.step === 'model') {
			saved = await saveVerifiedModel();
		} else if (props.step === 'sandbox') {
			if (sandboxEnvManaged.value) {
				store.setField('sandboxEnabled', true);
				saved = await store.save(false);
			} else if (isProxyDaytonaSelection.value) {
				store.setField('sandboxProvider', 'daytona');
				saved = await store.save(false);
			} else {
				const connection = sandboxConnection();
				saved = connection ? await saveVerifiedSandbox(connection) : false;
			}
		} else if (props.step === 'search' && !searchEnvManaged.value) {
			saved = await saveSearchDecision(searchConnection());
		}
		if (saved) {
			success.value = result;
			if (props.surface === 'onboarding') {
				await nextTick();
				await new Promise((resolve) => window.setTimeout(resolve, SUCCESS_PAUSE_MS));
			}
			emit('advance');
		}
	} catch (error) {
		failure.value = 'provider_error';
		failureDetail.value =
			error instanceof Error && error.message ? sanitizeFailureDetail(error.message) : null;
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
const existingCredentialLabel = (credential: InstanceAiProviderConnection) =>
	`${credential.name} · ${credentialProviderLabel(credential)}`;
</script>

<template>
	<N8nDialog
		:open="open"
		:size="step === 'done' && composeFastPath ? 'small' : 'large'"
		:show-close-button="!busy && step !== 'done'"
		:aria-label="i18n.baseText('instanceAi.onboarding.wizard.ariaLabel')"
		:data-test-id="dialogTestId"
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

				<N8nCallout v-if="modelConnectionLocked" theme="warning">
					<span>{{ i18n.baseText('instanceAi.onboarding.env.title') }}</span>
					{{ i18n.baseText('instanceAi.onboarding.env.description') }}
					<N8nLink :to="ENV_DOCS_URL" size="small" new-window>
						{{ i18n.baseText('instanceAi.onboarding.env.docs') }}
					</N8nLink>
				</N8nCallout>

				<N8nInputLabel
					v-if="showExistingCredentialSelect"
					:class="$style.compactLabel"
					:label="i18n.baseText('instanceAi.onboarding.existingConnection.label')"
					input-name="assistant-existing-model-credential"
				>
					<N8nSelect
						id="assistant-existing-model-credential"
						:model-value="selectedExistingCredentialId"
						:teleported="true"
						:data-test-id="existingCredentialTestId"
						@update:model-value="selectExistingCredential"
					>
						<N8nOption v-if="!readOnly" value="" :label="editableConnectionLabel" />
						<N8nOption
							v-for="credential in compatibleCredentials"
							:key="credential.id"
							:value="credential.id"
							:label="existingCredentialLabel(credential)"
						/>
					</N8nSelect>
				</N8nInputLabel>

				<div :class="$style.fields">
					<N8nInputLabel
						:class="$style.compactLabel"
						:label="i18n.baseText('instanceAi.onboarding.model.provider')"
						input-name="assistant-model-provider"
					>
						<N8nInput
							v-if="modelConnectionLocked || readOnly || selectedExistingCredentialId"
							id="assistant-model-provider"
							:model-value="
								selectedExistingCredential
									? credentialProviderLabel(selectedExistingCredential)
									: STATIC_SECRET_MASK
							"
							disabled
							:data-test-id="surface === 'settings' ? 'n8n-agent-model-provider-input' : undefined"
						/>
						<N8nSelect
							v-else
							id="assistant-model-provider"
							:model-value="modelProvider"
							:teleported="true"
							:data-test-id="
								surface === 'settings'
									? 'n8n-agent-model-provider-select'
									: 'assistant-model-provider'
							"
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
						v-if="
							modelProvider === 'custom' && !modelConnectionLocked && !selectedExistingCredentialId
						"
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
							autocomplete="off"
							:spellcheck="false"
							:disabled="modelConnectionLocked || readOnly || Boolean(selectedExistingCredentialId)"
							:placeholder="
								modelConnectionLocked || readOnly || selectedExistingCredentialId
									? STATIC_SECRET_MASK
									: modelConfig.placeholder
							"
							:data-test-id="
								surface === 'settings' ? 'n8n-agent-model-api-key-input' : 'assistant-model-api-key'
							"
						/>
					</N8nInputLabel>

					<N8nInputLabel
						:class="$style.compactLabel"
						:label="i18n.baseText('instanceAi.onboarding.model.model')"
						input-name="assistant-model-name"
					>
						<N8nSelect
							v-if="modelOptions.length && !modelNameLocked"
							id="assistant-model-name"
							:model-value="modelName"
							:teleported="true"
							filterable
							:data-test-id="
								surface === 'settings' ? 'n8n-agent-model-name-input' : 'assistant-model-name'
							"
							@update:model-value="modelName = String($event ?? '')"
						>
							<N8nOption
								v-for="model in modelOptions"
								:key="model.id"
								:value="model.id"
								:label="
									model.recommended
										? `${model.name} · ${i18n.baseText('instanceAi.onboarding.recommended')}`
										: model.name
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
							:data-test-id="
								surface === 'settings' ? 'n8n-agent-model-name-input' : 'assistant-model-name'
							"
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
					v-if="
						modelProvider === 'custom' && !modelConnectionLocked && !selectedExistingCredentialId
					"
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
				<N8nCallout v-if="sandboxEnvManaged" theme="warning">
					<span>{{ i18n.baseText('instanceAi.onboarding.env.title') }}</span>
					{{ i18n.baseText('instanceAi.onboarding.env.description') }}
				</N8nCallout>
				<N8nInputLabel
					v-if="showExistingCredentialSelect"
					:class="$style.compactLabel"
					:label="i18n.baseText('instanceAi.onboarding.existingConnection.label')"
					input-name="assistant-existing-sandbox-credential"
				>
					<N8nSelect
						id="assistant-existing-sandbox-credential"
						:model-value="selectedExistingCredentialId"
						:teleported="true"
						:data-test-id="existingCredentialTestId"
						@update:model-value="selectExistingCredential"
					>
						<N8nOption v-if="!readOnly" value="" :label="editableConnectionLabel" />
						<N8nOption
							v-for="credential in compatibleCredentials"
							:key="credential.id"
							:value="credential.id"
							:label="existingCredentialLabel(credential)"
						/>
					</N8nSelect>
				</N8nInputLabel>
				<N8nRadioGroup
					v-if="!sandboxEnvManaged && !readOnly && !selectedExistingCredentialId"
					:model-value="sandboxProvider ?? undefined"
					orientation="vertical"
					:class="$style.joinedCards"
					:data-test-id="surface === 'settings' ? 'n8n-agent-sandbox-provider-select' : undefined"
					@update:model-value="selectSandboxProvider"
				>
					<div
						v-for="provider in INSTANCE_AI_SANDBOX_PROVIDERS"
						:key="provider.id"
						:class="$style.optionCard"
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
									:theme="provider.id === 'n8n-sandbox' ? 'secondary' : 'default'"
									size="small"
									:show-border="provider.id !== 'n8n-sandbox'"
									:class="$style.optionBadge"
									bold
								>
									{{
										provider.id === 'n8n-sandbox'
											? i18n.baseText('instanceAi.onboarding.sandbox.freeRecommended')
											: i18n.baseText('instanceAi.onboarding.sandbox.paid')
									}}
								</N8nBadge>
							</span>
							<N8nText color="text-base" step="sm" :class="$style.optionDescription">
								{{
									provider.id === 'n8n-sandbox'
										? i18n.baseText('instanceAi.onboarding.sandbox.n8nDescription')
										: i18n.baseText('instanceAi.onboarding.sandbox.daytonaDescription')
								}}
							</N8nText>
						</span>
					</div>
				</N8nRadioGroup>

				<div
					v-if="!sandboxEnvManaged && sandboxProvider === 'n8n-sandbox'"
					:class="$style.fields"
					:data-test-id="surface === 'settings' ? 'n8n-agent-sandbox-connection-fields' : undefined"
				>
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
						v-if="!selectedExistingCredentialId"
						:class="$style.compactLabel"
						:label="i18n.baseText('instanceAi.onboarding.sandbox.apiKey')"
						input-name="assistant-sandbox-api-key"
					>
						<N8nInput
							id="assistant-sandbox-api-key"
							v-model="sandboxApiKey"
							class="ph-no-capture"
							type="password"
							autocomplete="off"
							:spellcheck="false"
							:placeholder="i18n.baseText('instanceAi.onboarding.sandbox.apiKeyPlaceholder')"
							:data-test-id="
								surface === 'settings'
									? 'n8n-agent-sandbox-api-key-input'
									: 'assistant-sandbox-api-key'
							"
						/>
					</N8nInputLabel>
				</div>
				<div
					v-else-if="
						!sandboxEnvManaged &&
						sandboxProvider === 'daytona' &&
						!selectedExistingCredentialId &&
						!isProxyDaytonaSelection
					"
					:class="$style.fields"
					:data-test-id="surface === 'settings' ? 'n8n-agent-sandbox-connection-fields' : undefined"
				>
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
							autocomplete="off"
							:spellcheck="false"
							placeholder="dtn_…"
							data-test-id="assistant-daytona-api-key"
						/>
					</N8nInputLabel>
					<N8nText step="xs" color="text-light">
						{{ i18n.baseText('instanceAi.onboarding.sandbox.daytonaKey') }}
						<N8nLink to="https://app.daytona.io" new-window>
							{{ i18n.baseText('instanceAi.onboarding.sandbox.daytonaDashboard') }} </N8nLink
						>.
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
				<N8nCallout v-if="searchEnvManaged" theme="warning">
					<span>{{ i18n.baseText('instanceAi.onboarding.env.title') }}</span>
					{{ i18n.baseText('instanceAi.onboarding.env.description') }}
				</N8nCallout>
				<N8nInputLabel
					v-if="showExistingCredentialSelect"
					:class="$style.compactLabel"
					:label="i18n.baseText('instanceAi.onboarding.existingConnection.label')"
					input-name="assistant-existing-search-credential"
				>
					<N8nSelect
						id="assistant-existing-search-credential"
						:model-value="selectedExistingCredentialId"
						:teleported="true"
						:data-test-id="existingCredentialTestId"
						@update:model-value="selectExistingCredential"
					>
						<N8nOption v-if="!readOnly" value="" :label="editableConnectionLabel" />
						<N8nOption
							v-for="credential in compatibleCredentials"
							:key="credential.id"
							:value="credential.id"
							:label="existingCredentialLabel(credential)"
						/>
					</N8nSelect>
				</N8nInputLabel>
				<N8nRadioGroup
					v-if="!searchEnvManaged && !readOnly && !selectedExistingCredentialId"
					:model-value="searchProvider ?? undefined"
					orientation="vertical"
					:class="$style.joinedCards"
					:data-test-id="surface === 'settings' ? 'n8n-agent-search-provider-select' : undefined"
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
						:class="$style.optionCard"
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
									size="small"
									:show-border="false"
									:class="$style.optionBadge"
									bold
								>
									{{ i18n.baseText('instanceAi.onboarding.search.free') }}
								</N8nBadge>
							</span>
							<N8nText color="text-base" step="sm" :class="$style.optionDescription">
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
					v-if="
						!searchEnvManaged &&
						!selectedExistingCredentialId &&
						searchProvider &&
						searchProvider !== 'disabled'
					"
					:class="$style.fields"
					:data-test-id="surface === 'settings' ? 'n8n-agent-search-connection-fields' : undefined"
				>
					<N8nText v-if="searchProvider === 'searxng'" step="xs">
						{{ i18n.baseText('instanceAi.onboarding.search.installDescription') }}
						<N8nLink :to="SEARCH_DOCS_URL" new-window>
							{{ i18n.baseText('instanceAi.onboarding.search.installLink') }} </N8nLink
						>,
						{{ i18n.baseText('instanceAi.onboarding.search.searxngInstallSuffix') }}
					</N8nText>
					<N8nText v-else step="xs">
						{{ i18n.baseText('instanceAi.onboarding.search.braveKeyDescription') }}
						<N8nLink :to="BRAVE_SEARCH_KEYS_URL" new-window>
							{{ i18n.baseText('instanceAi.onboarding.search.braveKeyLink') }} </N8nLink
						>,
						{{ i18n.baseText('instanceAi.onboarding.search.braveKeySuffix') }}
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
					:data-test-id="
						surface === 'settings'
							? `${settingsTestPrefix}-credential-test-error`
							: 'assistant-verification-error'
					"
				>
					<div>
						{{ i18n.baseText(failureKey) }}
						<div
							v-if="failureDetail"
							:class="$style.failureDetail"
							data-test-id="assistant-verification-error-details"
						>
							{{
								i18n.baseText('instanceAi.onboarding.verification.errorDetails', {
									interpolate: { details: failureDetail },
								})
							}}
						</div>
					</div>
				</N8nCallout>
			</Transition>
		</div>

		<N8nDialogFooter
			v-if="!(step === 'done' && composeFastPath)"
			:class="[$style.footer, editMode && $style.editFooter]"
		>
			<N8nButton
				v-if="editMode"
				variant="outline"
				size="medium"
				:label="i18n.baseText('generic.cancel')"
				:disabled="busy"
				:data-test-id="cancelTestId"
				@click="handleOpenChange(false)"
			/>
			<N8nButton
				v-if="canGoBack"
				variant="outline"
				size="medium"
				:label="i18n.baseText('generic.back')"
				:disabled="busy"
				:data-test-id="backTestId"
				@click="emit('back')"
			/>
			<div
				v-if="step !== 'done' && !editMode && visibleSetupSteps.length > 1"
				:class="$style.dots"
				:data-test-id="progressTestId"
				aria-hidden="true"
			>
				<span
					v-for="setupStep in visibleSetupSteps"
					:key="setupStep"
					:class="[$style.dot, setupStep === step && $style.activeDot]"
				/>
			</div>
			<N8nButton
				variant="solid"
				size="medium"
				:label="primaryLabel"
				:loading="busy"
				:disabled="primaryDisabled"
				:data-test-id="primaryTestId"
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
	position: relative;
	width: 100%;
	gap: 0;
	border-radius: var(--radius--md);
}

.joinedCards::after {
	position: absolute;
	inset: 0;
	z-index: 1;
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	border-radius: inherit;
	pointer-events: none;
	content: '';
}

.optionCard {
	position: relative;
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	width: 100%;
	box-sizing: border-box;
	padding: var(--spacing--sm);
	border: 0;
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
	border-top: var(--border-width, 1px) solid var(--border-color--subtle);
}

.optionCard > :first-child {
	width: auto;
	flex-shrink: 0;
}

@media (hover: hover) and (pointer: fine) {
	.optionCard:hover {
		background: var(--background--hover);
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

.optionBadge {
	padding: var(--spacing--4xs) var(--spacing--2xs);
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

.editFooter {
	justify-content: flex-end;
}

.editFooter > :last-child {
	margin-left: 0;
}

.failureDetail {
	margin-top: var(--spacing--4xs);
	overflow-wrap: anywhere;
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
