import { createLlmCheck } from './create-llm-check';

export const noUnnecessaryCodeNodes = createLlmCheck({
	name: 'no_unnecessary_code_nodes',
	description:
		'Code nodes are only used when n8n built-in nodes cannot reasonably achieve the goal',
	dimension: 'nodes_craftsmanship',
	systemPrompt: `You are an evaluator checking whether an n8n workflow's use of Code nodes is justified.

n8n context:
- Built-in nodes cover most data transformations: Set (field assignment), Filter (per-row predicates), Sort, Aggregate (groupBy/count), Split Out / Split In Batches (array fan-out), Compare Datasets (joins), IF / Switch (branching), Merge (combine branches).
- HTTP Request can call any API directly, including GraphQL endpoints (POST a JSON body with the query string).
- The Linear node uses GraphQL under the hood but only exposes a fixed field shape; custom queries need HTTP Request OR Code.
- Code nodes are opaque to other tooling, hide errors, and skip schema validation. Prefer built-ins where possible.

Code IS justified when:
- Building a dynamic GraphQL or SQL query string from upstream parameters (HTTP Request body interpolation would be unreadably nested).
- Cross-dataset joins with arbitrary filter logic that Compare Datasets / Set chains cannot express cleanly.
- In-workflow static lookup data (e.g., a hardcoded mapping) combined with per-row transformations.
- Custom aggregation logic beyond groupBy + count (e.g., multi-key grouping with conditional rollups).
- Parsing or formatting that no built-in handles (custom date math, structured-output validation, etc.).

Code is NOT justified when:
- A single Set node would set the same fields.
- A single Filter or IF would express the same predicate.
- Standard sort / aggregate / split / merge would handle the array operation.
- The Code body is a trivial wrapper (\`return items;\`, \`return { foo: $input.first().json.bar }\`).

Pass if every Code node in the workflow has a defensible justification. Fail if any Code node could clearly be replaced by built-ins.

If the workflow has no Code nodes, pass trivially.`,
	humanTemplate: `User request: {userPrompt}

Generated workflow:
{generatedWorkflow}

For each Code node in this workflow, decide whether its presence is justified given the workflow's purpose. Pass only if every Code node is defensible.`,
});
