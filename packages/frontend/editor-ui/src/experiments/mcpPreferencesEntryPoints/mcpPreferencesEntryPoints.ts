import type { McpPreferencesEntryPoints } from '@n8n/frontend-module-sdk';

import { useMcpPreferencesEntryPointsStore } from './stores/mcpPreferencesEntryPoints.store';

export const mcpPreferencesEntryPoints = {
	entryPoint: () => useMcpPreferencesEntryPointsStore().entryPoint,
	trackExposure: () => useMcpPreferencesEntryPointsStore().trackExposure(),
	fetchPreferenceCount: async () => {
		const { useContextStore } = await import('@/features/settings/context/context.store');
		return await useContextStore().fetchPreferenceCount();
	},
	isBannerDismissed: () => useMcpPreferencesEntryPointsStore().isBannerDismissed,
	dismissBanner: () => useMcpPreferencesEntryPointsStore().dismissBanner(),
	trackEntryPointClicked: (source) =>
		useMcpPreferencesEntryPointsStore().trackEntryPointClicked(source),
	trackPromptCopied: (client) => useMcpPreferencesEntryPointsStore().trackPromptCopied(client),
} satisfies McpPreferencesEntryPoints;
