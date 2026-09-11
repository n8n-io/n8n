import type {
	AgentIntegrationDisconnectWarning,
	AgentIntegrationSettings,
	ChatIntegrationDescriptor,
} from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';
import type { PermissionsRecord } from '@n8n/permissions';
import type { Component, Ref, VNode } from 'vue';

import type { AgentCredentialOption } from '../components/AgentCredentialSelect.vue';

export type AgentChannelMode = 'setup' | 'edit';
export type AgentChannelView = 'list' | `${string}_${AgentChannelMode}`;

export interface AgentChannelConnectAction {
	label: string;
	icon?: IconName;
}

export interface AgentChannelViewExpose {
	currentSettings?: AgentIntegrationSettings;
	validationError?: string | null;
	loading?: boolean;
	beforeSave?: () => Promise<void>;
}

export interface AgentChannelRuntimeContext {
	projectId: Ref<string>;
	agentId: Ref<string>;
	selectedCredentialId: Ref<string>;
	credentialModalOpen: Readonly<Ref<boolean>>;
	fetchStatus: (integrationTypes: string[]) => Promise<void>;
	isConnected: (integrationType: string) => boolean;
	isConfigured: (integrationType: string) => boolean;
	ensureAgentPersisted?: () => Promise<void>;
}

export interface AgentChannelRuntime {
	load: () => Promise<void>;
	loading: Readonly<Ref<boolean>>;
}

export interface AgentChannelViewProps {
	mode: AgentChannelMode;
	integration: ChatIntegrationDescriptor;
	modelValue: string;
	credentials: AgentCredentialOption[];
	credentialPermissions: PermissionsRecord['credential'];
	credentialsLoading: boolean;
	loading: boolean;
	disabled?: boolean;
	connected: boolean;
	connectedDescription: string;
	errorMessage: string;
	errorIsConflict: boolean;
	savedSettings?: AgentIntegrationSettings;
	/** Set only for a credentialless channel, once the server has minted its id. */
	savedIntegrationId?: string;
	isPublished: boolean;
	agentName: string;
	projectId: string;
	agentId: string;
	forceNewCredential: boolean;
	simpleSetup: boolean;
	runtime: AgentChannelRuntime;
}

export interface AgentChannelPresentationContext {
	text: (key: BaseTextKey) => string;
}

export interface AgentChannelWarningPresentation {
	title: string;
	message: string | VNode;
}

export interface AgentChannelDisconnectContext {
	isPublished: boolean;
}

export interface AgentChannelHeaderContentProps {
	runtime: AgentChannelRuntime;
	disabled?: boolean;
}

export interface AgentChannelPlatform {
	type: string;
	setupComponent: Component;
	editComponent: Component;
	/**
	 * False for a channel served from inbound requests, which has nothing to
	 * connect to and so nothing to hold a credential for. Defaults to true.
	 */
	requiresCredential?: boolean;
	createRuntime?: (context: AgentChannelRuntimeContext) => AgentChannelRuntime;
	getConnectAction: (
		context: AgentChannelPresentationContext,
		runtime: AgentChannelRuntime,
	) => AgentChannelConnectAction;
	getConnectedDescription?: (context: AgentChannelPresentationContext) => string;
	headerContent?: {
		setupModal?: Component;
		editModal?: Component;
	};
	disconnectConfirmationComponent?: Component;
	shouldConfirmDisconnect?: (
		runtime: AgentChannelRuntime,
		credentialId: string,
		context: AgentChannelDisconnectContext,
	) => boolean;
	presentDisconnectWarning?: (
		warning: AgentIntegrationDisconnectWarning,
		context: AgentChannelPresentationContext,
	) => AgentChannelWarningPresentation | null;
}
