import {
	evaluateWorkflowRules,
	resolveEffectiveRules,
	type RuleNode,
	type RuleWorkflow,
} from '@n8n/workflow-rules';
import { useEventListener, watchDebounced } from '@vueuse/core';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME } from '@n8n/frontend-constants/durations';
import { onBeforeUnmount, watch, type Ref } from 'vue';

import { useWorkflowRulesStore } from '../workflow-rules.store';

export interface WorkflowRulesSyncOptions {
	projectId: Readonly<Ref<string | undefined>>;
	workflowId: Readonly<Ref<string | undefined>>;
	/** The workflow as the editor holds it. Evaluated again on every change. */
	workflow: Readonly<Ref<RuleWorkflow | undefined>>;
	/** The name n8n gives a new node of this type, for the "Descriptive node names" rule. */
	getDefaultNodeName?: (node: RuleNode) => string | undefined;
}

/**
 * Keeps the Workflow Rules findings of the open workflow up to date. The editor calls it once.
 * It runs the same engine as the server, so a finding here is the finding a publish meets.
 */
export function useWorkflowRulesSync(options: WorkflowRulesSyncOptions) {
	const store = useWorkflowRulesStore();

	const reload = async () => {
		const projectId = options.projectId.value;
		if (!store.isEnabled || !projectId) return;
		try {
			await store.load(projectId, options.workflowId.value);
		} catch {
			// Findings are advice in the editor. The server still checks every publish.
		}
	};

	watch([options.projectId, options.workflowId, () => store.isEnabled], reload, {
		immediate: true,
	});

	// An admin can change the rules while a builder works, so read them again on return.
	useEventListener(window, 'focus', reload);

	const evaluate = () => {
		const effective = store.effectiveRules;
		const workflow = options.workflow.value;
		if (!effective || !workflow) {
			store.setFindings([]);
			return;
		}
		const rules = resolveEffectiveRules(effective.instance, effective.project ?? undefined);
		const { findings } = evaluateWorkflowRules(workflow, rules, {
			exemptedRuleIds: effective.exemptions.map((exemption) => exemption.ruleId),
			defaults: effective.defaults,
			getDefaultNodeName: options.getDefaultNodeName,
		});
		store.setFindings(findings);
	};

	watch(() => store.effectiveRules, evaluate);
	watchDebounced(options.workflow, evaluate, {
		debounce: getDebounceTime(DEBOUNCE_TIME.INPUT.TEXT_CHANGE),
		immediate: true,
	});

	onBeforeUnmount(() => store.reset());
}
