import * as fs from 'fs';
import * as path from 'path';
import { generateWorkflowCode } from '../src/codegen';
import { parseWorkflowCode } from '../src/parse-workflow-code';
import type { WorkflowJSON } from '../src/types/base';

const FIXTURES_DIR = path.resolve(__dirname, '../test-fixtures/real-workflows');
const ID = process.argv[2] || '2519';

const filePath = path.join(FIXTURES_DIR, `${ID}.json`);
const json = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WorkflowJSON;

const code = generateWorkflowCode(json);
console.log('Generated code:');
console.log(code);
console.log('\n--- PARSING ---\n');

const parsed = parseWorkflowCode(code);

// Find missing connections
console.log('MISSING CONNECTIONS:');
for (const [src, types] of Object.entries(json.connections)) {
	for (const [type, outputs] of Object.entries(types as Record<string, any>)) {
		if (type !== 'main') continue; // Only check main connections
		if (!Array.isArray(outputs)) continue;

		for (let outIdx = 0; outIdx < outputs.length; outIdx++) {
			const targets = outputs[outIdx];
			if (!targets || !Array.isArray(targets)) continue;

			for (const t of targets) {
				// Check if this connection exists in parsed
				const parsedSrc = parsed.connections[src];
				const parsedOutputs = parsedSrc?.[type];
				const found = parsedOutputs?.[outIdx]?.some((p: any) => p.node === t.node);

				if (!found) {
					console.log(`  ${src}[${outIdx}] -> ${t.node} (MISSING)`);
				}
			}
		}
	}
}
