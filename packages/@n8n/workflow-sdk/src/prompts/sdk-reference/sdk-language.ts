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

/** Full reference, materialized into the knowledge base for on-demand reading. */
export const SDK_LANGUAGE_REFERENCE = `# Workflow SDK language reference

SDK builder code is a **restricted subset of TypeScript**, not a Code node and
not arbitrary JavaScript. It is parsed by an AST interpreter that builds a static
workflow graph: the code never executes at build time. Only the constructs below
are accepted; anything else fails to parse.

## Methods that chain on SDK objects

${renderMethodLines()}

${SAFE_METHODS_SENTENCE}

## Node groups

A node group is a named, visual grouping of nodes (a frame on the canvas).
Declare one with \`.group(name, members)\` on the workflow. Members are the node
handles (the \`const\` from \`node(...)\`) — the same way connections reference nodes:

\`\`\`typescript
const fetch = node({ /* ... name: 'Fetch data' */ });
const transform = node({ /* ... name: 'Transform' */ });
export default workflow('id', 'My workflow')
  .add(fetch)
  .to(transform)
  .group('Ingestion', [fetch, transform]);
\`\`\`

When editing an existing workflow, **keep the \`.group(...)\` calls intact** unless
the change is specifically about grouping. Group members must form a single
connected section of the graph and cannot be trigger nodes; an invalid group is
rejected on save.

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
