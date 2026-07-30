import { z } from 'zod';

export const SEARCH_NODE_ACTIONS_DESCRIPTION = `Start here for every node-action task. Search only the actions available to you.

Rules:
- Describe both the integration and intent; for example: "Google Sheets append row" or "Slack send message".
- Never guess an actionId. Use an exact id returned by this tool.
- If results are empty or irrelevant, retry with a shorter integration name, action verb, or synonym.
- After choosing an action, call get_node_action before resolving parameters or running it.`;

export const GET_NODE_ACTION_DESCRIPTION = `Get the authoritative input contract for one action selected with search_node_actions.

Rules:
- Always call this before resolve_node_parameter or run_node_action for the selected action.
- Use only fields listed in input.fields. Do not invent parameters or send credentials, resource, operation, version, resolver names, or n8n editor wrappers.
- Supply every visible required field. Obey each field's when condition.
- Resource fields accept the scalar forms listed in accepts. Object fields accept ordinary JSON objects.
- A field with resolve must be resolved when you do not already know a valid value or its object fields.`;

export const RESOLVE_NODE_PARAMETER_DESCRIPTION = `Resolve one dynamic field from a contract returned by get_node_action.

Rules:
- Call this only for a field that has resolve metadata, using its exact field path as parameter.
- Put values already chosen for the action in knownInput, using the public scalar/object shapes from get_node_action.
- Resolve dependencies first. If status is "needsInput", obtain every field in missing and retry.
- Never provide or guess an underlying n8n method name.
- Never silently select an option. Choose the option that matches the user's intent, add its value to knownInput, then follow next.
- Use query to narrow large option lists and cursor to continue pagination.`;

export const RUN_NODE_ACTION_DESCRIPTION = `Final step: validate and execute an action after reading its contract and resolving required dynamic fields.

Rules:
- Use the exact actionId returned by search_node_actions.
- Call get_node_action first and include only its public input fields.
- Complete all visible required fields and required dynamic resolutions before running.
- Send resource locators as scalars and resource-mapper values as ordinary objects. Fields with acceptsExpression support n8n expressions beginning with "=". Never send credentials, resolver names, or internal wrappers.
- If validation fails, correct the reported field; do not repeatedly retry unchanged input.`;

export const searchNodeActionsInputSchema = z.object({
	query: z.string().min(1),
	limit: z.number().int().min(1).max(50).default(10),
	cursor: z.string().optional(),
});

export const getNodeActionInputSchema = z.object({
	actionId: z.string().min(1),
});

export const resolveNodeParameterInputSchema = z.object({
	actionId: z.string().min(1),
	parameter: z.string().min(1),
	knownInput: z.record(z.string(), z.unknown()),
	query: z.string().optional(),
	cursor: z.string().optional(),
});

export const runNodeActionInputSchema = z.object({
	actionId: z.string().min(1),
	input: z.record(z.string(), z.unknown()),
});
