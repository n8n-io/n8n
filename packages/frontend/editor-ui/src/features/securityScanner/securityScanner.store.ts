import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores/constants';

import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';

import { runSecurityScan, computeSummary } from './scanner/runSecurityScan';
import type { SecurityFinding, SecuritySeverity } from './scanner/types';
import {
	SECURITY_PANEL_LOCAL_STORAGE_KEY,
	DEFAULT_PANEL_WIDTH,
	type SecurityTab,
} from './securityScanner.constants';

export const useSecurityScannerStore = defineStore(STORES.SECURITY_SCANNER, () => {
	const workflowsStore = useWorkflowsStore();

	// UI state
	const panelOpen = ref(false);
	const activeTab = ref<SecurityTab>('all');
	const panelWidth = ref(loadPanelWidth());

	// Reactive findings — recomputed whenever workflow nodes or connections change
	const findings = computed(() => {
		return runSecurityScan(workflowsStore.allNodes, workflowsStore.allConnections);
	});

	const summary = computed(() => computeSummary(findings.value));
	const hasFindings = computed(() => summary.value.total > 0);

	const filteredFindings = computed(() => {
		if (activeTab.value === 'all') return findings.value;
		return findings.value.filter((f) => f.severity === activeTab.value);
	});

	const severityCount = computed(() => {
		const counts: Record<SecuritySeverity | 'all', number> = {
			all: findings.value.length,
			critical: 0,
			warning: 0,
			info: 0,
		};
		for (const finding of findings.value) {
			counts[finding.severity]++;
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
		const node = workflowsStore.getNodeByName(nodeName);
		if (node) {
			canvasEventBus.emit('nodes:select', { ids: [node.id], panIntoView: true });
		}
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

		let prompt: string;

		if (hasFindings.value) {
			// Format the static findings as context for the AI
			const findingsContext = JSON.stringify(
				findings.value.map((f) => ({
					category: f.category,
					severity: f.severity,
					title: f.title,
					description: f.description,
					remediation: f.remediation,
					nodeName: f.nodeName,
					parameterPath: f.parameterPath,
					matchedValue: f.matchedValue,
				})),
				null,
				2,
			);

			prompt = `Perform a security and PII scan of my current workflow using the security_scan tool. Here are the static analysis results for additional context:\n\n${findingsContext}\n\nAnalyze each finding, identify additional risks, assess compliance, and provide an executive summary with fix recommendations.`;
		} else {
			prompt =
				'Perform a deep security and PII scan of my current workflow using the security_scan tool. The static analysis found no issues, but please look deeper for semantic risks such as unsafe data flows between nodes, implicit PII exposure, misconfigured credentials, overly permissive webhooks, or any compliance concerns. Provide an executive summary with your assessment.';
		}

		// Send the security analysis request to the builder
		await builderStore.sendChatMessage({ text: prompt, source: 'canvas' });
	}

	async function fixFindingWithAi(finding: SecurityFinding) {
		if (!isAiAvailable.value) return;

		const chatPanelStore = useChatPanelStore();
		const builderStore = useBuilderStore();

		await chatPanelStore.open({ mode: 'builder', showCoachmark: false });

		const findingContext = JSON.stringify(
			{
				category: finding.category,
				severity: finding.severity,
				title: finding.title,
				description: finding.description,
				remediation: finding.remediation,
				nodeName: finding.nodeName,
				parameterPath: finding.parameterPath,
				matchedValue: finding.matchedValue,
			},
			null,
			2,
		);

		await builderStore.sendChatMessage({
			text: `I have a security finding in my workflow that I need help fixing. Please apply the recommended remediation to the "${finding.nodeName}" node.\n\nFinding details:\n${findingContext}\n\nPlease implement the fix directly in the workflow.`,
			source: 'canvas',
		});
	}

	return {
		panelOpen,
		activeTab,
		panelWidth,
		findings,
		summary,
		hasFindings,
		filteredFindings,
		severityCount,
		isAiAvailable,
		openPanel,
		closePanel,
		togglePanel,
		setActiveTab,
		updateWidth,
		navigateToNode,
		analyzeWithAi,
		fixFindingWithAi,
	};
});
