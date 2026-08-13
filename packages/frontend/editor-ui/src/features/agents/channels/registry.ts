import { readonly, ref } from 'vue';

import AgentChannelDiscordSetup from '../components/AgentChannelDiscordSetup.vue';
import AgentChannelDiscordEditView from './discord/AgentChannelDiscordEditView.vue';
import AgentChannelFallbackView from './fallback/AgentChannelFallbackView.vue';
import AgentChannelLinearEditView from './linear/AgentChannelLinearEditView.vue';
import AgentChannelLinearSetup from './linear/AgentChannelLinearSetup.vue';
import AgentChannelSlackEditView from './slack/AgentChannelSlackEditView.vue';
import AgentChannelSlackSetupView from './slack/AgentChannelSlackSetupView.vue';
import { useSlackChannelRuntime } from './slack/useSlackChannelRuntime';
import AgentChannelTelegramEditView from './telegram/AgentChannelTelegramEditView.vue';
import AgentChannelTelegramSetup from './telegram/AgentChannelTelegramSetup.vue';
import type {
	AgentChannelRuntime,
	AgentChannelRuntimeContext,
	ChannelPlatformDefinition,
} from './types';

function createDefaultRuntime(): AgentChannelRuntime {
	const loading = ref(false);
	return { load: async () => {}, loading: readonly(loading) };
}

const fallbackPlatform: ChannelPlatformDefinition = {
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
		createRuntime: useSlackChannelRuntime,
		getConnectAction: ({ text }) => ({ label: text('generic.connect') }),
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
} satisfies Record<string, ChannelPlatformDefinition>;

export function isRegisteredAgentChannelPlatform(type: string): type is keyof typeof platforms {
	return Object.hasOwn(platforms, type);
}

export function getAgentChannelPlatform(type: string): ChannelPlatformDefinition {
	return isRegisteredAgentChannelPlatform(type) ? platforms[type] : fallbackPlatform;
}

export function createAgentChannelRuntime(
	platform: ChannelPlatformDefinition,
	context: AgentChannelRuntimeContext,
): AgentChannelRuntime {
	return platform.createRuntime?.(context) ?? createDefaultRuntime();
}

export const agentChannelPlatforms = Object.freeze(platforms);
