import type { ComputerUseChannel } from '@n8n/api-types';
import type { ComputerUseChannelState, ComputerUseState } from '@n8n/instance-ai';

import { BROWSER_TOOL_CATEGORY } from './instance-ai-gateway.service';

/** The categories a connected channel serves. `getStatus()` already drops the
 *  ones instance policy excludes. */
export function enabledToolCategories(
	declared: Array<{ name: string; enabled: boolean }>,
): string[] {
	return declared.filter(({ enabled }) => enabled).map(({ name }) => name);
}

function resolveLocalComputer({
	reportedByClient,
	localGatewayDisabledGlobally,
	localGatewayDisabledForUser,
	localComputerToolCategories,
}: {
	reportedByClient: boolean;
	localGatewayDisabledGlobally: boolean;
	localGatewayDisabledForUser: boolean;
	localComputerToolCategories: string[] | undefined;
}): ComputerUseChannelState {
	// Live tools first: the agent holds them whatever the client renders, so the
	// prompt has to carry their operational rules.
	if (localComputerToolCategories) {
		return { status: 'connected', toolCategories: localComputerToolCategories };
	}
	if (localGatewayDisabledGlobally || !reportedByClient) return { status: 'unavailable' };
	if (localGatewayDisabledForUser) return { status: 'disabledByUser' };
	return { status: 'disconnected' };
}

function resolveBrowser({
	reportedByClient,
	browserUseEnabledGlobally,
	browserConnected,
}: {
	reportedByClient: boolean;
	browserUseEnabledGlobally: boolean;
	browserConnected: boolean;
}): ComputerUseChannelState {
	if (browserConnected) {
		return { status: 'connected', toolCategories: [BROWSER_TOOL_CATEGORY] };
	}
	if (!browserUseEnabledGlobally || !reportedByClient) return { status: 'unavailable' };
	return { status: 'disconnected' };
}

/**
 * `clientChannels` are the + menu entries the client says it renders. Only the
 * client can see its own rollout and the device, so it decides which entries the
 * prompt may offer — but it is client input, so it may only narrow: every channel
 * is still checked against the admin switches here.
 *
 * It does not decide whether a channel is *connected*. Tool registration follows
 * the MCP servers, so a live channel the client cannot render still has callable
 * tools, and the prompt must describe them. The report governs the connect-me
 * prose, nothing more.
 */
export function resolveComputerUseState({
	clientChannels,
	localGatewayDisabledGlobally,
	localGatewayDisabledForUser,
	browserUseEnabledGlobally,
	localComputerToolCategories,
	browserConnected,
}: {
	clientChannels: readonly ComputerUseChannel[] | undefined;
	localGatewayDisabledGlobally: boolean;
	localGatewayDisabledForUser: boolean;
	browserUseEnabledGlobally: boolean;
	localComputerToolCategories: string[] | undefined;
	browserConnected: boolean;
}): ComputerUseState {
	return {
		localComputer: resolveLocalComputer({
			reportedByClient: clientChannels?.includes('localComputer') ?? false,
			localGatewayDisabledGlobally,
			localGatewayDisabledForUser,
			localComputerToolCategories,
		}),
		browser: resolveBrowser({
			reportedByClient: clientChannels?.includes('browser') ?? false,
			browserUseEnabledGlobally,
			browserConnected,
		}),
	};
}
