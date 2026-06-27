/**
 * Maps workflow review anchors (node id + optional JSON path) to 1-based line
 * numbers in an exported `workflows/*.json` file (`JSON.stringify(_, null, 2)`).
 */
export function findLineInWorkflowJson(
	content: string,
	anchor: { nodeId: string; jsonPath?: string },
): number | null {
	const lines = content.split('\n');
	const nodeIdLineIndex = findNodeIdLineIndex(lines, anchor.nodeId);
	if (nodeIdLineIndex === -1) return null;

	if (!anchor.jsonPath) {
		return findNodeObjectStartLineIndex(lines, nodeIdLineIndex, anchor.nodeId) + 1;
	}

	const lastKey = anchor.jsonPath.split('.').filter(Boolean).at(-1);
	if (!lastKey) return nodeIdLineIndex + 1;

	const keyPattern = new RegExp(`"${escapeRegExp(lastKey)}"\\s*:`);
	const searchStart = Math.max(0, nodeIdLineIndex - 50);
	const searchEnd = Math.min(lines.length, nodeIdLineIndex + 20);

	for (let i = nodeIdLineIndex; i >= searchStart; i--) {
		if (keyPattern.test(lines[i])) return i + 1;
	}
	for (let i = nodeIdLineIndex + 1; i < searchEnd; i++) {
		if (keyPattern.test(lines[i])) return i + 1;
	}

	return nodeIdLineIndex + 1;
}

function findNodeIdLineIndex(lines: string[], nodeId: string): number {
	const idPattern = new RegExp(`"id"\\s*:\\s*"${escapeRegExp(nodeId)}"`);
	return lines.findIndex((line) => idPattern.test(line));
}

/** Opening `{` line of the node object containing `nodeId`. */
function findNodeObjectStartLineIndex(
	lines: string[],
	nodeIdLineIndex: number,
	nodeId: string,
): number {
	const idPattern = new RegExp(`"id"\\s*:\\s*"${escapeRegExp(nodeId)}"`);

	for (let lineIndex = nodeIdLineIndex; lineIndex >= 0; lineIndex--) {
		if (!/^\s*\{\s*,?\s*$/.test(lines[lineIndex])) continue;

		const segment = lines.slice(lineIndex, nodeIdLineIndex + 1).join('\n');
		if (idPattern.test(segment)) return lineIndex;
	}

	return nodeIdLineIndex;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
