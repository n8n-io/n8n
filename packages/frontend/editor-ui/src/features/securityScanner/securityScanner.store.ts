import { computed, ref, shallowRef, watch } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores/constants';
import { useDebounceFn } from '@vueuse/core';

import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { SECURITY_PII_SCANNER_EXPERIMENT } from '@/app/constants';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';

import { runSecurityScan, computeSummary } from './scanner/runSecurityScan';
import type { SecurityCategory, SecurityFinding, SecuritySeverity } from './scanner/types';
import {
	SECURITY_PANEL_LOCAL_STORAGE_KEY,
	DEFAULT_PANEL_WIDTH,
	type SecurityTab,
} from './securityScanner.constants';

export const useSecurityScannerStore = defineStore(STORES.SECURITY_SCANNER, () => {
	const posthogStore = usePostHog();
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();

	// Feature flag
	const isFeatureEnabled = computed(() =>
		posthogStore.isVariantEnabled(
			SECURITY_PII_SCANNER_EXPERIMENT.name,
			SECURITY_PII_SCANNER_EXPERIMENT.variant,
		),
	);

	// UI state
	const panelOpen = ref(false);
	const activeTab = ref<SecurityTab>('all');
	const panelWidth = ref(loadPanelWidth());

	// Debounced findings — avoids re-scanning on every node drag/rename.
	// Uses shallowRef + watch so the scan runs at most once per 300ms.
	const findings = shallowRef<SecurityFinding[]>([]);

	function doScan() {
		findings.value = runSecurityScan(workflowsStore.allNodes, workflowsStore.allConnections);
	}

	const debouncedScan = useDebounceFn(doScan, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

	watch(
		() => [workflowsStore.allNodes, workflowsStore.allConnections],
		() => {
			void debouncedScan();
		},
		{ immediate: true },
	);

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

	const categoryCount = computed(() => {
		const counts: Record<SecurityCategory, number> = {
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

	function trackScannerOpened() {
		telemetry.track('Security scanner opened', {
			instance_id: rootStore.instanceId,
			workflow_id: workflowsStore.workflowId,
			findings_total: summary.value.total,
			findings_critical: severityCount.value.critical,
			findings_warning: severityCount.value.warning,
			findings_info: severityCount.value.info,
			findings_hardcoded_secret: categoryCount.value['hardcoded-secret'],
			findings_pii_data_flow: categoryCount.value['pii-data-flow'],
			findings_insecure_config: categoryCount.value['insecure-config'],
			findings_data_exposure: categoryCount.value['data-exposure'],
			findings_expression_risk: categoryCount.value['expression-risk'],
		});
	}

	function openPanel() {
		panelOpen.value = true;
		trackScannerOpened();
	}

	function closePanel() {
		panelOpen.value = false;
	}

	function togglePanel() {
		const wasOpen = panelOpen.value;
		panelOpen.value = !panelOpen.value;
		if (!wasOpen) {
			trackScannerOpened();
		}
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

		telemetry.track('Security scanner AI deep scan triggered', {
			instance_id: rootStore.instanceId,
			workflow_id: workflowsStore.workflowId,
			findings_total: summary.value.total,
			findings_critical: severityCount.value.critical,
			findings_warning: severityCount.value.warning,
			findings_info: severityCount.value.info,
		});

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

		telemetry.track('Security scanner AI fix requested', {
			instance_id: rootStore.instanceId,
			workflow_id: workflowsStore.workflowId,
			finding_category: finding.category,
			finding_severity: finding.severity,
			finding_title: finding.title,
			node_name: finding.nodeName,
		});

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
		isFeatureEnabled,
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
