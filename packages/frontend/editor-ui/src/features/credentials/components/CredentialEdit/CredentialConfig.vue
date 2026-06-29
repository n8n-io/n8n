<script setup lang="ts">
import { computed, onBeforeMount, watch } from 'vue';

import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	INode,
	INodeProperties,
} from 'n8n-workflow';
import { isCommunityPackageName } from 'n8n-workflow';

import type { IUpdateInformation } from '@/Interface';
import CredentialModeSelector, { type CredentialModeOption } from './CredentialModeSelector.vue';
import EnterpriseEdition from '@/app/components/EnterpriseEdition.ee.vue';
import { useI18n, addCredentialTranslation } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import {
	BUILTIN_CREDENTIALS_DOCS_URL,
	DOCS_DOMAIN,
	EnterpriseEditionFeature,
	NEW_ASSISTANT_SESSION_MODAL,
} from '@/app/constants';
import type { PermissionsRecord } from '@n8n/permissions';
import { useCredentialsStore } from '../../credentials.store';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import Banner from '@/app/components/Banner.vue';
import CopyInput from '@/app/components/CopyInput.vue';
import CredentialInputs from './CredentialInputs.vue';
import GoogleAuthButton from './GoogleAuthButton.vue';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import type { InstanceAiCredentialHelpHandler } from '@/app/composables/useInstanceAiEditorCapability';
import { CREDENTIAL_EDIT_MODAL_KEY } from '../../credentials.constants';
import FreeAiCreditsCallout from '@/app/components/FreeAiCreditsCallout.vue';

import {
	N8nButton,
	N8nCallout,
	N8nInfoTip,
	N8nInlineAskAssistantButton,
	N8nLink,
	N8nText,
} from '@n8n/design-system';
import CredentialTypeSelector from './CredentialTypeSelector.vue';
import { useQuickConnect } from '../../quickConnect/composables/useQuickConnect';
import QuickConnectButton from '../../quickConnect/components/QuickConnectButton.vue';
import QuickConnectBanner from '../../quickConnect/components/QuickConnectBanner.vue';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

type Props = {
	mode: string;
	credentialType: ICredentialType;
	credentialProperties: INodeProperties[];
	credentialData: ICredentialDataDecryptedObject;
	credentialId?: string;
	credentialPermissions: PermissionsRecord['credential'];
	parentTypes?: string[];
	showValidationWarning?: boolean;
	authError?: string;
	testedSuccessfully?: boolean;
	isOAuthType?: boolean;
	isOAuthConnected?: boolean;
	isRetesting?: boolean;
	requiredPropertiesFilled?: boolean;
	isManaged?: boolean;
	isPrivateCredentialsEnabled?: boolean;
	isResolvable?: boolean;
	isShared?: boolean;
	connectedByMe?: boolean;
	isNewCredential?: boolean;
	managedOauthAvailable?: boolean;
	useCustomOauth?: boolean;
	isQuickConnectMode?: boolean;
	contextNode?: INode | null;
	hideAskAssistant?: boolean;
	/** Instance AI credential setup-help behavior, supplied by whoever opened the
	 *  modal (the editor capability, or the credentials list). Absent → no Instance
	 *  AI help button. */
	instanceAiCredentialHelp?: InstanceAiCredentialHelpHandler;
};

const props = withDefaults(defineProps<Props>(), {
	parentTypes: () => [],
	credentialId: '',
	authError: '',
	showValidationWarning: false,
	credentialPermissions: () => ({}) as PermissionsRecord['credential'],
	instanceAiCredentialHelp: undefined,
});
const emit = defineEmits<{
	update: [value: IUpdateInformation];
	authTypeChanged: [value: CredentialModeOption];
	scrollToTop: [];
	retest: [];
	oauth: [];
	disconnect: [];
	quickConnect: [];
	claimed: [];
	'update:isResolvable': [value: boolean];
}>();

const credentialsStore = useCredentialsStore();
const ndvStore = injectNDVStore();
const rootStore = useRootStore();
const uiStore = useUIStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const assistantStore = useAssistantStore();
const chatPanelStore = useChatPanelStore();

const i18n = useI18n();
const telemetry = useTelemetry();
const { getQuickConnectOption } = useQuickConnect();

// A shared credential can't be turned into a dynamic credential (they're mutually exclusive).
// Toggling back from dynamic to static stays allowed.
const isDynamicToggleDisabled = computed(() => Boolean(props.isShared) && !props.isResolvable);

onBeforeMount(async () => {
	uiStore.activeCredentialType = props.credentialType.name;

	if (rootStore.defaultLocale === 'en') return;

	const key = `n8n-nodes-base.credentials.${props.credentialType.name}`;

	if (i18n.exists(key)) return;

	const credTranslation = await credentialsStore.getCredentialTranslation(
		props.credentialType.name,
	);

	if (!credTranslation) return;

	addCredentialTranslation(
		{ [props.credentialType.name]: credTranslation },
		rootStore.defaultLocale,
	);
});

const serviceName = computed(() =>
	props.credentialType ? getAppNameFromCredType(props.credentialType.displayName) : '',
);
const appName = computed(
	() =>
		serviceName.value ||
		i18n.baseText('credentialEdit.credentialConfig.theServiceYouReConnectingTo'),
);
const credentialTypeName = computed(() => props.credentialType?.name);
const credentialOwnerName = computed(() =>
	credentialsStore.getCredentialOwnerNameById(`${props.credentialId}`),
);
const documentationUrl = computed(() => {
	const type = props.credentialType;
	const activeNode = ndvStore.value.activeNode;
	const isCommunityNode = activeNode ? isCommunityPackageName(activeNode.type) : false;

	const docUrl = type?.documentationUrl;

	if (!docUrl) {
		return '';
	}

	let url: URL;
	if (docUrl.startsWith('https://') || docUrl.startsWith('http://')) {
		url = new URL(docUrl);
		if (url.hostname !== DOCS_DOMAIN) return docUrl;
	} else {
		// Don't show documentation link for community nodes if the URL is not an absolute path
		if (isCommunityNode) return '';
		else url = new URL(`${BUILTIN_CREDENTIALS_DOCS_URL}${docUrl}/`);
	}

	if (url.hostname === DOCS_DOMAIN) {
		url.searchParams.set('utm_source', 'n8n_app');
		url.searchParams.set('utm_medium', 'credential_settings');
		url.searchParams.set('utm_campaign', 'create_new_credentials_modal');
	}

	return url.href;
});

const isGoogleOAuthType = computed(
	() =>
		credentialTypeName.value === 'googleOAuth2Api' || props.parentTypes.includes('googleOAuth2Api'),
);

const oAuthCallbackUrl = computed(() => {
	const oauthType =
		credentialTypeName.value === 'oAuth2Api' || props.parentTypes.includes('oAuth2Api')
			? 'oauth2'
			: 'oauth1';
	return rootStore.OAuthCallbackUrls[oauthType as keyof {}];
});

const showOAuthSuccessBanner = computed(() => {
	return (
		props.isOAuthType &&
		props.requiredPropertiesFilled &&
		props.isOAuthConnected &&
		!props.authError
	);
});

const showOAuthNotConnectedBanner = computed(() => {
	return (
		props.isOAuthType &&
		props.requiredPropertiesFilled &&
		!props.isOAuthConnected &&
		!props.authError
	);
});

const showDisconnectButton = computed(
	() => !!props.isPrivateCredentialsEnabled && !!props.isResolvable && !!props.connectedByMe,
);

const isMissingCredentials = computed(() => props.credentialType === null);

const isNewCredential = computed(() => props.mode === 'new' && !props.credentialId);

const isAskAssistantAvailable = computed(
	() =>
		!props.hideAskAssistant &&
		documentationUrl.value &&
		documentationUrl.value.includes(DOCS_DOMAIN) &&
		props.credentialProperties.length &&
		props.credentialPermissions.update &&
		!(props.isOAuthType && props.requiredPropertiesFilled) &&
		assistantStore.isAssistantEnabled,
);

const assistantAlreadyAsked = computed<boolean>(() => {
	return assistantStore.isCredTypeActive(props.credentialType);
});

const canCreate = computed(() => isNewCredential.value && !!props.credentialPermissions.create);

const canEdit = computed(() => {
	return !isNewCredential.value && !!props.credentialPermissions.update;
});

const canWrite = computed(() => {
	return canCreate.value || canEdit.value;
});

// When Instance AI is available it supersedes the legacy assistant for setup
// help. It guides any credential type, so it doesn't require an n8n-docs URL —
// otherwise the same UX gates apply (configurable properties, write access, not
// an already-connected OAuth credential).
const isInstanceAiCredentialHelpAvailable = computed(
	() =>
		!props.hideAskAssistant &&
		!!props.instanceAiCredentialHelp &&
		!!props.credentialProperties.length &&
		canWrite.value &&
		!(props.isOAuthType && props.requiredPropertiesFilled),
);

const activeNode = computed(() => ndvStore.value.activeNode);

const quickConnectOption = computed(() => {
	if (!activeNode.value) return undefined;
	return getQuickConnectOption(props.credentialType.name, activeNode.value.type);
});

const quickConnectAvailable = computed(() => !!quickConnectOption.value);

const quickConnectBannerText = computed(() => quickConnectOption.value?.text ?? '');

const isManagedOAuth = computed(
	() => props.isOAuthType && props.managedOauthAvailable && !props.useCustomOauth,
);

function onDataChange(event: IUpdateInformation): void {
	emit('update', event);
}

function onDocumentationUrlClick(): void {
	telemetry.track('User clicked credential modal docs link', {
		docs_link: documentationUrl.value,
		credential_type: credentialTypeName.value,
		source: 'modal',
		workflow_id: workflowDocumentStore.value.workflowId,
	});
}

function onAuthTypeChange(value: CredentialModeOption): void {
	emit('authTypeChanged', value);
}

// Instance AI credential setup help: run the host's behavior, then close the
// modal + NDV only if it asks us to. A new-tab hand-off (editor, credentials
// list) keeps them open so the user can finish the form; an in-thread append
// (artifact) closes them so the conversation comes into view.
async function onInstanceAiCredentialHelpClick() {
	const shouldCloseModal = await props.instanceAiCredentialHelp?.({
		credentialType: props.credentialType.name,
		displayName: props.credentialType.displayName,
		nodeName: activeNode.value?.name,
		nodeType: activeNode.value?.type,
		id: props.credentialId || undefined,
		documentationUrl: documentationUrl.value || undefined,
		oauthRedirectUrl: props.isOAuthType ? oAuthCallbackUrl.value : undefined,
	});
	if (shouldCloseModal) {
		uiStore.closeModal(CREDENTIAL_EDIT_MODAL_KEY);
		ndvStore.value.unsetActiveNodeName();
	}
}

async function onAskAssistantClick() {
	const sessionInProgress = !assistantStore.isSessionEnded;
	if (sessionInProgress) {
		uiStore.openModalWithData({
			name: NEW_ASSISTANT_SESSION_MODAL,
			data: {
				context: {
					credHelp: {
						credType: props.credentialType,
					},
				},
			},
		});
		return;
	}
	await chatPanelStore.openWithCredHelp(props.credentialType);
}

watch(showOAuthSuccessBanner, (newValue, oldValue) => {
	if (newValue && !oldValue) {
		emit('scrollToTop');
	}
});
</script>

<template>
	<N8nCallout v-if="isManaged" theme="warning" icon="triangle-alert">
		{{ i18n.baseText('freeAi.credits.credentials.edit') }}
	</N8nCallout>
	<div v-else>
		<div :class="$style.config" data-test-id="node-credentials-config-container">
			<FreeAiCreditsCallout
				:credential-type-name="credentialType?.name"
				@claimed="$emit('claimed')"
			/>

			<CredentialModeSelector
				v-if="canWrite"
				:credential-type="credentialType"
				:use-custom-oauth="useCustomOauth"
				:show-managed-oauth-options="managedOauthAvailable"
				:quick-connect-available="quickConnectAvailable"
				:is-quick-connect-mode="isQuickConnectMode"
				:context-node="contextNode"
				@update:auth-type="onAuthTypeChange"
			/>

			<template v-if="isQuickConnectMode">
				<QuickConnectBanner
					v-if="quickConnectBannerText || quickConnectOption?.disclaimer"
					:text="quickConnectBannerText"
					:disclaimer="quickConnectOption?.disclaimer"
				/>
				<QuickConnectButton
					:service-name="serviceName"
					:credential-type-name="credentialType.name"
					data-test-id="quick-connect-modal-button"
					@click="$emit('quickConnect')"
				/>
			</template>

			<template v-else>
				<N8nCallout
					v-if="
						!isInstanceAiCredentialHelpAvailable &&
						documentationUrl &&
						credentialProperties.length &&
						!isManagedOAuth &&
						canWrite
					"
					:class="$style.docsCallout"
					theme="custom"
					iconless
				>
					{{ i18n.baseText('credentialEdit.credentialConfig.needHelpFillingOutTheseFields') }}
					<template #actions>
						<N8nLink :to="documentationUrl" size="small" @click="onDocumentationUrlClick">
							{{ i18n.baseText('credentialEdit.credentialConfig.openDocs') }}
						</N8nLink>
					</template>
				</N8nCallout>

				<Banner
					v-show="showValidationWarning"
					theme="danger"
					:message="
						i18n.baseText(
							`credentialEdit.credentialConfig.pleaseCheckTheErrorsBelow${
								credentialPermissions.update ? '' : '.sharee'
							}`,
							{ interpolate: { owner: credentialOwnerName } },
						)
					"
				/>

				<Banner
					v-if="authError && !showValidationWarning"
					theme="danger"
					:message="
						i18n.baseText(
							`credentialEdit.credentialConfig.couldntConnectWithTheseSettings${
								credentialPermissions.update ? '' : '.sharee'
							}`,
							{ interpolate: { owner: credentialOwnerName } },
						)
					"
					:details="authError"
					:button-label="i18n.baseText('credentialEdit.credentialConfig.retry')"
					button-loading-label="Retrying"
					:button-title="i18n.baseText('credentialEdit.credentialConfig.retryCredentialTest')"
					:button-loading="isRetesting"
					@click="$emit('retest')"
				/>

				<Banner
					v-show="showOAuthSuccessBanner && !showValidationWarning"
					theme="success"
					:message="i18n.baseText('credentialEdit.credentialConfig.accountConnected')"
					:button-label="i18n.baseText('credentialEdit.credentialConfig.reconnect')"
					:button-title="i18n.baseText('credentialEdit.credentialConfig.reconnectOAuth2Credential')"
					data-test-id="oauth-connect-success-banner"
					@click="$emit('oauth')"
				>
					<template #button>
						<div :class="$style.bannerActions">
							<GoogleAuthButton v-if="isGoogleOAuthType" @click="$emit('oauth')" />
							<QuickConnectButton
								v-else
								size="small"
								:service-name="serviceName"
								:credential-type-name="credentialType.name"
								:label="i18n.baseText('credentialEdit.credentialConfig.reconnect')"
								data-test-id="quick-connect-reconnect-button"
								@click="$emit('oauth')"
							/>
							<N8nButton
								v-if="showDisconnectButton"
								variant="outline"
								:size="isGoogleOAuthType ? 'xlarge' : 'small'"
								:label="i18n.baseText('credentialEdit.credentialConfig.disconnect')"
								data-test-id="oauth-disconnect-button"
								@click="$emit('disconnect')"
							/>
						</div>
					</template>
				</Banner>

				<Banner
					v-show="testedSuccessfully && !showValidationWarning"
					theme="success"
					:message="i18n.baseText('credentialEdit.credentialConfig.connectionTestedSuccessfully')"
					:button-label="i18n.baseText('credentialEdit.credentialConfig.retry')"
					:button-loading-label="i18n.baseText('credentialEdit.credentialConfig.retrying')"
					:button-title="i18n.baseText('credentialEdit.credentialConfig.retryCredentialTest')"
					:button-loading="isRetesting"
					data-test-id="credentials-config-container-test-success"
					@click="$emit('retest')"
				/>

				<CredentialTypeSelector
					v-if="
						isPrivateCredentialsEnabled &&
						// Only OAuth credentials can be dynamic for now, as they are the only ones with the managed authorize endpoint
						isOAuthType &&
						canWrite
					"
					:model-value="Boolean(isResolvable)"
					:end-user-disabled="isDynamicToggleDisabled"
					:end-user-disabled-tooltip="
						i18n.baseText(
							'credentialEdit.credentialConfig.dynamicCredentials.sharedDisabledTooltip',
						)
					"
					:info-tip="i18n.baseText('credentialEdit.credentialConfig.dynamicCredentials.infoTip')"
					@update:model-value="(val) => $emit('update:isResolvable', val)"
				/>

				<Banner
					v-show="showOAuthNotConnectedBanner && !showValidationWarning"
					theme="warning"
					:message="i18n.baseText('credentialEdit.credentialConfig.accountNotConnected')"
					:button-label="i18n.baseText('credentialEdit.credentialConfig.connect')"
					:button-title="i18n.baseText('credentialEdit.credentialConfig.connectOAuth2Credential')"
					data-test-id="oauth-not-connected-banner"
					@click="$emit('oauth')"
				>
					<template v-if="isGoogleOAuthType" #button>
						<div data-test-id="quick-connect-button">
							<GoogleAuthButton @click="$emit('oauth')" />
						</div>
					</template>
					<template v-else #button>
						<QuickConnectButton
							size="small"
							:service-name="serviceName"
							:credential-type-name="credentialType.name"
							:label="i18n.baseText('credentialEdit.credentialConfig.connect')"
							data-test-id="quick-connect-button"
							@click="$emit('oauth')"
						/>
					</template>
				</Banner>

				<template v-if="canWrite">
					<!-- Instance AI credential setup help (mimics the assistant button) -->
					<div
						v-if="isInstanceAiCredentialHelpAvailable"
						:class="$style.askAssistantButton"
						data-test-id="credential-edit-instance-ai-help-button"
					>
						<N8nInlineAskAssistantButton
							:label="i18n.baseText('instanceAi.askAiAssistant')"
							@click="onInstanceAiCredentialHelpClick"
						/>
						<span>
							{{
								i18n.baseText('credentialEdit.credentialConfig.assistantHelp.forSetupInstructions')
							}}
							<template
								v-if="
									documentationUrl && credentialProperties.length && !isManagedOAuth && canWrite
								"
							>
								{{ i18n.baseText('credentialEdit.credentialConfig.assistantHelp.orReadThe') }}
								<N8nLink :to="documentationUrl" size="small" @click="onDocumentationUrlClick">
									[{{ i18n.baseText('credentialEdit.credentialConfig.assistantHelp.docs') }}]
								</N8nLink>
							</template>
						</span>
					</div>
					<!-- Legacy assistant credential help — only while Instance AI is off -->
					<div
						v-else-if="isAskAssistantAvailable"
						:class="$style.askAssistantButton"
						data-test-id="credential-edit-ask-assistant-button"
					>
						<N8nInlineAskAssistantButton
							:asked="assistantAlreadyAsked"
							@click="onAskAssistantClick"
						/>
						<span>
							{{
								i18n.baseText('credentialEdit.credentialConfig.assistantHelp.forSetupInstructions')
							}}
						</span>
					</div>

					<CopyInput
						v-if="isOAuthType && !isManagedOAuth"
						:label="i18n.baseText('credentialEdit.credentialConfig.oAuthRedirectUrl')"
						:value="oAuthCallbackUrl"
						:copy-button-text="i18n.baseText('credentialEdit.credentialConfig.clickToCopy')"
						:hint="
							i18n.baseText('credentialEdit.credentialConfig.subtitle', {
								interpolate: { appName },
							})
						"
						:toast-title="
							i18n.baseText('credentialEdit.credentialConfig.redirectUrlCopiedToClipboard')
						"
						:redact-value="true"
					/>
				</template>
				<EnterpriseEdition v-else :features="[EnterpriseEditionFeature.Sharing]">
					<div>
						<N8nInfoTip :bold="false">
							{{
								i18n.baseText('credentialEdit.credentialEdit.info.sharee', {
									interpolate: { credentialOwnerName },
								})
							}}
						</N8nInfoTip>
					</div>
				</EnterpriseEdition>

				<CredentialInputs
					v-if="credentialType && canWrite"
					:credential-data="credentialData"
					:credential-properties="credentialProperties"
					:documentation-url="documentationUrl"
					:show-validation-warnings="showValidationWarning"
					@update="onDataChange"
				/>

				<N8nText v-if="isMissingCredentials" color="text-base" size="medium">
					{{ i18n.baseText('credentialEdit.credentialConfig.missingCredentialType') }}
				</N8nText>

				<EnterpriseEdition :features="[EnterpriseEditionFeature.ExternalSecrets]">
					<template #fallback>
						<N8nInfoTip class="mt-s">
							{{ i18n.baseText('credentialEdit.credentialConfig.externalSecrets') }}
							<N8nLink bold :to="i18n.baseText('settings.externalSecrets.docs')" size="small">
								{{ i18n.baseText('credentialEdit.credentialConfig.externalSecrets.moreInfo') }}
							</N8nLink>
						</N8nInfoTip>
					</template>
				</EnterpriseEdition>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.config {
	--notice--margin: 0;
	flex-grow: 1;

	> * + * {
		margin-bottom: var(--spacing--lg);
	}
}

.bannerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.askAssistantButton {
	display: flex;
	align-items: center;

	> span {
		margin-left: var(--spacing--3xs);
		font-size: var(--font-size--sm);
	}
}

.docsCallout {
	background-color: light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100));
	border-color: light-dark(var(--color--black-alpha-200), var(--color--white-alpha-300));

	a {
		text-decoration: none;
	}
}
</style>
