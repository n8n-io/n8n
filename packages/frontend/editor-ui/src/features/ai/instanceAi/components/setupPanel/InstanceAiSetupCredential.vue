<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import isEqual from 'lodash/isEqual';
import { TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nCopyInput,
	N8nDropdownMenu,
	N8nIcon,
	N8nSegmentControl,
	N8nSetupConnection,
	N8nText,
} from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { addCredentialTranslation, useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import {
	deepCopy,
	DOMAIN_RESTRICTION_FIELDS,
	type ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import type { INodeUi, INodeUpdatePropertiesInformation, IUpdateInformation } from '@/Interface';
import { AI_GATEWAY_UNSUPPORTED_NODE_TYPES, BUILTIN_CREDENTIALS_DOCS_URL } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useAiGateway } from '@/app/composables/useAiGateway';
import { useAiGatewayTopUp } from '@/app/composables/useAiGatewayTopUp';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import type { InstanceAiCredentialContext } from '@/app/composables/useInstanceAiEditorCapability';
import { useCredentialForm } from '@/features/credentials/composables/useCredentialForm';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import { hasOAuthTokenData } from '@/features/credentials/composables/oauthCallback';
import { useQuickConnect } from '@/features/credentials/quickConnect/composables/useQuickConnect';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import CredentialInputs from '@/features/credentials/components/CredentialEdit/CredentialInputs.vue';
import TemplatedAuthSimpleView from '@/features/credentials/components/CredentialEdit/TemplatedAuthSimpleView.vue';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import CredentialsDropdown from '@/features/credentials/components/CredentialPicker/CredentialsDropdown.vue';
import {
	deriveServiceName,
	listPlaceholderTitles,
} from '@/features/credentials/templatedAuth.utils';
import { getAppNameFromCredType, getAppNameFromNodeName } from '@/app/utils/nodeTypesUtils';
import type {
	SetupCredentialItem,
	SetupCredentialRef,
} from '../../composables/useSetupPanelActions';
import { useSetupPanelDocument } from '../../composables/useSetupPanelDocument';
import type { SetupPanelConnectionMethod } from '../../composables/useSetupPanelTelemetry';
import { AI_GATEWAY_MANAGED_TAG } from '../../constants';

const props = defineProps<{
	item: SetupCredentialItem;
	node?: INodeUi;
	/** Saved credential selected while its workflow binding is queued or being applied. */
	pendingCredential?: SetupCredentialRef;
	nodes: INodeUi[];
	workflowId: string;
	projectId: string;
	/** Whether the assistant is busy with another request. */
	helpDisabled?: boolean;
	/** Allow the shared account to be configured separately for each node. */
	allowPerNode?: boolean;
}>();
const emit = defineEmits<{
	bindCredential: [item: SetupCredentialItem, credentialId: string];
	connectStarted: [method: SetupPanelConnectionMethod];
	askForHelp: [credential: InstanceAiCredentialContext];
	setCredentialsPerNode: [];
	'update:busy': [value: boolean];
	'update:hasChanges': [value: boolean];
}>();
const i18n = useI18n();
const rootStore = useRootStore();
const uiStore = useUIStore();
const toast = useToast();
const telemetry = useTelemetry();
const externalHooks = useExternalHooks();
const credentialsStore = useCredentialsStore();
const oauth = useCredentialOAuth();
const quickConnect = useQuickConnect();
const gateway = useAiGateway();
const { openTopUp } = useAiGatewayTopUp();
const initialized = ref(false);
const initializationFailed = ref(false);
const busy = ref(false);
const reopenAuthorization = ref<() => void>();
const createNew = ref(false);
const hasDraft = ref(false);
watch(busy, (value) => emit('update:busy', value));
watch(
	() => hasDraft.value || createNew.value,
	(value) => emit('update:hasChanges', value),
);
const chooseExisting = ref(false);
const oauthConnection = ref<boolean>();
const oauthMode = ref<'managed' | 'custom' | 'unknown'>('unknown');
const loadingOAuth = ref(false);
const mode = ref<'credits' | 'own'>('credits');
const modeChanged = ref(false);
let active = true;

useSetupPanelDocument({
	workflowId: () => props.workflowId,
	itemId: () => props.item.id,
	node: () => props.node,
});
const form = useCredentialForm({
	mode: 'new',
	activeId: () => props.item.credentialType,
	contextNode: () => props.node ?? null,
	projectId: () => props.projectId,
	setupHint: () => props.item.setupHint,
});
form.setCredentialPropertyDefaults();
const isOAuth = form.isOAuthType;
const isTemplated = computed(
	() => props.item.credentialType === TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
);
const canQuickConnect = computed(
	() =>
		(isOAuth.value && oauth.canOAuthCredentialQuickConnect(props.item.credentialType)) ||
		Boolean(
			!oauth.isOAuthCredentialType(props.item.credentialType) &&
				props.node &&
				quickConnect.getQuickConnectOption(props.item.credentialType, props.node.type),
		),
);
const serviceName = computed(
	() =>
		deriveServiceName(props.item.setupHint) ??
		getAppNameFromNodeName(
			getAppNameFromCredType(
				props.item.appDisplayName ??
					form.credentialType.value?.displayName ??
					props.item.credentialType,
			),
		),
);
const binding = computed(() => {
	if (props.pendingCredential) return props.pendingCredential;
	const value = props.node?.credentials?.[props.item.credentialType];
	return value && typeof value !== 'string' ? value : undefined;
});
const connected = computed(
	() =>
		!createNew.value &&
		!hasDraft.value &&
		Boolean(binding.value?.id || binding.value?.__aiGatewayManaged) &&
		!loadingOAuth.value &&
		!needsAuthorization.value,
);
const usableCredentials = computed(() =>
	credentialsStore.hasUsableCredentialsForScope({ workflowId: props.workflowId })
		? credentialsStore.getUsableCredentialByType(props.item.credentialType)
		: [],
);
const storedCredential = computed(() =>
	binding.value?.id
		? (usableCredentials.value.find(({ id }) => id === binding.value?.id) ??
			credentialsStore.getCredentialById(binding.value.id))
		: undefined,
);
const usesCustomOAuth = computed(() => oauthMode.value === 'custom');
const selectedOAuthId = computed(() =>
	!createNew.value && !hasDraft.value && isOAuth.value ? binding.value?.id : undefined,
);
watch(
	[
		selectedOAuthId,
		() => storedCredential.value?.updatedAt,
		() => storedCredential.value?.connectedByMe,
	],
	async ([id], _previous, onCleanup) => {
		let stale = false;
		onCleanup(() => {
			stale = true;
		});
		oauthConnection.value = undefined;
		oauthMode.value = 'unknown';
		loadingOAuth.value = Boolean(id);
		if (!id) return;
		try {
			const credential = await credentialsStore.getCredentialData({ id });
			if (stale) return;
			const data = credential?.data;
			if (credential?.isResolvable) oauthConnection.value = credential.connectedByMe;
			if (data && typeof data === 'object') {
				if (!credential?.isResolvable) {
					oauthConnection.value =
						Boolean(
							data.grantType && !['authorizationCode', 'pkce'].includes(String(data.grantType)),
						) || hasOAuthTokenData(credential);
				}
				// Stored client fields identify a custom app even when managed OAuth is available.
				const customClient = Boolean(
					(data.clientId && data.clientSecret) || (data.consumerKey && data.consumerSecret),
				);
				oauthMode.value = customClient || !form.managedOAuthAvailable.value ? 'custom' : 'managed';
			}
		} catch {
			// A shared credential can be usable without permission to read its data.
		} finally {
			if (!stale) loadingOAuth.value = false;
		}
	},
	{ immediate: true },
);
const needsAuthorization = computed(
	() => Boolean(selectedOAuthId.value) && oauthConnection.value === false,
);
const showExistingPicker = computed(
	() =>
		chooseExisting.value ||
		storedCredential.value?.isResolvable ||
		(!connected.value &&
			!needsAuthorization.value &&
			!createNew.value &&
			!hasDraft.value &&
			usableCredentials.value.length > 0),
);
const gatewayAvailable = computed(
	() =>
		gateway.isEnabled.value &&
		gateway.isCredentialTypeSupported(props.item.credentialType) &&
		props.nodes.length > 0 &&
		props.nodes.every((node) => {
			const { operation, resource } = node.parameters;
			return (
				!AI_GATEWAY_UNSUPPORTED_NODE_TYPES.includes(node.type) &&
				gateway.isNodeTypeVersionSupported(node.type, node.typeVersion) &&
				(typeof operation !== 'string' ||
					!operation ||
					gateway.isActionSupported(
						node.type,
						typeof resource === 'string' ? resource : undefined,
						operation,
					))
			);
		}),
);
watch(
	[gatewayAvailable, gateway.balance, usableCredentials],
	([available, balance, credentials]) => {
		if (available && !modeChanged.value && !connected.value)
			mode.value = (balance ?? 0) > 0 || credentials.length === 0 ? 'credits' : 'own';
	},
	{ immediate: true },
);

const inlineFields = computed(() => {
	const fields = form.credentialProperties.value.filter(
		(property) =>
			property.type !== 'hidden' &&
			property.type !== 'notice' &&
			!property.typeOptions?.copyButton &&
			!(
				props.item.credentialType === 'googlePalmApi' &&
				property.name === 'host' &&
				(form.credentialData.value.host ?? property.default) === property.default
			) &&
			!DOMAIN_RESTRICTION_FIELDS.some(({ name }) => name === property.name),
	);
	const required = fields.filter((property) => property.required);
	// Older credential definitions can omit required flags even for access tokens.
	const inputs = required.length ? required : fields.filter((property) => !property.default);
	return inputs.length <= 2 ? inputs : [];
});
const fieldTitles = computed(() =>
	isTemplated.value
		? listPlaceholderTitles(form.credentialData.value)
		: inlineFields.value.map((property) => property.displayName),
);
const useAdvancedForm = computed(() => !canQuickConnect.value && fieldTitles.value.length === 0);
const advancedIsPrimary = computed(() => isTemplated.value && useAdvancedForm.value);
const valueLabel = computed(() =>
	binding.value?.__aiGatewayManaged
		? i18n.baseText('instanceAi.setupPanel.connectedWith')
		: isOAuth.value
			? i18n.baseText('instanceAi.setupPanel.account')
			: i18n.baseText('instanceAi.setupPanel.credential'),
);
const balanceLabel = computed(() =>
	gateway.balance.value === undefined
		? ''
		: gateway.balance.value <= 0
			? i18n.baseText('aiGateway.wallet.noCredits')
			: i18n.baseText('aiGateway.wallet.balanceRemaining', {
					interpolate: { balance: `$${Number(gateway.balance.value).toFixed(2)}` },
				}),
);
const value = computed(() =>
	binding.value?.__aiGatewayManaged
		? [i18n.baseText('generic.n8nCredits'), balanceLabel.value].filter(Boolean).join(' · ')
		: isOAuth.value
			? (storedCredential.value?.connectedAccountIdentifier ??
				storedCredential.value?.name ??
				binding.value?.name)
			: (storedCredential.value?.name ?? binding.value?.name),
);
const useCredits = computed(() => gatewayAvailable.value && mode.value === 'credits');
const actionLabel = computed(() =>
	needsAuthorization.value
		? i18n.baseText('credentialEdit.oAuthButton.connectMyAccount')
		: useCredits.value
			? i18n.baseText('instanceAi.setupPanel.useCredits')
			: advancedIsPrimary.value
				? i18n.baseText('instanceAi.setupPanel.advancedSetup')
				: canQuickConnect.value || useAdvancedForm.value
					? i18n.baseText('instanceAi.setupPanel.connect')
					: isOAuth.value
						? i18n.baseText('instanceAi.setupPanel.saveAndSignIn')
						: i18n.baseText('generic.save'),
);
const actionDisabled = computed(() => !initialized.value || loadingOAuth.value);
const redirectUrl = computed(() => {
	const urls = rootStore.OAuthCallbackUrls;
	if (form.parentTypes.value.includes('oAuth1Api') || props.item.credentialType === 'oAuth1Api') {
		return 'oauth1' in urls && typeof urls.oauth1 === 'string' ? urls.oauth1 : '';
	}
	return 'oauth2' in urls && typeof urls.oauth2 === 'string' ? urls.oauth2 : '';
});
const documentationUrl = computed(() => {
	const url = props.item.setupHint?.docsUrl ?? form.credentialType.value?.documentationUrl;
	if (!url) return '';
	return /^https?:\/\//.test(url) ? url : `${BUILTIN_CREDENTIALS_DOCS_URL}${url}/`;
});
const modeOptions = computed<Array<{ value: 'credits' | 'own'; label: string }>>(() => [
	{ value: 'credits', label: i18n.baseText('generic.n8nCredits') },
	{ value: 'own', label: i18n.baseText('instanceAi.setupPanel.useOwnKey') },
]);
const perNodeActions = computed<DropdownMenuItemProps[]>(() =>
	props.allowPerNode && connected.value
		? [{ id: 'per-node', label: i18n.baseText('instanceAi.setupPanel.setCredentialsPerNode') }]
		: [],
);
const actions = computed<DropdownMenuItemProps[]>(() => {
	const existing = usableCredentials.value.some(
		(credential) => !connected.value || credential.id !== binding.value?.id,
	)
		? [{ id: 'existing', label: i18n.baseText('instanceAi.setupPanel.useExisting') }]
		: [];
	if (!connected.value && useCredits.value) return existing;
	if (needsAuthorization.value)
		return [
			{ id: 'edit', label: i18n.baseText('instanceAi.setupPanel.editCredential') },
			...existing,
		];
	if (connected.value && binding.value?.__aiGatewayManaged)
		return [
			{ id: 'replace', label: i18n.baseText('instanceAi.setupPanel.useOwnKey') },
			{ id: 'manage', label: i18n.baseText('instanceAi.setupPanel.manageCredits') },
			...perNodeActions.value,
		];
	const items: DropdownMenuItemProps[] = connected.value
		? [
				{
					id: 'replace',
					label: i18n.baseText(
						isOAuth.value
							? usesCustomOAuth.value
								? 'instanceAi.setupPanel.connectWithOAuth'
								: 'instanceAi.setupPanel.switchAccount'
							: 'instanceAi.setupPanel.replaceKey',
					),
				},
				{ id: 'edit', label: i18n.baseText('instanceAi.setupPanel.editCredential') },
			]
		: advancedIsPrimary.value
			? []
			: [{ id: 'advanced', label: i18n.baseText('instanceAi.setupPanel.advancedSetup') }];
	return [...items, ...existing, ...perNodeActions.value];
});

const helpLabel = computed(() => {
	const fieldName = inlineFields.value.length === 1 ? inlineFields.value[0].name : undefined;
	return i18n.baseText(
		fieldName === 'apiKey'
			? 'instanceAi.setupPanel.helpFindApiKey'
			: fieldName === 'accessToken'
				? 'instanceAi.setupPanel.helpFindAccessToken'
				: 'instanceAi.setupPanel.helpSetUp',
	);
});

function askForHelp() {
	if (props.helpDisabled || busy.value) return;
	const selectedMode = selectedOAuthId.value
		? oauthMode.value
		: form.isManagedOAuthMode.value
			? 'managed'
			: 'custom';
	const selectedConnection = selectedOAuthId.value ? oauthConnection.value : false;
	emit('askForHelp', {
		id: binding.value?.id ?? undefined,
		credentialType: props.item.credentialType,
		displayName: serviceName.value,
		nodeName: props.node?.name,
		nodeType: props.node?.type,
		placeholderTitles: isOAuth.value ? undefined : fieldTitles.value,
		documentationUrl: documentationUrl.value || undefined,
		oauthRedirectUrl: isOAuth.value ? redirectUrl.value : undefined,
		setupContext: isOAuth.value
			? [
					i18n.baseText('instanceAi.setupPanel.helpOAuthState', {
						interpolate: {
							mode: selectedMode,
							state:
								selectedConnection === undefined
									? 'unknown'
									: selectedConnection
										? 'connected'
										: 'disconnected',
						},
					}),
					!needsAuthorization.value && fieldTitles.value.length
						? i18n.baseText('instanceAi.setupPanel.helpVisibleFields', {
								interpolate: { fields: fieldTitles.value.join(', ') },
							})
						: '',
					i18n.baseText(
						canQuickConnect.value
							? 'instanceAi.setupPanel.helpManagedOAuthAvailable'
							: 'instanceAi.setupPanel.helpManagedOAuthUnavailable',
					),
				]
					.filter(Boolean)
					.join(' ')
			: undefined,
	});
}

function emitBinding(id: string, submittedData?: ICredentialDataDecryptedObject) {
	if (!active) return;
	createNew.value = false;
	// A completed save must not discard edits made while the request was pending.
	hasDraft.value = submittedData !== undefined && !isEqual(formData(), submittedData);
	chooseExisting.value = false;
	emit('bindCredential', props.item, id);
}

function onCredentialSelected(update: INodeUpdatePropertiesInformation) {
	const credential = update.properties.credentials?.[props.item.credentialType];
	if (!credential || typeof credential === 'string') return;
	emit('connectStarted', 'existing');
	if (credential.__aiGatewayManaged) emitBinding(AI_GATEWAY_MANAGED_TAG);
	else if (credential.id) emitBinding(credential.id);
}

function formData(): ICredentialDataDecryptedObject {
	const data = { ...form.credentialData.value };
	delete data.homeProject;
	delete data.sharedWithProjects;
	return data;
}

function onDataChange(update: IUpdateInformation) {
	if (!form.onDataChange(update)) return;
	hasDraft.value = true;
	if (reopenAuthorization.value) {
		reopenAuthorization.value = undefined;
		oauth.cancelAuthorize();
	}
}

async function saveKey() {
	const workflowId = props.workflowId;
	const details = {
		id: '',
		name: form.credentialName.value,
		type: props.item.credentialType,
		data: deepCopy(formData()),
	};
	const credential = await credentialsStore.createNewCredential(
		details,
		props.projectId,
		undefined,
		{
			skipStoreUpdate: true,
		},
	);
	await externalHooks.run('credential.saved', {
		credential_type: credential.type,
		credential_id: credential.id,
		is_new: true,
	});
	telemetry.track('User created credentials', {
		credential_type: credential.type,
		credential_id: credential.id,
		workflow_id: props.workflowId,
	});
	if (form.isCredentialTestable.value) {
		await form.testCredential({ ...details, id: credential.id });
		if (!form.testedSuccessfully.value) {
			await credentialsStore.deleteCredential({ id: credential.id });
			return;
		}
	}
	credentialsStore.upsertCredential(credential);
	if (!active || props.workflowId !== workflowId) return;
	// Creation succeeded. A picker refresh must not force another credential creation.
	await credentialsStore.fetchUsableCredentials({ workflowId }).catch(() => {});
	emitBinding(credential.id, details.data);
}

async function connect() {
	if (reopenAuthorization.value) {
		reopenAuthorization.value();
		return;
	}
	if (busy.value || actionDisabled.value) return;
	if (
		!needsAuthorization.value &&
		!useCredits.value &&
		!canQuickConnect.value &&
		!useAdvancedForm.value
	) {
		form.showValidationWarning.value = true;
		if (!form.requiredPropertiesFilled.value) return;
	}
	busy.value = true;
	form.authError.value = '';
	try {
		if (needsAuthorization.value && storedCredential.value) {
			emit('connectStarted', 'oauth');
			const credential = await oauth.authorizeExistingCredential(storedCredential.value, {
				workflowId: props.workflowId,
				onAuthorizationStarted: (reopen) => {
					reopenAuthorization.value = reopen;
				},
			});
			if (credential) {
				oauthConnection.value = true;
				emitBinding(credential.id);
			}
		} else if (useCredits.value) {
			emit('connectStarted', 'gateway');
			emitBinding(AI_GATEWAY_MANAGED_TAG);
		} else if (useAdvancedForm.value) {
			onMenuAction('advanced');
		} else if (isOAuth.value) {
			emit('connectStarted', 'oauth');
			const submittedData = canQuickConnect.value ? undefined : deepCopy(formData());
			const credential = await oauth.createAndAuthorize(
				props.item.credentialType,
				props.node?.type,
				{
					projectId: props.projectId,
					workflowId: props.workflowId,
					data: submittedData,
					name: form.credentialName.value || undefined,
					onAuthorizationStarted: (reopen) => {
						reopenAuthorization.value = reopen;
					},
				},
			);
			if (credential) emitBinding(credential.id, submittedData);
		} else if (canQuickConnect.value && props.node) {
			emit('connectStarted', 'api_key');
			const credential = await quickConnect.connect({
				credentialTypeName: props.item.credentialType,
				nodeType: props.node.type,
				serviceName: serviceName.value,
				source: 'credential_type',
				projectId: props.projectId,
				workflowId: props.workflowId,
			});
			if (credential) emitBinding(credential.id);
		} else {
			emit('connectStarted', 'api_key');
			await saveKey();
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('instanceAi.setupPanel.connectionError'));
	} finally {
		reopenAuthorization.value = undefined;
		busy.value = false;
	}
}

function onMenuAction(id: string) {
	if (id === 'per-node') {
		emit('setCredentialsPerNode');
		return;
	}
	if (id === 'existing') {
		chooseExisting.value = true;
		return;
	}
	if (id === 'manage') {
		void openTopUp({ source: 'credential_selector', credentialType: props.item.credentialType });
		return;
	}
	if (id === 'edit' && binding.value?.id) {
		uiStore.openExistingCredential(binding.value.id, { workflowId: props.workflowId });
		return;
	}
	if (id === 'replace') {
		mode.value = 'own';
		modeChanged.value = true;
		if (isOAuth.value && canQuickConnect.value) void connect();
		else {
			createNew.value = true;
			if (!hasDraft.value) {
				initialized.value = false;
				void initialize();
			}
		}
		return;
	}
	emit('connectStarted', 'advanced');
	uiStore.openNewCredential(
		props.item.credentialType,
		false,
		true,
		props.projectId,
		undefined,
		props.node?.name,
		props.node,
		{
			closeOnSave: true,
			credentialSetupHint: props.item.setupHint,
			workflowId: props.workflowId,
			onCredentialCreated: (credential) => emitBinding(credential.id),
		},
	);
}

async function initialize() {
	initializationFailed.value = false;
	try {
		uiStore.activeCredentialType = props.item.credentialType;
		const initialization = form.initialize();
		const type = props.item.credentialType;
		const locale = rootStore.defaultLocale;
		if (locale !== 'en' && !i18n.exists(`n8n-nodes-base.credentials.${type}`)) {
			const translation = await credentialsStore
				.getCredentialTranslation(type)
				.catch(() => undefined);
			if (translation) addCredentialTranslation({ [type]: translation }, locale);
		}
		await initialization;
		initialized.value = true;
	} catch (error) {
		initializationFailed.value = true;
		if (active) toast.showError(error, i18n.baseText('instanceAi.setupPanel.connectionError'));
	}
}
if (binding.value?.id || binding.value?.__aiGatewayManaged) initialized.value = true;
else void initialize();
watch(
	() => props.item.setupHint,
	(hint) => {
		if (hint && !connected.value) void initialize();
	},
);
onMounted(() => {
	void Promise.all([gateway.fetchConfig(), gateway.fetchWallet()]).catch(() => {});
});
onScopeDispose(() => {
	active = false;
	emit('update:busy', false);
	emit('update:hasChanges', false);
	oauth.cancelAuthorize();
	quickConnect.cancelConnect();
});
</script>

<template>
	<div :class="$style.form">
		<template v-if="showExistingPicker">
			<NodeCredentials
				v-if="node"
				:class="$style.existing"
				:node="node"
				:override-cred-type="item.credentialType"
				:project-id="projectId"
				:workflow-id="workflowId"
				:credential-setup-hint="item.setupHint"
				:credentials-field-label="i18n.baseText('instanceAi.setupPanel.credential')"
				standalone
				hide-issues
				skip-auto-select
				@credential-selected="onCredentialSelected"
				@connection-started="emit('connectStarted', 'oauth')"
				@connection-completed="emitBinding($event)"
			>
				<template v-if="perNodeActions.length" #label-postfix>
					<N8nDropdownMenu
						:items="perNodeActions"
						:modal="false"
						placement="bottom-end"
						@select="onMenuAction"
					>
						<template #trigger>
							<N8nButton
								variant="ghost"
								size="xsmall"
								icon-only
								:disabled="busy"
								:aria-label="i18n.baseText('node.moreActions')"
							>
								<N8nIcon icon="pencil" size="small" />
							</N8nButton>
						</template>
					</N8nDropdownMenu>
				</template>
			</NodeCredentials>
			<CredentialsDropdown
				v-else
				teleported
				:credential-options="
					usableCredentials.map(({ id, name, homeProject }) => ({
						id,
						name,
						homeProject,
						typeDisplayName: form.credentialType.value?.displayName,
					}))
				"
				:selected-credential-id="null"
				:permissions="form.credentialPermissions.value"
				@credential-selected="
					emit('connectStarted', 'existing');
					emitBinding($event);
				"
				@new-credential="onMenuAction('advanced')"
			/>
			<N8nButton
				v-if="chooseExisting"
				variant="ghost"
				size="small"
				@click="chooseExisting = false"
				>{{ i18n.baseText('generic.cancel') }}</N8nButton
			>
		</template>
		<N8nSetupConnection
			v-else
			:connected="connected && !reopenAuthorization"
			:value-label="valueLabel"
			:value="value"
			:action-label="actionLabel"
			:actions="reopenAuthorization ? [] : actions"
			:action-disabled="actionDisabled"
			:loading="loadingOAuth || (busy && !reopenAuthorization)"
			@action="connect"
			@select="onMenuAction"
		>
			<N8nSegmentControl
				v-if="gatewayAvailable"
				:model-value="mode"
				:options="modeOptions"
				@update:model-value="
					mode = $event;
					modeChanged = true;
				"
			/>
			<template v-if="useCredits">
				<N8nText size="small" :class="$style.hint">{{
					i18n.baseText('instanceAi.setupPanel.creditsDescription')
				}}</N8nText>
			</template>
			<template #action-leading>
				<N8nText v-if="useCredits && balanceLabel" step="xs">{{ balanceLabel }}</N8nText>
				<N8nButton
					v-else-if="!useCredits"
					variant="ghost"
					size="small"
					:class="$style.help"
					:disabled="helpDisabled || busy"
					@click="askForHelp"
				>
					<N8nIcon icon="sparkles" size="small" />
					{{ helpLabel }}
				</N8nButton>
			</template>
			<N8nText v-if="needsAuthorization" size="small">{{ value }}</N8nText>
			<template
				v-if="
					!loadingOAuth &&
					!needsAuthorization &&
					!useCredits &&
					!canQuickConnect &&
					!useAdvancedForm
				"
			>
				<label v-if="isOAuth && redirectUrl" :class="$style.redirect">
					{{ i18n.baseText('instanceAi.setupPanel.redirectUrl') }}
					<N8nCopyInput
						:class="$style.redirectInput"
						:value="redirectUrl"
						:copy-label="i18n.baseText('instanceAi.setupPanel.copyRedirectUrl')"
						size="small"
					/>
				</label>
				<TemplatedAuthSimpleView
					v-if="isTemplated"
					compact
					:credential-data="form.credentialData.value"
					:show-validation-warnings="form.showValidationWarning.value"
					@update="onDataChange"
				/>
				<CredentialInputs
					v-else
					compact
					:credential-type="item.credentialType"
					:credential-properties="inlineFields"
					:credential-data="form.credentialData.value"
					:documentation-url="documentationUrl"
					:show-validation-warnings="form.showValidationWarning.value"
					@update="onDataChange"
				/>
			</template>
		</N8nSetupConnection>
		<N8nCallout v-if="form.authError.value" theme="danger">{{ form.authError.value }}</N8nCallout>
		<N8nButton v-if="initializationFailed" variant="ghost" size="small" @click="initialize">
			{{ i18n.baseText('generic.retry') }}
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.redirect {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--xs);
	color: var(--text-color--subtle);
}

.hint {
	color: var(--text-color--subtle);
}

.help {
	padding-inline: 0;
	color: var(--text-color--subtle);
}

.form .existing {
	margin-top: 0;
}

.redirectInput {
	font-family: var(--font-family--monospace);

	:deep(input) {
		font-size: var(--font-size--2xs);
		text-overflow: ellipsis;
	}
}
</style>
