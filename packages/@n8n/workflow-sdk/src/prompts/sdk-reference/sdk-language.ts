/**
 * Builder-facing SDK language reference, rendered from the interpreter's own
 * tables so guidance cannot drift from what the parser accepts.
 */
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
 * - basic rules: `validateWorkflowNodeGroups`
 * - structural rules: `validateNodeSelectionForGrouping`
 * Save-time validation does NOT require a single entry/exit node (that lives in
 * `validateNodeSelectionForExtraction`), so this doc must not claim it does.
 */
export const NODE_GROUPS_REFERENCE = `## Node groups

A node group is a named, visual grouping of nodes (a frame on the canvas). It is
purely organisational — nothing about execution depends on it. Declare one with
\`.group(name, members)\` on the workflow. Members are the node handles (the
\`const\` from \`node(...)\`) — the same way connections reference nodes:

\`\`\`typescript
const fetch = node({ /* ... name: 'Fetch data' */ });
const transform = node({ /* ... name: 'Transform' */ });
export default workflow('id', 'My workflow')
  .add(fetch)
  .to(transform)
  .group('Ingestion', [fetch, transform]);
\`\`\`

When editing an existing workflow, **keep the \`.group(...)\` calls intact** unless
the change is specifically about grouping.

an invalid group is rejected on save, so these following rules MUST be followed when
creating or editing groups.

Rules:
- **No trigger nodes.** Trigger nodes cannot be part of a group.
- **One connected section.** Connectable members must form a single connected section of the
  graph, not two unrelated islands with a gap between them; sticky notes may accompany
  the selection without participating in connectivity, and a sticky-only group is valid.
- **Keep AI sub-nodes with their Agent.** If an AI Agent is in a group, its
  language-model, tool, and memory sub-nodes belong in the same group — put them
  either all inside the group or all outside it, never split. A model/tool/memory
  connection must not cross the group boundary.
- **One group per node.** A node can belong to only one group at a time.
- **Unique identity.** Group names and ids must be unique within the workflow.
- **Non-empty.** A group needs at least one node.

Prefer grouping a linear range of nodes — they read most clearly — but that is a
readability guideline, not a rule the server enforces.`;

/** Full reference, materialized into the knowledge base for on-demand reading. */
export const SDK_LANGUAGE_REFERENCE = `# Workflow SDK language reference

SDK builder code is a **restricted subset of TypeScript**, not a Code node and
not arbitrary JavaScript. It is parsed by an AST interpreter that builds a static
workflow graph: the code never executes at build time. Only the constructs below
are accepted; anything else fails to parse.

## Methods that chain on SDK objects

${renderMethodLines()}

${SAFE_METHODS_SENTENCE}

${NODE_GROUPS_REFERENCE}

## Forbidden constructs

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
