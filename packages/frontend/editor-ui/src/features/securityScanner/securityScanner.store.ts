import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores/constants';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';

import { runSecurityScan, computeSummary } from './scanner/runSecurityScan';
import type { SecurityCategory } from './scanner/types';
import {
	SECURITY_PANEL_LOCAL_STORAGE_KEY,
	DEFAULT_PANEL_WIDTH,
	type SecurityTab,
} from './securityScanner.constants';

export const useSecurityScannerStore = defineStore(STORES.SECURITY_SCANNER, () => {
	const workflowsStore = useWorkflowsStore();
	const ndvStore = useNDVStore();

	// UI state
	const panelOpen = ref(false);
	const activeTab = ref<SecurityTab>('all');
	const panelWidth = ref(loadPanelWidth());

	// Reactive findings — recomputed whenever workflow nodes or connections change
	const findings = computed(() => {
		return runSecurityScan(workflowsStore.allNodes, workflowsStore.allConnections);
	});

	const summary = computed(() => computeSummary(findings.value));

	const filteredFindings = computed(() => {
		if (activeTab.value === 'all') return findings.value;
		return findings.value.filter((f) => f.category === activeTab.value);
	});

	const categoryCount = computed(() => {
		const counts: Record<SecurityCategory | 'all', number> = {
			all: findings.value.length,
			'hardcoded-secret': 0,
			'pii-data-flow': 0,
			'insecure-config': 0,
			'data-exposure': 0,
			'expression-risk': 0,
		};
		for (const finding of findings.value) {
			counts[finding.category]++;
		}
		return counts;
	});

	function openPanel() {
		panelOpen.value = true;
	}

	function closePanel() {
		panelOpen.value = false;
	}

	function togglePanel() {
		panelOpen.value = !panelOpen.value;
	}

	function setActiveTab(tab: SecurityTab) {
		activeTab.value = tab;
	}

	function updateWidth(width: number) {
		panelWidth.value = width;
		try {
			window.localStorage.setItem(SECURITY_PANEL_LOCAL_STORAGE_KEY, String(width));
		} catch {
			// localStorage might be unavailable
		}
	}

	function navigateToNode(nodeName: string) {
		ndvStore.setActiveNodeName(nodeName, 'other');
	}

	function loadPanelWidth(): number {
		try {
			const stored = window.localStorage.getItem(SECURITY_PANEL_LOCAL_STORAGE_KEY);
			if (stored) return Number(stored);
		} catch {
			// localStorage might be unavailable
		}
		return DEFAULT_PANEL_WIDTH;
	}

	return {
		panelOpen,
		activeTab,
		panelWidth,
		findings,
		summary,
		filteredFindings,
		categoryCount,
		openPanel,
		closePanel,
		togglePanel,
		setActiveTab,
		updateWidth,
		navigateToNode,
	};
});
