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
	description?: string;
	/** Replaces the modal's Save label when saving does more than save. */
	saveLabel?: string;
	/** Runs after a successful save, before the modal closes. Must not throw. */
	afterSave?: () => Promise<void>;
	/** Keeps the modal open after connecting. The view emits `done` to close it. */
	keepOpenAfterConnect?: boolean;
	/**
	 * Whether a setup that outlives the connect can be left now. The modal puts
	 * the Done button in its own footer, where it is reachable without scrolling
	 * to the end of a flow whose last step often waits on someone else.
	 */
	canFinish?: boolean;
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

export interface AgentChannelRestart {
	/** The channel credential for the new setup, or '' to start without one. */
	credentialId: string;
	/**
	 * The sign-in for the new setup, for a platform whose setup signs in first
	 * (for Teams, the Microsoft account that creates the app and the bot). It is
	 * set when the user restarts by changing the sign-in. The runtime applies it
	 * only after the channel is removed, so a cancelled restart keeps the old
	 * sign-in. `credentialId` is the bot's own credential.
	 */
	signInCredentialId?: string;
}

export interface AgentChannelRuntime {
	load: () => Promise<void>;
	loading: Readonly<Ref<boolean>>;
	/** Forgets what an earlier setup left here, so the next one starts from the first step. */
	reset?: (restart: AgentChannelRestart) => void;
}

export interface AgentChannelViewProps {
	mode: AgentChannelMode;
	integration: ChatIntegrationDescriptor;
	modelValue: string;
	/** The credential the saved channel runs on, or '' while there is none. */
	savedCredentialId?: string;
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
	isPublished: boolean;
	agentName: string;
	projectId: string;
	agentId: string;
	ensureAgentPersisted?: () => Promise<void>;
	/**
	 * Saves the channel without closing the modal, and reports whether it
	 * landed. For a view whose own buttons act on what n8n has saved: they wait
	 * for this rather than for the footer, which closes the dialog under them.
	 */
	persistChannel?: () => Promise<boolean>;
	forceNewCredential: boolean;
	simpleSetup: boolean;
	runtime: AgentChannelRuntime;
}

export interface AgentChannelPresentationContext {
	text: (key: BaseTextKey, interpolate?: Record<string, string>) => string;
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
	createRuntime?: (context: AgentChannelRuntimeContext) => AgentChannelRuntime;
	getConnectAction: (
		context: AgentChannelPresentationContext,
		runtime: AgentChannelRuntime,
	) => AgentChannelConnectAction;
	getConnectedDescription?: (context: AgentChannelPresentationContext) => string;
	headerContent?: {
		setupModal?: Component;
		/** The Assistant's setup card. Separate from the modal, so each platform opts in. */
		setupCard?: Component;
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
