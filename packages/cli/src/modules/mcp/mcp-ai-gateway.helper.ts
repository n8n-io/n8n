/**
 * Tool-variant node types carry a "Tool"/"HitlTool" suffix (e.g. `openAiTool`),
 * but the gateway config is keyed by the base node type (`openAi`). Mirrors the
 * editor-ui `stripToolSuffix` so backend and frontend agree on lookup fallback.
 */
export function stripToolSuffix(nodeType: string): string {
	return nodeType.replace(/HitlTool$/, '').replace(/Tool$/, '');
}
