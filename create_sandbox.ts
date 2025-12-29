import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const PROD_FILE = path.join(
	__dirname,
	'packages',
	'nodes-base',
	'assets',
	'ai_marketing_blueprints',
	'PRZ_GOOGLE_VEO_STUDIO_v1.0.json',
);
const SANDBOX_FILE = path.join(
	__dirname,
	'packages',
	'nodes-base',
	'assets',
	'ai_marketing_blueprints',
	'PRZ_GOOGLE_VEO_STUDIO_SANDBOX.json',
);

function createSandbox() {
	console.log('🧪 Creating Dev-Level Sandbox Environment...');

	if (!fs.existsSync(PROD_FILE)) {
		console.error('Production workflow not found.');
		return;
	}

	const workflow = JSON.parse(fs.readFileSync(PROD_FILE, 'utf8'));

	// 1. Rename Identity
	workflow.name = 'PRZ_GOOGLE_VEO_STUDIO_SANDBOX';
	workflow.versionId = crypto.randomUUID();

	// 2. Mock The Expensive/External Nodes
	workflow.nodes = workflow.nodes.map((node: any) => {
		// Mock Veo Video Generation
		if (node.name === 'google_veo_create_video') {
			console.log('   - Mocking Veo Rendering Node');
			// Change type to 'n8n-nodes-base.set' to return fake data
			node.type = 'n8n-nodes-base.set';
			node.typeVersion = 1;
			node.parameters = {
				values: {
					string: [
						{
							name: 'video_url',
							value: 'https://storage.googleapis.com/prz-sandbox/mock_render_001.mp4',
						},
						{ name: 'job_id', value: 'SANDBOX-JOB-{{$rand}}' },
						{ name: 'status', value: 'COMPLETED_MOCK' },
						{ name: 'cost', value: '$0.00 (Sandbox)' },
					],
				},
			};
			// Clear credentials
			delete node.credentials;
		}

		// Mock Gemini Trend Scan (Optional, but saves API calls)
		if (node.name === 'gemini_trend_scan') {
			console.log('   - Mocking Gemini Trend Scan');
			node.type = 'n8n-nodes-base.set';
			node.typeVersion = 1;
			node.parameters = {
				values: {
					string: [
						{
							name: 'trend_insights',
							value: 'SIMULATED TREND: Cyberpunk aesthetics are trending up +400%.',
						},
						{ name: 'recommended_keywords', value: 'neon, chrome, rain, synthwave' },
					],
				},
			};
			delete node.credentials;
		}

		return node;
	});

	fs.writeFileSync(SANDBOX_FILE, JSON.stringify(workflow, null, 2));
	console.log(`✅ Sandbox Environment Created: ${SANDBOX_FILE}`);
}

createSandbox();
