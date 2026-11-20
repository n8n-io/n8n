import type { McpPreferencesEntryPoints } from '@n8n/frontend-module-sdk';

import { VIEWS } from '@/app/constants';

import { useMcpPreferencesEntryPointsStore } from './stores/mcpPreferencesEntryPoints.store';

export const mcpPreferencesEntryPoints = {
	entryPoint: () => useMcpPreferencesEntryPointsStore().entryPoint,
	trackExposure: () => useMcpPreferencesEntryPointsStore().trackExposure(),
	preferenceCount: () => useMcpPreferencesEntryPointsStore().preferenceCount,
	loadPreferenceCount: async () => await useMcpPreferencesEntryPointsStore().loadPreferenceCount(),
	isBannerDismissed: () => useMcpPreferencesEntryPointsStore().isBannerDismissed,
	dismissBanner: () => useMcpPreferencesEntryPointsStore().dismissBanner(),
	preferencesRoute: { name: VIEWS.SETTINGS_CONTEXT_PREFERENCES },
	trackEntryPointClicked: (source) =>
		useMcpPreferencesEntryPointsStore().trackEntryPointClicked(source),
	trackPromptCopied: (client) => useMcpPreferencesEntryPointsStore().trackPromptCopied(client),
} satisfies McpPreferencesEntryPoints;
