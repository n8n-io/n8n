import fs from 'fs';
import path from 'path';

// --- Type Definitions ---

interface N8nAgentParameters {
	modelId?: string;
	systemMessage?: string;
	maxIterations?: number;
	[key: string]: unknown;
}

interface N8nNode {
	parameters: N8nAgentParameters;
	type: string;
	typeVersion: number;
	position: [number, number];
	id?: string;
	name: string;
}

interface N8nWorkflow {
	name: string;
	nodes: N8nNode[];
	connections: Record<string, unknown>;
	[key: string]: unknown;
}

// --- Configuration ---

const PROMPT_FILE = 'google_cloud_master_prompt.md';
const AGENT_FILE = 'omni_agent.json';
const PROMPT_PATH = path.join(__dirname, PROMPT_FILE);
const AGENT_PATH = path.join(__dirname, AGENT_FILE);

// --- Main Execution ---

async function deploy() {
	console.log('🚀 Starting Deployment Injection...');

	try {
		// 1. Pre-Flight Checks
		if (!fs.existsSync(PROMPT_PATH)) {
			throw new Error(`Master Prompt file not found at: ${PROMPT_PATH}`);
		}
		if (!fs.existsSync(AGENT_PATH)) {
			throw new Error(`Agent Definition file not found at: ${AGENT_PATH}`);
		}

		// 2. Read Assets
		const promptContent = fs.readFileSync(PROMPT_PATH, 'utf8');
		console.log(`✅ Read Master Prompt (${promptContent.length} bytes)`);

		const rawAgent = fs.readFileSync(AGENT_PATH, 'utf8');
		const agentDef: N8nWorkflow = JSON.parse(rawAgent);
		console.log(`✅ Read Omni Agent Definition`);

		// 3. Find Target Node
		const aiNode = agentDef.nodes.find((n) => n.type === 'n8n-nodes-base.aiAgent');
		if (!aiNode) {
			throw new Error('Could not find node of type "n8n-nodes-base.aiAgent" in JSON');
		}

		// 4. Inject Content
		const oldLength = aiNode.parameters.systemMessage?.length || 0;
		aiNode.parameters.systemMessage = promptContent;
		aiNode.name = 'Omni-Architect Prime [Google Vertex]';

		console.log(`✅ Injected Prompt (Size Diff: ${oldLength} -> ${promptContent.length})`);

		// 5. Atomic Write
		fs.writeFileSync(AGENT_PATH, JSON.stringify(agentDef, null, 2));
		console.log(`✅ DEPLOYED: Successfully updated '${AGENT_FILE}'`);
		console.log(`   Target Node: ${aiNode.name}`);
	} catch (error) {
		console.error('❌ DEPLOYMENT FAILED');
		if (error instanceof Error) {
			console.error(`   Reason: ${error.message}`);
		} else {
			console.error(`   Unknown Error: ${error}`);
		}
		process.exit(1);
	}
}

deploy();
