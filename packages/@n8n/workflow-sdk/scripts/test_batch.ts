import { generateWorkflowCode } from '../src/codegen';
import { parseWorkflowCode } from '../src/parse-workflow-code';
import * as fs from 'fs';

// Test a few more skipped workflows
const workflowIds = ['5817'];

for (const id of workflowIds) {
	const workflowPath = `./test-fixtures/real-workflows/${id}.json`;
	if (!fs.existsSync(workflowPath)) {
		console.log(`${id}: file not found`);
		continue;
	}
	const json = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
	const origNodes = json.nodes?.length || 0;
	const origConns = Object.keys(json.connections || {}).length;

	try {
		const code = generateWorkflowCode(json);
		const parsed = parseWorkflowCode(code);
		const parsedNodes = parsed.nodes?.length || 0;
		const parsedConns = Object.keys(parsed.connections || {}).length;

		const origKeys = Object.keys(json.connections || {}).sort();
		const parsedKeys = Object.keys(parsed.connections || {}).sort();

		if (origNodes === parsedNodes && origConns === parsedConns) {
			if (JSON.stringify(origKeys) === JSON.stringify(parsedKeys)) {
				console.log(`${id}: ✅ PASS (nodes: ${origNodes}, conns: ${origConns})`);
			} else {
				console.log(`${id}: ⚠️ KEY MISMATCH`);
				console.log('Original keys:', origKeys);
				console.log('Parsed keys:', parsedKeys);
				console.log(
					'Missing:',
					origKeys.filter((k) => !parsedKeys.includes(k)),
				);
				console.log(
					'Extra:',
					parsedKeys.filter((k) => !origKeys.includes(k)),
				);
			}
		} else {
			console.log(
				`${id}: ❌ MISMATCH (nodes: ${origNodes} vs ${parsedNodes}, conns: ${origConns} vs ${parsedConns})`,
			);
		}
	} catch (e: unknown) {
		console.log(`${id}: ❌ ERROR - ${(e as Error).message}`);
	}
}
