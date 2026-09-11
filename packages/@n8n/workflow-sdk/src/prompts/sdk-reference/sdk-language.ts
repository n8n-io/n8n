/**
 * Builder-facing SDK language reference, rendered from the interpreter's own
 * tables so guidance cannot drift from what the parser accepts.
 */
import {
	GROUP_DESCRIPTION_MAX_LENGTH,
	NODE_GROUPING_RULES,
	TOP_LEVEL_ITEM_CEILING,
} from 'n8n-workflow';

import {
	SDK_METHODS,
	FORBIDDEN_NODE_TYPES,
	SAFE_JSON_METHOD_NAMES,
	SAFE_STRING_METHOD_NAMES,
	BUILDER_BLOCKED_GLOBALS,
	SDK_INLINE_CONSTRAINTS,
	type SdkMethodGroup,
} from '../../ast-interpreter';

const GROUP_LABELS: Record<Exclude<SdkMethodGroup, 'internal'>, string> = {
	workflow: 'Workflow builder',
	node: 'Node builder',
	'control-flow': 'Control flow',
	connection: 'Connection',
};

const PUBLIC_METHODS = SDK_METHODS.filter((m) => m.public);

function renderRulesLines(): string {
	return [
		...Object.values(NODE_GROUPING_RULES).map((r) => `- ${r.sdkReference}`),
		'- **Unique identity.** Group names and ids must be unique within the workflow.',
		'- **Non-empty.** A group needs at least one node.',
		'',
		'Prefer grouping a linear range of nodes — they read most clearly — but that is a',
		'readability guideline, not a rule the server enforces.',
	].join('\n');
}

function renderMethodLines(): string {
	return (Object.keys(GROUP_LABELS) as Array<keyof typeof GROUP_LABELS>)
		.map((group) => {
			const names = PUBLIC_METHODS.filter((m) => m.group === group).map((m) => `\`.${m.name}()\``);
			return names.length ? `- **${GROUP_LABELS[group]}:** ${names.join(', ')}` : '';
		})
		.filter(Boolean)
		.join('\n');
}

function renderForbiddenLines(): string {
	return Object.values(FORBIDDEN_NODE_TYPES)
		.map((message) => `- ${message}`)
		.join('\n');
}

function renderBlockedGlobalsLines(): string {
	return BUILDER_BLOCKED_GLOBALS.map((g) =>
		g.alternative ? `- \`${g.name}\`: ${g.alternative}` : `- \`${g.name}\``,
	).join('\n');
}

function renderInlineConstraintLines(): string {
	return SDK_INLINE_CONSTRAINTS.map((c) => `- ${c}`).join('\n');
}

const SAFE_METHODS_SENTENCE =
	`The only non-builder methods available are ${SAFE_JSON_METHOD_NAMES.map((n) => `\`JSON.${n}\``).join(', ')} ` +
	`and the string methods ${SAFE_STRING_METHOD_NAMES.map((n) => `\`.${n}()\``).join(', ')}. ` +
	'Native array/string methods such as `.join()`, `.map()`, `.filter()`, `.reduce()`, and `.split()` are NOT available.';

/**
 * Node-groups documentation, shared by Instance AI and the MCP `get_sdk_reference` tool.
 *
 * The rules stated here must match what the server enforces on save:
 * - basic rules (unique id/name, non-empty): `validateWorkflowGroups`
 * - structural rules: `validateNodeSelectionForGrouping`
 * Sourced from the `NODE_GROUPING_RULES` constant in `n8n-workflow`, so this doc,
 * the canvas, and the save path share one definition.
 */
export const NODE_GROUPS_REFERENCE = `## Node groups

A node group is a named visual frame around nodes on the canvas. It has no execution
semantics — nothing about how the workflow runs depends on it — but it is how the user reads
the workflow, so it is part of the deliverable, not decoration. Declare one with \`.group(name, members, options?)\`
on the workflow; members are the node handles (the \`const\` from \`node(...)\`), the same
way connections reference nodes:

\`\`\`typescript
const fetch = node({ /* ... name: 'Fetch data' */ });
const transform = node({ /* ... name: 'Transform' */ });
export default workflow('id', 'My workflow')
  .add(fetch)
  .to(transform)
  .group('Ingestion', [fetch, transform], {
    description: 'Pulls the CRM contacts and normalizes them',
  });
\`\`\`

\`description\` is what the user sees while the group is collapsed, so always set one —
anything past ${GROUP_DESCRIPTION_MAX_LENGTH} characters is cut off. The grouping guidance
covers what it should say.

When editing an existing workflow, **keep the \`.group(...)\` calls and their descriptions
intact** unless the change is specifically about grouping.

The rules below MUST be followed. Agent save tools drop an invalid group from the saved
workflow and report a warning naming what was invalid. A warning never means the stage should
stay ungrouped: fix what it reports — a duplicate name, a member that does not exist, a
boundary the rules reject — and build again. Never re-emit the same invalid group.

Rules:
${renderRulesLines()}
`;

/**
 * Grouping judgement guidance: *when* to group — the rules that make a group
 * valid live in `NODE_GROUPS_REFERENCE`. MCP appends it to the technique list
 * only when the canvas-groups flag is on; Instance AI always materializes it
 * into the knowledge base.
 */
export const GROUPING_GUIDANCE = `## Grouping

Node groups are named visual frames on the canvas, and they are how the person who opens this workflow reads it. Grouping is part of the build, not a finishing touch.

Every workflow needs an explicit grouping decision, taken while you write the code: declare groups, or conclude this one does not warrant any. Deciding against groups is fine; skipping the decision is not.

- **When:** count top-level items with no groups (trigger + every node or existing group). More than ${TOP_LEVEL_ITEM_CEILING} → you must group. A linear pipeline is the normal case for grouping, not an exemption: stages run in sequence (ingest → transform → deliver). ${TOP_LEVEL_ITEM_CEILING} or fewer serving one objective → leave it ungrouped.
- **How many:** one per stage or high-level objective, typically 3-5, aiming for at most ${TOP_LEVEL_ITEM_CEILING} top-level items after grouping. Staying above ${TOP_LEVEL_ITEM_CEILING} is only acceptable when every item still at the top level is either a group already, or a node that cannot join one without breaking a validity rule — check each one before you settle. Never split one objective to hit the number. When in doubt, fewer and larger.
- **What belongs together:** one business outcome ("Fetch new recordings"), never a technical category ("HTTP requests", "Database operations"). Cut where the objective changes; merge groups serving the same outcome. Stages of one or two nodes mean the boundaries are too fine — widen them.
- **Groups vs sub-workflows:** a group organises one canvas; a sub-workflow is separately executed and reusable. Group to make one canvas readable; extract a sub-workflow to reuse logic or isolate execution.

**Boundaries:** a group takes one member receiving from outside and one member sending outside; any number of connections may reach those two members.

- A branch that stops one way and continues the other: keep the branch node inside with both its paths outside, end the group before it, or leave it and its stop path outside.
- Work that fans out into parallel branches: the node they fan out from and the node they reconverge on both belong inside, or every branch faces outward on its own.
- When the node at either end cannot be a member — the trigger, or a node already in another group — the stage needs its own step there to serve as the single entry or exit. Use a step the stage already has; add a plain pass-through only when the stage would otherwise stay ungrouped.
- A rejected group never closes the stage: try a smaller slice that is valid — one branch, or the linear run before or after the split — before leaving anything ungrouped.

Groups are created collapsed, so title + description is all the user sees.

**Titles:** outcome-first, 2-4 words, naming one outcome. "Fetch new recordings", not "HTTP + Drive"; "Generate call summary", not "Claude + Edit Fields". No node, credential, or API names. Two verbs joined by "and" or "&" mean you named the steps instead of the outcome — find the outcome they add up to: "Create & invite" is really "Provision new hire". This one is a preference, not a rule: a two-verb title beats splitting a coherent stage or leaving it ungrouped. If someone who has never seen the workflow cannot tell what it does from the title alone, fix the title or the boundary. If the purpose does not fit in 2-4 words, the group is doing too much — split it.

**Descriptions:** one per group, at most ${GROUP_DESCRIPTION_MAX_LENGTH} characters, plain language a non-technical reader follows, no node types or parameter values. It must add to the title — never restate it or open by repeating it ("Validates the shipping address against the Google API…" under the title "Validate via Google"), and never open on the parts list ("AI agent with Postgres chat memory drafts a reply" says only what the reader can already see). Collapsed groups clip the text, so spend the first words on the trigger/input, the destination/output, or the scope boundary.

Examples:

- "Fetch new recordings" → "Polls Gong every 15 min for fresh calls, downloads audio, stores raw files in Google Drive"
- "Generate call summary" → "Transcribes the audio, then extracts action items, sentiment, and key topics"
- "Draft support reply" → "Turns the email and the customer's plan and open tickets into a draft, citing our docs"

Read the node groups reference for the exact rules before creating groups.`;

/**
 * Render the full language reference. The node-groups section is included by
 * default (Instance AI's knowledge base); the MCP SDK reference passes its
 * `canvasGroupsEnabled` flag state as `includeGroups`.
 */
export function buildSdkLanguageReference(options: { includeGroups?: boolean } = {}): string {
	const { includeGroups = true } = options;

	return `# Workflow SDK language reference

SDK builder code is a **restricted subset of TypeScript**, not a Code node and
not arbitrary JavaScript. It is parsed by an AST interpreter that builds a static
workflow graph: the code never executes at build time. Only the constructs below
are accepted; anything else fails to parse.

## Methods that chain on SDK objects

${renderMethodLines()}

${SAFE_METHODS_SENTENCE}

${includeGroups ? `${NODE_GROUPS_REFERENCE}\n\n` : ''}## Forbidden constructs

${renderForbiddenLines()}

## Language constraints

${renderInlineConstraintLines()}

## Global objects are unavailable

These are blocked in builder code. When an alternative is listed, use it instead:

${renderBlockedGlobalsLines()}

## Where to put runtime logic

Builder code only describes the graph. For anything that needs to run at
runtime (joining/aggregating values, transforming items, parsing, date math,
regex), do it in one of these:

- Build strings with **template literals** or explicit lines.
- Use an **n8n expression** via \`expr('{{ ... }}')\` for per-item values.
- Use a **Code node** for multi-step aggregation or transformation.
`;
}

/**
 * Full reference including groups docs. Materialized into Instance AI's
 * knowledge base for on-demand reading; the MCP SDK reference embeds the
 * groups-gated variant via `buildSdkLanguageReference` instead.
 */
export const SDK_LANGUAGE_REFERENCE = buildSdkLanguageReference();
