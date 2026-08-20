import type { AgentIntegrationDisconnectWarning } from '@n8n/api-types';
import { h, readonly, ref } from 'vue';

import AgentChannelDiscordSetup from '../components/AgentChannelDiscordSetup.vue';
import AgentChannelDiscordEditView from './discord/AgentChannelDiscordEditView.vue';
import AgentChannelFallbackView from './fallback/AgentChannelFallbackView.vue';
import AgentChannelLinearEditView from './linear/AgentChannelLinearEditView.vue';
import AgentChannelLinearSetup from './linear/AgentChannelLinearSetup.vue';
import AgentChannelSlackEditView from './slack/AgentChannelSlackEditView.vue';
import AgentChannelSlackRemoveConfirmation from './slack/AgentChannelSlackRemoveConfirmation.vue';
import AgentChannelSlackSetupKindSelector from './slack/AgentChannelSlackSetupKindSelector.vue';
import AgentChannelSlackSetupView from './slack/AgentChannelSlackSetupView.vue';
import { isSlackChannelRuntime, useSlackChannelRuntime } from './slack/useSlackChannelRuntime';
import AgentChannelTelegramEditView from './telegram/AgentChannelTelegramEditView.vue';
import AgentChannelTelegramSetup from './telegram/AgentChannelTelegramSetup.vue';
import type {
	AgentChannelPlatform,
	AgentChannelRuntime,
	AgentChannelRuntimeContext,
} from './types';

function createDefaultRuntime(): AgentChannelRuntime {
	const loading = ref(false);
	return { load: async () => {}, loading: readonly(loading) };
}

const isSlackNotDeletedWarning = (
	warning: AgentIntegrationDisconnectWarning,
): warning is AgentIntegrationDisconnectWarning & { action: { url: string } } => {
	return (
		warning.integrationType === 'slack' &&
		warning.code === 'app_not_deleted' &&
		warning.action?.type === 'open_url' &&
		!!warning.action?.url
	);
};

const fallbackPlatform: AgentChannelPlatform = {
	type: 'unknown',
	setupComponent: AgentChannelFallbackView,
	editComponent: AgentChannelFallbackView,
	getConnectAction: ({ text }) => ({ label: text('generic.connect') }),
};

const platforms = {
	slack: {
		type: 'slack',
		setupComponent: AgentChannelSlackSetupView,
		editComponent: AgentChannelSlackEditView,
		headerContent: {
			setupModal: AgentChannelSlackSetupKindSelector,
		},
		disconnectConfirmationComponent: AgentChannelSlackRemoveConfirmation,
		createRuntime: useSlackChannelRuntime,
		shouldConfirmDisconnect: (runtime, credentialId, { isPublished }) =>
			isPublished && isSlackChannelRuntime(runtime) && runtime.isManagedCredential(credentialId),
		getConnectAction: ({ text }, runtime) => {
			const managedSetupAvailable =
				isSlackChannelRuntime(runtime) && runtime.setup.value.managedSetupAvailable;
			return {
				label: text(
					managedSetupAvailable ? 'agents.channels.slack.managed.addToSlack' : 'generic.connect',
				),
				icon: managedSetupAvailable ? 'slack' : undefined,
			};
		},
		presentDisconnectWarning: (warning, { text }) => {
			if (!isSlackNotDeletedWarning(warning)) {
				return null;
			}
			return {
				title: text('agents.channels.modal.slackAppNotDeleted.title'),
				message: h('span', [
					text('agents.channels.modal.slackAppNotDeleted.message'),
					' ',
					h(
						'a',
						{
							href: warning.action.url,
							target: '_blank',
							rel: 'noopener noreferrer',
						},
						text('agents.channels.modal.slackAppNotDeleted.link'),
					),
				]),
			};
		},
	},
	linear: {
		type: 'linear',
		setupComponent: AgentChannelLinearSetup,
		editComponent: AgentChannelLinearEditView,
		getConnectAction: ({ text }) => ({ label: text('generic.connect') }),
		getConnectedDescription: ({ text }) => text('agents.builder.addTrigger.connectedText.linear'),
	},
	telegram: {
		type: 'telegram',
		setupComponent: AgentChannelTelegramSetup,
		editComponent: AgentChannelTelegramEditView,
		getConnectAction: ({ text }) => ({ label: text('generic.connect') }),
		getConnectedDescription: ({ text }) => text('agents.builder.addTrigger.connectedText.telegram'),
	},
	discord: {
		type: 'discord',
		setupComponent: AgentChannelDiscordSetup,
		editComponent: AgentChannelDiscordEditView,
		getConnectAction: ({ text }) => ({ label: text('generic.connect') }),
	},
} satisfies Record<string, AgentChannelPlatform>;

export function isRegisteredAgentChannelPlatform(type: string): type is keyof typeof platforms {
	return Object.hasOwn(platforms, type);
}

export function getAgentChannelPlatform(type: string): AgentChannelPlatform {
	return isRegisteredAgentChannelPlatform(type) ? platforms[type] : fallbackPlatform;
}

export function createAgentChannelRuntime(
	platform: AgentChannelPlatform,
	context: AgentChannelRuntimeContext,
): AgentChannelRuntime {
	return platform.createRuntime?.(context) ?? createDefaultRuntime();
}

export const agentChannelPlatforms = Object.freeze(platforms);
