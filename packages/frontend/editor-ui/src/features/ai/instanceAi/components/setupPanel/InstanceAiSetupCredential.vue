<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import isEqual from 'lodash/isEqual';
import { TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nCopyInput,
	N8nLink,
	N8nSegmentControl,
	N8nSetupConnection,
	N8nText,
} from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { addCredentialTranslation, useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { deepCopy, type ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { INodeUi, INodeUpdatePropertiesInformation, IUpdateInformation } from '@/Interface';
import { AI_GATEWAY_UNSUPPORTED_NODE_TYPES, BUILTIN_CREDENTIALS_DOCS_URL } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useAiGateway } from '@/app/composables/useAiGateway';
import { useAiGatewayTopUp } from '@/app/composables/useAiGatewayTopUp';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useCredentialForm } from '@/features/credentials/composables/useCredentialForm';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
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
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import type { SetupCredentialItem } from '../../composables/useSetupPanelActions';
import { useSetupPanelDocument } from '../../composables/useSetupPanelDocument';
import type { SetupPanelConnectionMethod } from '../../composables/useSetupPanelTelemetry';
import { AI_GATEWAY_MANAGED_TAG } from '../../constants';

const props = defineProps<{
	item: SetupCredentialItem;
	node?: INodeUi;
	nodes: INodeUi[];
	workflowId: string;
	projectId: string;
}>();
const emit = defineEmits<{
	bindCredential: [item: SetupCredentialItem, credentialId: string];
	connectStarted: [method: SetupPanelConnectionMethod];
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
const createNew = ref(false);
const hasDraft = ref(false);
const chooseExisting = ref(false);
const mode = ref<'credits' | 'own'>('credits');
const modeChanged = ref(false);
const usesCustomOAuth = ref(false);
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
const isOAuth = computed(() => oauth.isOAuthCredentialType(props.item.credentialType));
const isTemplated = computed(
	() => props.item.credentialType === TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
);
const canQuickConnect = computed(
	() =>
		oauth.canOAuthCredentialQuickConnect(props.item.credentialType) ||
		Boolean(
			props.node && quickConnect.getQuickConnectOption(props.item.credentialType, props.node.type),
		),
);
const serviceName = computed(
	() =>
		deriveServiceName(props.item.setupHint) ??
		getAppNameFromCredType(
			props.item.appDisplayName ??
				form.credentialType.value?.displayName ??
				props.item.credentialType,
		),
);
const binding = computed(() => {
	const value = props.node?.credentials?.[props.item.credentialType];
	return value && typeof value !== 'string' ? value : undefined;
});
const connected = computed(
	() =>
		!createNew.value &&
		!hasDraft.value &&
		Boolean(binding.value?.id || binding.value?.__aiGatewayManaged),
);
const storedCredential = computed(() =>
	binding.value?.id ? credentialsStore.getCredentialById(binding.value.id) : undefined,
);
watch(
	() => (isOAuth.value && canQuickConnect.value ? binding.value?.id : undefined),
	async (id) => {
		usesCustomOAuth.value = false;
		if (!id) return;
		try {
			const credential = await credentialsStore.getCredentialData({ id });
			if (!active || binding.value?.id !== id) return;
			const data = credential?.data;
			usesCustomOAuth.value = Boolean(
				typeof data === 'object' && data?.clientId && data?.clientSecret,
			);
		} catch {
			// Shared credentials can be usable without permission to read their data.
		}
	},
	{ immediate: true },
);
const usableCredentials = computed(() =>
	credentialsStore.hasUsableCredentialsForScope({ workflowId: props.workflowId })
		? credentialsStore.getUsableCredentialByType(props.item.credentialType)
		: [],
);
const showExistingPicker = computed(
	() =>
		chooseExisting.value ||
		storedCredential.value?.isResolvable ||
		(!connected.value && !createNew.value && !hasDraft.value && usableCredentials.value.length > 0),
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

const requiredFields = computed(() =>
	form.credentialProperties.value.filter(
		(property) => property.required && property.type !== 'hidden',
	),
);
const useAdvancedForm = computed(
	() =>
		!isOAuth.value &&
		!isTemplated.value &&
		!canQuickConnect.value &&
		requiredFields.value.length === 0,
);
const fieldTitles = computed(() =>
	isTemplated.value
		? listPlaceholderTitles(form.credentialData.value)
		: requiredFields.value.map((property) => property.displayName),
);
const valueLabel = computed(() =>
	binding.value?.__aiGatewayManaged
		? i18n.baseText('instanceAi.setupPanel.connectedWith')
		: isOAuth.value
			? i18n.baseText('instanceAi.setupPanel.account')
			: fieldTitles.value.length === 1
				? fieldTitles.value[0]
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
			: '••••••••',
);
const useCredits = computed(() => gatewayAvailable.value && mode.value === 'credits');
const actionLabel = computed(() =>
	useCredits.value
		? i18n.baseText('instanceAi.setupPanel.useCredits')
		: canQuickConnect.value || useAdvancedForm.value
			? i18n.baseText('instanceAi.setupPanel.connect')
			: isOAuth.value
				? i18n.baseText('instanceAi.setupPanel.saveAndSignIn')
				: i18n.baseText('generic.save'),
);
const actionDisabled = computed(
	() =>
		!initialized.value ||
		(!useCredits.value &&
			!canQuickConnect.value &&
			!useAdvancedForm.value &&
			!form.requiredPropertiesFilled.value),
);
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
const actions = computed<DropdownMenuItemProps[]>(() => {
	if (!connected.value && useCredits.value) return [];
	if (connected.value && binding.value?.__aiGatewayManaged)
		return [
			{ id: 'replace', label: i18n.baseText('instanceAi.setupPanel.useOwnKey') },
			{ id: 'manage', label: i18n.baseText('instanceAi.setupPanel.manageCredits') },
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
		: [{ id: 'advanced', label: i18n.baseText('instanceAi.setupPanel.advancedSetup') }];
	if (props.node && usableCredentials.value.length)
		items.push({ id: 'existing', label: i18n.baseText('instanceAi.setupPanel.useExisting') });
	return items;
});

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
	if (form.onDataChange(update)) hasDraft.value = true;
}

async function saveKey() {
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
	await credentialsStore.fetchUsableCredentials({ workflowId: props.workflowId });
	emitBinding(credential.id, details.data);
}

async function connect() {
	if (busy.value || actionDisabled.value) return;
	busy.value = true;
	form.authError.value = '';
	try {
		if (useCredits.value) {
			emit('connectStarted', 'gateway');
			emitBinding(AI_GATEWAY_MANAGED_TAG);
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
		} else if (useAdvancedForm.value) {
			onMenuAction('advanced');
		} else {
			emit('connectStarted', 'api_key');
			await saveKey();
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('instanceAi.setupPanel.connectionError'));
	} finally {
		busy.value = false;
	}
}

function onMenuAction(id: string) {
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
	busy.value = true;
	try {
		uiStore.activeCredentialType = props.item.credentialType;
		const type = props.item.credentialType;
		const locale = rootStore.defaultLocale;
		if (locale !== 'en' && !i18n.exists(`n8n-nodes-base.credentials.${type}`)) {
			const translation = await credentialsStore
				.getCredentialTranslation(type)
				.catch(() => undefined);
			if (translation) addCredentialTranslation({ [type]: translation }, locale);
		}
		await form.initialize();
		initialized.value = true;
	} catch (error) {
		initializationFailed.value = true;
		if (active) toast.showError(error, i18n.baseText('instanceAi.setupPanel.connectionError'));
	} finally {
		busy.value = false;
	}
}
onMounted(() => {
	if (connected.value) initialized.value = true;
	else void initialize();
	void Promise.all([gateway.fetchConfig(), gateway.fetchWallet()]).catch(() => {});
});
onScopeDispose(() => {
	active = false;
	oauth.cancelAuthorize();
	quickConnect.cancelConnect();
});
</script>

<template>
	<div :class="$style.form">
		<template v-if="showExistingPicker">
			<NodeCredentials
				v-if="node"
				:node="node"
				:override-cred-type="item.credentialType"
				:project-id="projectId"
				:workflow-id="workflowId"
				:credential-setup-hint="item.setupHint"
				standalone
				hide-issues
				skip-auto-select
				@credential-selected="onCredentialSelected"
			/>
			<CredentialsDropdown
				v-else
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
			:connected="connected"
			:value-label="valueLabel"
			:value="value"
			:action-label="actionLabel"
			:actions="actions"
			:action-disabled="actionDisabled"
			:loading="busy"
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
			<template v-if="useCredits && balanceLabel" #action-leading>
				<N8nText step="xs">{{ balanceLabel }}</N8nText>
			</template>
			<template v-if="initialized && !useCredits && !canQuickConnect">
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
					:credential-data="form.credentialData.value"
					@update="onDataChange"
				/>
				<CredentialInputs
					v-else
					compact
					:credential-type="item.credentialType"
					:credential-properties="requiredFields"
					:credential-data="form.credentialData.value"
					:documentation-url="documentationUrl"
					:show-validation-warnings="form.showValidationWarning.value"
					@update="onDataChange"
				/>
			</template>
			<template v-if="initialized && !useCredits && !canQuickConnect && documentationUrl" #footer>
				<N8nLink :to="documentationUrl" size="small">{{
					i18n.baseText('credentialEdit.credentialConfig.openDocs')
				}}</N8nLink>
			</template>
		</N8nSetupConnection>
		<N8nButton
			v-if="!showExistingPicker && !connected && node && usableCredentials.length"
			:class="$style.existing"
			variant="ghost"
			size="small"
			@click="chooseExisting = true"
		>
			{{ i18n.baseText('instanceAi.setupPanel.useExisting') }}
		</N8nButton>
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

.existing {
	align-self: flex-start;
}

.hint {
	color: var(--text-color--subtle);
}

.redirectInput {
	font-family: var(--font-family--monospace);

	:deep(input) {
		font-size: var(--font-size--2xs);
		text-overflow: ellipsis;
	}
}
</style>
