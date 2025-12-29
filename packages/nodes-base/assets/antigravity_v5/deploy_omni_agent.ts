import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * DEPLOY_OMNI_AGENT.TS
 *
 * Configures and exports the Omni-Architect Agent workflow for n8n import.
 *
 * Usage:
 *   NOTION_DB_ID=xxxxx npx tsx deploy_omni_agent.ts
 */

// --- Configuration ---
const NOTION_DB_ID = process.env.NOTION_DB_ID;
const AGENT_FILE = 'omni_agent.json';
const OUTPUT_FILE = 'omni_agent_configured.json';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Main ---
async function deploy() {
	console.log('🚀 Deploying Omni-Architect Agent...');

	// 1. Pre-Flight Check
	if (!NOTION_DB_ID) {
		console.error('❌ ERROR: Missing NOTION_DB_ID environment variable.');
		console.error('   Usage: NOTION_DB_ID=your_db_id npx tsx deploy_omni_agent.ts');
		process.exit(1);
	}

	// 2. Load Workflow
	const agentPath = path.join(__dirname, AGENT_FILE);
	const rawWorkflow = fs.readFileSync(agentPath, 'utf8');
	const workflow = JSON.parse(rawWorkflow);

	console.log(`✅ Loaded workflow: ${workflow.name}`);

	// 3. Find Notion Trigger Node
	const notionNode = workflow.nodes.find((n: any) => n.type === 'n8n-nodes-base.notionTrigger');
	if (!notionNode) {
		throw new Error('Could not find Notion Trigger node in workflow.');
	}

	// 4. Inject Configuration
	const oldDbId = notionNode.parameters.databaseId;
	notionNode.parameters.databaseId = NOTION_DB_ID;
	console.log(
		`✅ Configured Notion Trigger (DB ID: ${oldDbId.substring(0, 15)}... -> ${NOTION_DB_ID.substring(0, 15)}...)`,
	);

	// 5. Save Configured Workflow
	const outputPath = path.join(__dirname, OUTPUT_FILE);
	fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));
	console.log(`✅ Configured workflow saved to: ${OUTPUT_FILE}`);

	console.log('\n--- NEXT STEPS ---');
	console.log('1. Import this workflow into n8n via the UI or CLI.');
	console.log('   - n8n CLI: `n8n import:workflow --input=omni_agent_configured.json`');
	console.log('2. Ensure n8n API Credentials are configured.');
	console.log('3. Activate the workflow.');
}

deploy().catch((err) => {
	console.error('❌ Deployment Failed:', err);
	process.exit(1);
});
