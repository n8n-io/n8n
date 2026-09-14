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
	localGatewayDisabledGlobally,
	localGatewayDisabledForUser,
	computerUseExperimentEnabled,
	localComputerToolCategories,
}: {
	localGatewayDisabledGlobally: boolean;
	localGatewayDisabledForUser: boolean;
	computerUseExperimentEnabled: boolean;
	localComputerToolCategories: string[] | undefined;
}): ComputerUseChannelState {
	if (!computerUseExperimentEnabled || localGatewayDisabledGlobally) {
		return { status: 'unavailable' };
	}
	if (localGatewayDisabledForUser) return { status: 'disabledByUser' };
	if (localComputerToolCategories) {
		return { status: 'connected', toolCategories: localComputerToolCategories };
	}
	return { status: 'disconnected' };
}

function resolveBrowser({
	browserUseEnabledGlobally,
	browserUseExperimentEnabled,
	browserConnected,
}: {
	browserUseEnabledGlobally: boolean;
	browserUseExperimentEnabled: boolean;
	browserConnected: boolean;
}): ComputerUseChannelState {
	if (!browserUseExperimentEnabled || !browserUseEnabledGlobally) {
		return { status: 'unavailable' };
	}
	if (browserConnected) {
		return { status: 'connected', toolCategories: [BROWSER_TOOL_CATEGORY] };
	}
	return { status: 'disconnected' };
}

export function resolveComputerUseState(input: {
	localGatewayDisabledGlobally: boolean;
	localGatewayDisabledForUser: boolean;
	browserUseEnabledGlobally: boolean;
	computerUseExperimentEnabled: boolean;
	browserUseExperimentEnabled: boolean;
	localComputerToolCategories: string[] | undefined;
	browserConnected: boolean;
}): ComputerUseState {
	return {
		localComputer: resolveLocalComputer(input),
		browser: resolveBrowser(input),
	};
}
