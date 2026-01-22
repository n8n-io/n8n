import * as fs from 'fs';
import * as path from 'path';
import { generateWorkflowCode } from '../src/codegen';
import { parseWorkflowCode } from '../src/parse-workflow-code';

const IDS = ['6524', '8721', '4987', '9999'];
const FIXTURES_DIR = path.resolve(__dirname, '../test-fixtures/real-workflows');

function analyzeWorkflow(id: string) {
	const filePath = path.join(FIXTURES_DIR, `${id}.json`);
	if (!fs.existsSync(filePath)) return { id, status: 'NOT_FOUND' };

	const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

	try {
		const code = generateWorkflowCode(json);
		try {
			const parsed = parseWorkflowCode(code);

			const origKeys = new Set(Object.keys(json.connections || {}));
			const parsedKeys = new Set(Object.keys(parsed.connections || {}));

			const missingKeys: string[] = [];
			for (const k of origKeys) if (!parsedKeys.has(k)) missingKeys.push(k);

			const extraKeys: string[] = [];
			for (const k of parsedKeys) if (!origKeys.has(k)) extraKeys.push(k);

			return {
				id,
				status: missingKeys.length === 0 && extraKeys.length === 0 ? 'PASS' : 'FAIL',
				missingKeys,
				extraKeys,
			};
		} catch (parseErr: unknown) {
			const err = parseErr as Error;
			return { id, status: 'PARSE_ERROR', message: err.message?.slice(0, 80) };
		}
	} catch (genErr: unknown) {
		const err = genErr as Error;
		return { id, status: 'GEN_ERROR', message: err.message?.slice(0, 80) };
	}
}

for (const id of IDS) {
	console.log(JSON.stringify(analyzeWorkflow(id), null, 2));
}
