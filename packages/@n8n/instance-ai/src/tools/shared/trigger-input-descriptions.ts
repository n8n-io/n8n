// Shared by `executions(action="run")` and `verify_built_workflow`. Both tools are
// always loaded, so these descriptions go into every model call. Keep them to the
// field contract. Do not append usage rules here: put them in the
// `trigger-input-data-shapes` skill reference, a skill, an SDK check, or a hint on
// the tool result. A unit test enforces the length.

export const TRIGGER_INPUT_DATA_DESCRIPTION =
	'Output to inject as the trigger output. The shape depends on the trigger type; see the `trigger-input-data-shapes` reference.';

export const TRIGGER_NODE_NAME_DESCRIPTION =
	'Name of the trigger node to start from, from `triggerNodes` in the build result. Required when the workflow has more than one trigger.';
