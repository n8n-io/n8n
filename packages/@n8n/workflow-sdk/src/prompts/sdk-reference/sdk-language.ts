/**
 * Builder-facing SDK language reference, rendered from the interpreter's own
 * tables so guidance cannot drift from what the parser accepts.
 */
import { GROUP_DESCRIPTION_MAX_LENGTH, NODE_GROUPING_RULES } from 'n8n-workflow';

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
 * Node-groups documentation, extracted so consumers can import just this section
 * without the whole builder-language reference. Shared by Instance AI (embedded
 * in `SDK_LANGUAGE_REFERENCE` below) and the MCP `get_sdk_reference` tool.
 *
 * The rules stated here must match what the server enforces on save:
 * - basic rules (unique id/name, non-empty): `validateWorkflowGroups`
 * - structural rules: `validateNodeSelectionForGrouping`
 * The four structural rules (and their save-path rejection messages) are sourced
 * from the shared `NODE_GROUPING_RULES` constant in `n8n-workflow`, so this doc,
 * the canvas, and the save path share one definition.
 *
 * Grouping DOES enforce a single entry/exit *boundary* (at most one incoming and
 * one outgoing main connection) via the `invalid-subgraph` rule. The stricter
 * per-node single-main-port check (`multiple-input/-output-branches`) is
 * extraction-only (`validateNodeSelectionForExtraction`) and is not stated here.
 */
export const NODE_GROUPS_REFERENCE = `## Node groups

A node group is a named, visual grouping of nodes (a frame on the canvas). It is
purely organisational — nothing about execution depends on it. Declare one with
\`.group(name, members, options?)\` on the workflow. Members are the node handles (the
\`const\` from \`node(...)\`) — the same way connections reference nodes:

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

\`description\` is optional and shown when the group is collapsed. Keep it to one
sentence — anything past ${GROUP_DESCRIPTION_MAX_LENGTH} characters is cut off.

When editing an existing workflow, **keep the \`.group(...)\` calls and their descriptions
intact** unless the change is specifically about grouping.

Agent save tools drop an invalid group from the saved workflow and report a warning.
Fix the source so the invalid group is not re-emitted. These rules MUST be followed
when creating or editing groups.

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

Organise larger workflows into named node groups — visual frames drawn on the canvas — so the result is readable the first time the user sees it.

- **When to group:** larger workflows that split into clear stages (e.g. ingest → transform → deliver). Give each stage its own group. Small workflows don't need groups — a group there is just noise.
- **Groups vs sub-workflows:** a group is cosmetic organisation *inside* one workflow; a sub-workflow is a separately-executed, reusable unit. Group to make one canvas readable; extract a sub-workflow to reuse logic or isolate execution.
- **Naming:** short, outcome-first titles ("Fetch new recordings", not "HTTP + Drive").
- Groups are created collapsed by default, so the name is what the user sees first — make it descriptive.

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
