// Shared by `executions(action="run")` and `verify_built_workflow`. Both tools are
// always loaded, so one short wording keeps the rules consistent and cheap.

export const TRIGGER_INPUT_DATA_DESCRIPTION =
	'Trigger output to inject; works for any trigger type. Match the real trigger output: ' +
	'Form Trigger -> flat fields like {name: "Alice"} (no formFields wrapper); Chat Trigger -> {chatInput: "..."}; ' +
	'Schedule Trigger -> omit; event triggers -> the event payload. Webhook: a flat object becomes `body` only. ' +
	'When an expression reads $json.query.*, $json.headers.* or $json.params.*, pass {body, query, headers, params}.';

export const TRIGGER_NODE_NAME_DESCRIPTION =
	'Trigger node to start from. REQUIRED when the workflow has more than one trigger, otherwise the ' +
	"other triggers' branches never run: call once per trigger. Names come from " +
	'workflow_builder_build_workflow\'s `triggerNodes` or workflows(action="get-as-code"). ' +
	'Never disable, delete, edit or copy a workflow to reach a branch.';
