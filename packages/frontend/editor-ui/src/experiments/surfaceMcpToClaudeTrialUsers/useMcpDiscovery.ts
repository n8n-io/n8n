import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useStorage } from '@n8n/composables/useStorage';
import { useUIStore } from '@/app/stores/ui.store';
import { useIntervalFn } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { TIME } from '@/app/constants/durations';

import { MCP_SETTINGS_VIEW } from '@n8n/frontend-module-mcp';

import { useMcpDiscoveryStore, type McpDiscoveryPlacement } from './mcpDiscovery.store';

export function useMcpDiscovery() {
	const mcpDiscovery = useMcpDiscoveryStore();
	const i18n = useI18n();
	const showMcpDiscovery = computed(() => mcpDiscovery.shouldShowEntryPoints);
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
	const ui = useUIStore();
	const sidebarExpanded = useStorage('N8N_MCP_DISCOVERY_SIDEBAR_EXPANDED');
	let enrollmentGeneration = 0;
	const unknownChecks = ref(0);
	// Retry brief failures promptly, then reduce requests while data remains unavailable.
	const pollInterval = computed(
		() => TIME.MINUTE * Math.min(2 ** Math.max(0, unknownChecks.value - 2), 5),
	);
	async function refresh() {
		const requestGeneration = enrollmentGeneration;
		await discovery.refresh();
		if (requestGeneration !== enrollmentGeneration) return;
		unknownChecks.value =
			discovery.state.status === 'unknown' ? Math.min(unknownChecks.value + 1, 5) : 0;
	}
	// Both arms get the same starting layout. Keep later manual collapses.
	watch(
		() => discovery.isEnabled,
		(enabled) => {
			if (!enabled || sidebarExpanded.value) return;
			sidebarExpanded.value = 'true';
			ui.sidebarMenuCollapsed = false;
		},
	);
	const shouldPoll = () =>
		discovery.state.status === 'waiting' ||
		discovery.state.status === 'unknown' ||
		discovery.shouldShowEntryPoints;
	const { pause, resume } = useIntervalFn(
		async () => {
			await refresh();
			if (!shouldPoll()) pause();
		},
		pollInterval,
		{ immediate: false },
	);
	// Resume completion checks if a flag arriving late enables the entry points.
	watch(shouldPoll, (poll) => {
		if (poll) resume();
		else pause();
	});

	watch(
		[
			() => users.currentUser?.id,
			() => settings.isCloudDeployment,
			() => users.isInstanceOwner,
			() => cloudPlan.hasCloudPlan,
		] as const,
		([userId, isCloud, isOwner, cloudReady]) => {
			pause();
			enrollmentGeneration++;
			unknownChecks.value = 0;
			discovery.reset();
			if (userId && isCloud && isOwner && cloudReady) {
				const requestGeneration = enrollmentGeneration;
				void refresh().then(() => {
					if (requestGeneration !== enrollmentGeneration) return;
					if (users.currentUser?.id !== userId) return;
					if (shouldPoll()) resume();
				});
			}
		},
		{ immediate: true },
	);
}
