import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useIntervalFn } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { computed, watch } from 'vue';
import { useRouter } from 'vue-router';

import { MCP_SETTINGS_VIEW } from '@n8n/frontend-module-mcp';

import { useMcpDiscoveryStore, type McpDiscoveryPlacement } from './mcpDiscovery.store';

export function useMcpDiscovery() {
	const mcpDiscovery = useMcpDiscoveryStore();
	const i18n = useI18n();
	const showMcpDiscovery = computed(() => mcpDiscovery.shouldShowEntryPoints);
	const showMcpSettingsTreatment = computed(() => mcpDiscovery.isTreatment);
	const router = useRouter();
	const entryLabel = computed(() =>
		i18n.baseText(
			mcpDiscovery.ctaStage === 'connect'
				? 'experiments.mcpDiscovery.cta.connect'
				: 'experiments.mcpDiscovery.cta.build',
		),
	);
	const entryDescription = computed(() =>
		mcpDiscovery.ctaStage === 'build'
			? i18n.baseText('experiments.mcpDiscovery.cta.connectToN8n')
			: undefined,
	);

	function openEntry(placement: McpDiscoveryPlacement) {
		mcpDiscovery.trackEntry(placement, 'clicked');
		if (mcpDiscovery.ctaStage === 'build_in_claude') {
			window.open('https://claude.ai/new', '_blank', 'noopener,noreferrer');
		} else {
			void router.push({ name: MCP_SETTINGS_VIEW });
		}
	}

	return {
		mcpDiscovery,
		showMcpDiscovery,
		showMcpSettingsTreatment,
		entryLabel,
		entryDescription,
		openEntry,
	};
}

/** Install once in App.vue. Individual placements only consume the shared store. */
export function useMcpDiscoveryEnrollment() {
	const users = useUsersStore();
	const cloudPlan = useCloudPlanStore();
	const settings = useSettingsStore();
	const discovery = useMcpDiscoveryStore();
	const shouldPoll = () =>
		discovery.state.status === 'waiting' ||
		discovery.state.status === 'unknown' ||
		discovery.shouldShowEntryPoints;
	const { pause, resume } = useIntervalFn(
		async () => {
			await discovery.refresh();
			if (!shouldPoll()) pause();
		},
		60_000,
		{ immediate: false },
	);
	watch(
		[
			() => users.currentUser?.id,
			() => settings.isCloudDeployment,
			() => users.isInstanceOwner,
			() => cloudPlan.hasCloudPlan,
		] as const,
		([userId, isCloud, isOwner, cloudReady]) => {
			pause();
			discovery.reset();
			if (userId && isCloud && isOwner && cloudReady) {
				void discovery.refresh().then(() => {
					if (users.currentUser?.id !== userId) return;
					if (shouldPoll()) resume();
				});
			}
		},
		{ immediate: true },
	);
}
