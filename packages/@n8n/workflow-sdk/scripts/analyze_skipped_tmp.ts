import * as fs from 'fs';
import * as path from 'path';
import { generateWorkflowCode } from '../src/codegen';
import { parseWorkflowCode } from '../src/parse-workflow-code';
import type { WorkflowJSON } from '../src/types/base';

// Skipped workflows to analyze
const SKIP_IDS = ['2519', '2878', '5374', '5683', '5851', '6993', '10132', '3790', '4005'];

const FIXTURES_DIR = path.resolve(__dirname, '../test-fixtures/real-workflows');

function analyzeWorkflow(id: string) {
	const filePath = path.join(FIXTURES_DIR, `${id}.json`);
	if (!fs.existsSync(filePath)) {
		return { id, error: 'File not found' };
	}

	const json = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WorkflowJSON;

	try {
		const code = generateWorkflowCode(json);
		try {
			const parsed = parseWorkflowCode(code);

			// Compare nodes and connections
			const origNodeCount = json.nodes.length;
			const parsedNodeCount = parsed.nodes.length;

			// Count non-empty connections
			const countConns = (conns: Record<string, any>) => {
				let count = 0;
				for (const [src, types] of Object.entries(conns)) {
					for (const [type, outputs] of Object.entries(types as Record<string, any>)) {
						if (!Array.isArray(outputs)) continue;
						for (const targets of outputs) {
							if (targets && Array.isArray(targets) && targets.length > 0) {
								count += targets.length;
							}
						}
					}
				}
				return count;
			};

			const origConns = countConns(json.connections);
			const parsedConns = countConns(parsed.connections);

			// Find missing nodes
			const origNames = new Set(json.nodes.map((n) => n.name));
			const parsedNames = new Set(parsed.nodes.map((n) => n.name));
			const missing = [...origNames].filter((n) => !parsedNames.has(n));
			const extra = [...parsedNames].filter((n) => !origNames.has(n));

			if (origNodeCount === parsedNodeCount && origConns === parsedConns && missing.length === 0) {
				return { id, status: 'MIGHT_PASS', nodes: origNodeCount, conns: origConns };
			}

			return {
				id,
				status: 'MISMATCH',
				nodes: `${origNodeCount} vs ${parsedNodeCount}`,
				conns: `${origConns} vs ${parsedConns}`,
				missing: missing.slice(0, 3),
				extra: extra.slice(0, 3),
			};
		} catch (parseErr: any) {
			return { id, error: 'Parse error', message: parseErr.message?.slice(0, 150) };
		}
	} catch (genErr: any) {
		return { id, error: 'Generation error', message: genErr.message?.slice(0, 150) };
	}
}

for (const id of SKIP_IDS) {
	console.log(JSON.stringify(analyzeWorkflow(id), null, 2));
	console.log('---');
}
