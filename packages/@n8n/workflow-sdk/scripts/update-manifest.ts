/**
 * Script to update manifest files with expectedWarnings for workflows
 * that were previously in SKIP_VALIDATION_WORKFLOWS
 *
 * Run: npx ts-node scripts/update-manifest.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface ExpectedWarning {
	code: string;
	nodeName?: string;
}

// Expected warnings from the validation script output
const expectedWarningsMap: Record<string, ExpectedWarning[]> = {
	'2878': [],
	'3066': [
		{ code: 'DISCONNECTED_NODE', nodeName: 'Google Gemini LLM' },
		{ code: 'DISCONNECTED_NODE', nodeName: 'gpt-4o' },
		{ code: 'DISCONNECTED_NODE', nodeName: 'pollinations.ai' },
		{ code: 'DISCONNECTED_NODE', nodeName: 'Approve Final Post Content' },
		{ code: 'DISCONNECTED_NODE', nodeName: 'Image Choice' },
		{ code: 'AGENT_NO_SYSTEM_MESSAGE', nodeName: 'Prepare Content Review Email' },
		{ code: 'AGENT_NO_SYSTEM_MESSAGE', nodeName: 'Prepare Results Email' },
		{ code: 'AGENT_NO_SYSTEM_MESSAGE', nodeName: 'Prepare Results Message' },
	],
	'3121': [],
	'3442': [],
	'4295': [{ code: 'DISCONNECTED_NODE', nodeName: 'Variables' }],
	'4557': [],
	'4696': [],
	'4767': [
		{ code: 'HARDCODED_CREDENTIALS', nodeName: 'Create VEO3 Video' },
		{ code: 'HARDCODED_CREDENTIALS', nodeName: 'Check VEO3 Status' },
		{ code: 'HARDCODED_CREDENTIALS', nodeName: 'Get VEO3 Video URL' },
	],
	'4975': [
		{ code: 'AGENT_NO_SYSTEM_MESSAGE', nodeName: 'Email Agent' },
		{ code: 'AGENT_NO_SYSTEM_MESSAGE', nodeName: 'Shortlist Agent' },
		{ code: 'AGENT_NO_SYSTEM_MESSAGE', nodeName: 'Book Meeting' },
		{ code: 'AGENT_NO_SYSTEM_MESSAGE', nodeName: 'Attendance Agent' },
		{ code: 'AGENT_NO_SYSTEM_MESSAGE', nodeName: 'Leave Agent' },
	],
	'5303': [{ code: 'AGENT_NO_SYSTEM_MESSAGE', nodeName: 'SEO analyst' }],
	'5453': [],
	'5745': [],
	'5805': [
		{ code: 'DISCONNECTED_NODE', nodeName: 'Script mapping' },
		{ code: 'DISCONNECTED_NODE', nodeName: 'Create Script' },
	],
	'5851': [],
	'6897': [{ code: 'AGENT_NO_SYSTEM_MESSAGE', nodeName: 'Qualify CV Agent' }],
	'6993': [],
	'7946': [],
	'7957': [{ code: 'AGENT_STATIC_PROMPT', nodeName: 'AI Agent' }],
	'8591': [{ code: 'TOOL_NO_PARAMETERS', nodeName: 'Think' }],
	'9200': [
		{ code: 'TOOL_NO_PARAMETERS', nodeName: 'Think' },
		{ code: 'TOOL_NO_PARAMETERS', nodeName: 'Think1' },
	],
	'9999': [
		{ code: 'AGENT_NO_SYSTEM_MESSAGE', nodeName: 'AI Feedback Triage' },
		{ code: 'MISSING_EXPRESSION_PREFIX', nodeName: 'Sticky Note2' },
		{ code: 'MISSING_EXPRESSION_PREFIX', nodeName: 'Sticky Note6' },
	],
	'10132': [],
	'10196': [],
	'10476': [],
	'12462': [{ code: 'HARDCODED_CREDENTIALS', nodeName: 'Merge 3 Videos' }],
	'12645': [
		{ code: 'HARDCODED_CREDENTIALS', nodeName: 'NanoBanana: Create Image' },
		{ code: 'HARDCODED_CREDENTIALS', nodeName: 'Download Edited Image' },
	],
};

interface ManifestWorkflow {
	id: number;
	name: string;
	success?: boolean;
	expectedWarnings?: ExpectedWarning[];
}

interface Manifest {
	fetchedAt?: string;
	description?: string;
	workflows: ManifestWorkflow[];
}

function warningKey(w: ExpectedWarning): string {
	return w.code + ':' + (w.nodeName || '');
}

function updateManifest(manifestPath: string) {
	const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
	let updated = 0;

	for (const workflow of manifest.workflows) {
		const id = String(workflow.id);
		if (expectedWarningsMap[id] !== undefined) {
			const existingWarnings = workflow.expectedWarnings || [];
			const newWarnings = expectedWarningsMap[id];

			// Merge warnings (avoid duplicates)
			const existingKeys = new Set(existingWarnings.map(warningKey));
			const mergedWarnings = [...existingWarnings];

			for (const w of newWarnings) {
				if (!existingKeys.has(warningKey(w))) {
					mergedWarnings.push(w);
				}
			}

			if (mergedWarnings.length > 0) {
				workflow.expectedWarnings = mergedWarnings;
			} else {
				delete workflow.expectedWarnings;
			}
			updated++;
		}
	}

	fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t') + '\n');
	console.log('Updated ' + updated + ' workflows in ' + manifestPath);
}

const fixturesDir = path.join(__dirname, '..', 'test-fixtures');
const realManifest = path.join(fixturesDir, 'real-workflows', 'manifest.json');

if (fs.existsSync(realManifest)) {
	updateManifest(realManifest);
}
