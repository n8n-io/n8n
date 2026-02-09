import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores/constants';

import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
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

	const isAiAvailable = computed(() => {
		const settingsStore = useSettingsStore();
		return Boolean(settingsStore.isAiAssistantEnabled);
	});

	async function analyzeWithAi() {
		if (!isAiAvailable.value) return;

		const chatPanelStore = useChatPanelStore();
		const builderStore = useBuilderStore();

		// Open the builder chat panel
		await chatPanelStore.open({ mode: 'builder', showCoachmark: false });

		// Format the static findings as context for the AI
		const findingsContext = JSON.stringify(
			findings.value.map((f) => ({
				category: f.category,
				severity: f.severity,
				title: f.title,
				description: f.description,
				nodeName: f.nodeName,
				parameterPath: f.parameterPath,
				matchedValue: f.matchedValue,
			})),
			null,
			2,
		);

		// Send the security analysis request to the builder
		await builderStore.sendChatMessage({
			text: `Perform a security and PII scan of my current workflow using the security_scan tool. Here are the static analysis results for additional context:\n\n${findingsContext}\n\nAnalyze each finding, identify additional risks, assess compliance, and provide an executive summary with fix recommendations.`,
			source: 'canvas',
		});
	}

	return {
		panelOpen,
		activeTab,
		panelWidth,
		findings,
		summary,
		filteredFindings,
		categoryCount,
		isAiAvailable,
		openPanel,
		closePanel,
		togglePanel,
		setActiveTab,
		updateWidth,
		navigateToNode,
		analyzeWithAi,
	};
});
