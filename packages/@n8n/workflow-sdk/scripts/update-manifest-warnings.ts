import * as fs from 'fs';
import * as path from 'path';
import { generateWorkflowCode } from '../src/codegen/index';
import { parseWorkflowCodeToBuilder } from '../src/parse-workflow-code';

const manifestPath = path.join(__dirname, '../test-fixtures/real-workflows/manifest.json');
const workflowsDir = path.join(__dirname, '../test-fixtures/real-workflows');

interface ManifestWorkflow {
	id: number;
	name: string;
	success: boolean;
	expectedWarnings?: Array<{ code: string; nodeName: string }>;
}

interface Manifest {
	fetchedAt: string;
	workflows: ManifestWorkflow[];
}

const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

let updated = 0;

for (const entry of manifest.workflows) {
	if (!entry.success) continue;

	const workflowPath = path.join(workflowsDir, `${entry.id}.json`);
	if (!fs.existsSync(workflowPath)) continue;

	try {
		const json = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
		const code = generateWorkflowCode(json);
		const builder = parseWorkflowCodeToBuilder(code);
		const result = builder.validate();

		const actualWarnings = result.warnings
			.map((w) => ({
				code: w.code,
				nodeName: w.nodeName,
			}))
			.sort((a, b) =>
				`${a.code}:${a.nodeName ?? ''}`.localeCompare(`${b.code}:${b.nodeName ?? ''}`),
			);

		// Check if warnings changed
		const expectedStr = JSON.stringify(entry.expectedWarnings || []);
		const actualStr = JSON.stringify(actualWarnings);

		if (expectedStr !== actualStr) {
			console.log(`Updating ${entry.id}: ${entry.name}`);
			if (actualWarnings.length > 0) {
				entry.expectedWarnings = actualWarnings;
			} else {
				delete entry.expectedWarnings;
			}
			updated++;
		}
	} catch {
		// Skip errors
	}
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t') + '\n');
console.log(`Updated ${updated} workflows`);
