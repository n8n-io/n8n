// Shared by `executions(action="run")` and `verify_built_workflow`. Both tools are
// always loaded, so the descriptions state the contract only. The per-trigger
// shapes and the multi-trigger procedure live in the workflow-builder skill.

export const TRIGGER_INPUT_DATA_DESCRIPTION =
	'Output to inject as the trigger output. The shape depends on the trigger type; see the `trigger-input-data-shapes` reference.';

export const TRIGGER_NODE_NAME_DESCRIPTION =
	'Name of the trigger node to start from, from `triggerNodes` in the build result. Required when the workflow has more than one trigger.';
