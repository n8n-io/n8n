import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '../test-fixtures/real-workflows');
const id = process.argv[2] || '6524';

const filePath = path.join(FIXTURES_DIR, `${id}.json`);
const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

// Build nodeInfoMap-like structure
interface NodeInfo {
	outgoingConnections: Map<number, Array<{ to: string; inputIndex: number }>>;
}

const nodeInfoMap = new Map<string, NodeInfo>();

// Build connections map
for (const [src, conns] of Object.entries(json.connections || {})) {
	const nodeInfo: NodeInfo = { outgoingConnections: new Map() };
	const mainConns = (conns as Record<string, unknown[][]>).main || [];
	for (let outputIdx = 0; outputIdx < mainConns.length; outputIdx++) {
		const targets = mainConns[outputIdx] || [];
		nodeInfo.outgoingConnections.set(
			outputIdx,
			targets.map((t: unknown) => ({
				to: (t as { node: string }).node,
				inputIndex: (t as { index: number }).index || 0,
			})),
		);
	}
	nodeInfoMap.set(src, nodeInfo);
}

// Check isNodeReachableFrom
function isNodeReachableFrom(
	startNodeName: string,
	targetNodeName: string,
	addedNodes: Set<string>,
): boolean {
	const visited = new Set<string>();
	const stack = [startNodeName];

	while (stack.length > 0) {
		const current = stack.pop()!;
		if (current === targetNodeName) return true;
		if (visited.has(current)) continue;
		visited.add(current);

		const currentInfo = nodeInfoMap.get(current);
		if (!currentInfo) continue;

		for (const [, targets] of currentInfo.outgoingConnections) {
			for (const target of targets) {
				if (!visited.has(target.to) && !addedNodes.has(target.to)) {
					stack.push(target.to);
				}
			}
		}
	}
	return false;
}

// Find all fan-outs and check for shared targets
console.log('Checking fan-outs for shared targets...\n');
for (const [src, conns] of Object.entries(json.connections || {})) {
	const mainConns = (conns as Record<string, unknown[][]>).main || [];
	for (let outputIdx = 0; outputIdx < mainConns.length; outputIdx++) {
		const targets = mainConns[outputIdx] || [];
		if (targets.length > 1) {
			console.log(
				`Fan-out found: ${src}[${outputIdx}] -> ${targets.map((t: unknown) => (t as { node: string }).node)}`,
			);

			// Check for shared targets (like my code does)
			const addedNodes = new Set<string>([src]);
			for (const target of targets) {
				const targetName = (target as { node: string }).node;
				for (const otherTarget of targets) {
					const otherName = (otherTarget as { node: string }).node;
					if (otherName === targetName) continue;

					// Check if target is reachable from otherTarget
					const reachable = isNodeReachableFrom(otherName, targetName, addedNodes);
					if (reachable) {
						console.log(`  -> SHARED TARGET: ${targetName} is reachable from ${otherName}`);
					}
				}
			}
		}
	}
}
