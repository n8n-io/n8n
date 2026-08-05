import { h, readonly, ref } from 'vue';
import type { AgentIntegrationDisconnectWarning } from '@n8n/api-types';

import AgentChannelFallbackView from './fallback/AgentChannelFallbackView.vue';
import AgentChannelLinearEditView from './linear/AgentChannelLinearEditView.vue';
import AgentChannelLinearSetup from './linear/AgentChannelLinearSetup.vue';
import AgentChannelSlackEditView from './slack/AgentChannelSlackEditView.vue';
import AgentChannelSlackSetupView from './slack/AgentChannelSlackSetupView.vue';
import { useSlackChannelRuntime, type SlackChannelRuntime } from './slack/useSlackChannelRuntime';
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

function isSlackRuntime(runtime: AgentChannelRuntime): runtime is SlackChannelRuntime {
	return 'setup' in runtime;
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

const platforms: Record<string, AgentChannelPlatform> = {
	slack: {
		type: 'slack',
		setupComponent: AgentChannelSlackSetupView,
		editComponent: AgentChannelSlackEditView,
		createRuntime: useSlackChannelRuntime,
		getConnectAction: ({ text }, runtime) => {
			const managedSetupAvailable =
				isSlackRuntime(runtime) && runtime.setup.value.managedSetupAvailable;
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
};

export function getAgentChannelPlatform(type: string): AgentChannelPlatform {
	return platforms[type] ?? fallbackPlatform;
}

export function createAgentChannelRuntime(
	platform: AgentChannelPlatform,
	context: AgentChannelRuntimeContext,
): AgentChannelRuntime {
	return platform.createRuntime?.(context) ?? createDefaultRuntime();
}

export const agentChannelPlatforms = Object.freeze(platforms);
