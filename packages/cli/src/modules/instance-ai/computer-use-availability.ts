import type { LocalGatewayChannel } from '@n8n/instance-ai';

export function resolveConnectableComputerUseChannels({
	localGatewayDisabledGlobally,
	browserUseEnabledGlobally,
	computerUseExperimentEnabled,
	browserUseExperimentEnabled,
}: {
	localGatewayDisabledGlobally: boolean;
	browserUseEnabledGlobally: boolean;
	computerUseExperimentEnabled: boolean;
	browserUseExperimentEnabled: boolean;
}): LocalGatewayChannel[] {
	const channels: LocalGatewayChannel[] = [];

	if (computerUseExperimentEnabled && !localGatewayDisabledGlobally) {
		channels.push('localComputer');
	}
	if (browserUseExperimentEnabled && browserUseEnabledGlobally) {
		channels.push('browser');
	}

	return channels;
}
