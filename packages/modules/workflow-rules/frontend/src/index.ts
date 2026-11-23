// The module's only public entry. The shell imports the descriptor from here via
// `modules.manifest.ts`; anything else the shell (or a test) needs must be exported
// here too — deep paths into `src/` are not part of the contract.
export { WorkflowRulesModule } from './workflow-rules.module';
export { useWorkflowRulesStore } from './workflow-rules.store';
export {
	useWorkflowRulesSync,
	type WorkflowRulesSyncOptions,
} from './builder/useWorkflowRulesSync';
export { default as WorkflowRulesPanel } from './builder/WorkflowRulesPanel.vue';
export { default as WorkflowRulesStatusButton } from './builder/WorkflowRulesStatusButton.vue';
export { default as WorkflowRuleNodeBadge } from './builder/WorkflowRuleNodeBadge.vue';
export { default as WorkflowRuleFindingsCallout } from './builder/WorkflowRuleFindingsCallout.vue';
export { WORKFLOW_RULE_VIOLATION_KIND } from './workflow-rules.constants';
