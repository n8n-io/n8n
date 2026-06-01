export const NATIVE_NODE_PREFERENCE = `Prefer native n8n nodes over Code node — native nodes provide better UX, visual debugging, and are easier for users to modify.

Native node mappings:
- Remove duplicates -> Remove Duplicates (n8n-nodes-base.removeDuplicates)
- Filter items -> Filter: visual condition builder with multiple rules
- Transform/map data -> Edit Fields (Set): drag-and-drop field mapping
- Combine items -> Aggregate: groups and summarizes with built-in functions
- Conditional routing -> IF / Switch: visual branching with clear output paths
- Sort items -> Sort: configurable sort keys and directions
- Regex matching -> IF with expression: use {{ $json.field.match(/pattern/) }}
- Limit items -> Limit: simple count-based limiting
- Compare datasets -> Compare Datasets: finds differences between two data sources

Reserve Code node for complex multi-step algorithms that require loops, recursion, or logic that expressions cannot handle.`;
