import { catalog } from './catalog';

const sharedRules = `
Build UI only for the existing workflow in the user message. Do not invent, remove, reorder, or change workflow operations.
Use the most specific workflow action component in the catalog for every operation. Do not represent operations as generic cards. Use Step only when no action type fits.
Quote real workflow parameter values in component props. Do not invent values that are absent from the payload.
Every component that represents a workflow node must set nodeId to that node's exact id.
The root element must be a single Screen.
Never emit icon fields, icon URLs, image URLs, SVG, or emoji. Send nodeId only; Vue resolves the node logo from its type.
Bind the press event of every node component to the openNode action with that component's nodeId.
Return only one complete valid JSON spec with no markdown or explanation.`;

export function systemPrompt(view: 'story' | 'play'): string {
	const viewRules =
		view === 'story'
			? `Create a concise Story view using Group components titled When, Then, and If. Put Decision components in the If group.
Skip Transform nodes, Merge nodes, and sticky notes. Preserve the meaning and branching of the remaining workflow.`
			: `Create a Play-by-play view as one vertical sequence.
Represent every workflow operation as exactly one beat, in execution order, including transformations and branching operations.`;

	return `${catalog.prompt()}\n\n${sharedRules}\n${viewRules}`;
}

export function followUpSystemPrompt(): string {
	return `${catalog.prompt()}\n\nRevise the current spec only as requested by the instruction.
Stay within the catalog and preserve existing nodeIds for every workflow node.
Return a complete replacement spec, not a patch, diff, partial object, markdown, or explanation.
Never emit icon fields, icon URLs, image URLs, SVG, or emoji. Send nodeId only; Vue resolves the node logo from its type.
Keep every node component's press event bound to the openNode action with its nodeId.`;
}
