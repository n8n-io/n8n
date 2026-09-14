import type { ComputerUseChannel } from '@n8n/api-types';
import type { ComputerUseChannelState, ComputerUseState } from '@n8n/instance-ai';

const BROWSER_TOOL_CATEGORY = 'browser';

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
	if (!reportedByClient || localGatewayDisabledGlobally) return { status: 'unavailable' };
	if (localGatewayDisabledForUser) return { status: 'disabledByUser' };
	if (localComputerToolCategories) {
		return { status: 'connected', toolCategories: localComputerToolCategories };
	}
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
	if (!reportedByClient || !browserUseEnabledGlobally) return { status: 'unavailable' };
	if (browserConnected) {
		return { status: 'connected', toolCategories: [BROWSER_TOOL_CATEGORY] };
	}
	return { status: 'disconnected' };
}

/**
 * `clientChannels` are the + menu entries the client says it renders. Only the
 * client can see its own rollout and the device, so it is the authority on what
 * exists — but it is client input, so it may only narrow: every channel is still
 * checked against the admin switches here. An absent list advertises nothing.
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
