import type { EffectiveWorkflowRulesResponse } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { RuleFinding } from '@n8n/workflow-rules';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

import { getEffectiveRules } from './workflow-rules.api';
import { WORKFLOW_RULES_MODULE_ID } from './workflow-rules.constants';

interface LoadedRules {
	readonly key: string;
	readonly rules: EffectiveWorkflowRulesResponse;
}

/**
 * The rules of the open workflow and its live findings. One workflow is open at a time,
 * so the store holds one evaluation. `useWorkflowRulesSync` fills it from the editor.
 */
export const useWorkflowRulesStore = defineStore('workflowRules', () => {
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();

	const isEnabled = computed(() => settingsStore.isModuleActive(WORKFLOW_RULES_MODULE_ID));

	const loaded = shallowRef<LoadedRules | null>(null);
	const findings = shallowRef<RuleFinding[]>([]);
	let requestId = 0;

	/** Increments when a badge or the header asks the editor to show the Rules panel. */
	const panelRequests = ref(0);
	const focusedNodeName = ref<string | null>(null);

	const effectiveRules = computed(() => loaded.value?.rules ?? null);
	const activeFindings = computed(() => findings.value.filter((finding) => !finding.exempted));
	const blockingFindings = computed(() =>
		activeFindings.value.filter((finding) => finding.severity === 'block'),
	);
	const warningFindings = computed(() =>
		activeFindings.value.filter((finding) => finding.severity === 'warn'),
	);
	const findingsByNodeName = computed(() => {
		const byNode = new Map<string, RuleFinding[]>();
		for (const finding of activeFindings.value) {
			if (!finding.nodeName) continue;
			byNode.set(finding.nodeName, [...(byNode.get(finding.nodeName) ?? []), finding]);
		}
		return byNode;
	});
	const hasRules = computed(() => {
		const rules = loaded.value?.rules;
		if (!rules) return false;
		const count = (set: { rules: unknown[]; customRules: unknown[] } | null) =>
			set ? set.rules.length + set.customRules.length : 0;
		return count(rules.instance) + count(rules.project) > 0;
	});

	/** Loads the effective rules. A response for an older request is dropped. */
	async function load(projectId: string, workflowId: string | undefined) {
		if (!isEnabled.value) return;
		const id = ++requestId;
		const rules = await getEffectiveRules(rootStore.restApiContext, projectId, workflowId);
		if (id !== requestId) return;
		loaded.value = { key: `${projectId}:${workflowId ?? ''}`, rules };
	}

	function setFindings(next: RuleFinding[]) {
		findings.value = next;
	}

	function showPanel(nodeName: string | null = null) {
		focusedNodeName.value = nodeName;
		panelRequests.value++;
	}

	function reset() {
		requestId++;
		loaded.value = null;
		findings.value = [];
		focusedNodeName.value = null;
	}

	return {
		isEnabled,
		effectiveRules,
		hasRules,
		findings,
		activeFindings,
		blockingFindings,
		warningFindings,
		findingsByNodeName,
		panelRequests,
		focusedNodeName,
		load,
		setFindings,
		showPanel,
		reset,
	};
});
