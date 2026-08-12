import toolLabelsJson from './tool-labels.json';

const TOOL_LABELS: Record<string, string> = toolLabelsJson;

const GERUND_OVERRIDES: Record<string, string> = {
	get: 'getting',
	set: 'setting',
	put: 'putting',
	run: 'running',
	stop: 'stopping',
	plan: 'planning',
	cancel: 'cancelling',
	submit: 'submitting',
	tag: 'tagging',
};

function splitWords(toolName: string): string[] {
	return toolName
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.toLowerCase()
		.split(/[-_]+/)
		.filter(Boolean);
}

function toGerund(verb: string): string {
	const override = GERUND_OVERRIDES[verb];
	if (override) return override;
	if (verb.length > 2 && /[^aeiou]e$/.test(verb)) return `${verb.slice(0, -1)}ing`;
	return `${verb}ing`;
}

function capitalize(word: string): string {
	return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
}

function prettifyToolName(toolName: string): string {
	const [verb, ...rest] = splitWords(toolName);
	if (!verb) return toolName;
	const gerund = capitalize(toGerund(verb));
	return rest.length === 0 ? gerund : `${gerund} the ${rest.join(' ')}`;
}

/**
 * Human-readable label for an Instance AI tool call, mirroring the frontend's
 * lookup order in `toolLabels.ts` (`<toolName>.<action>` then `<toolName>`),
 * but falling back to a generated sentence instead of the raw tool name —
 * `tool-labels.json` is a snapshot of the frontend's i18n strings and can lag
 * behind newly added tools.
 */
export function labelForTool(toolName: string, args?: Record<string, unknown>): string {
	const action = typeof args?.action === 'string' ? args.action : undefined;
	if (action) {
		const actionLabel = TOOL_LABELS[`${toolName}.${action}`];
		if (actionLabel) return actionLabel;
	}

	const toolLabel = TOOL_LABELS[toolName];
	if (toolLabel) return toolLabel;

	return prettifyToolName(toolName);
}
