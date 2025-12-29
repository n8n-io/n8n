import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const INPUT_FILE = path.join(
	__dirname,
	'packages',
	'nodes-base',
	'assets',
	'ai_marketing_blueprints',
	'PRZ_SORA_STUDIO_n8n_converted.json',
);
const OUTPUT_FILE = path.join(
	__dirname,
	'packages',
	'nodes-base',
	'assets',
	'ai_marketing_blueprints',
	'PRZ_GOOGLE_VEO_STUDIO_v1.0.json',
);

function migrateToGoogle() {
	console.log('🔄 Migrating Sora Flow to Google Veo...');

	if (!fs.existsSync(INPUT_FILE)) {
		console.error('Source workflow not found.');
		return;
	}

	const workflow = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

	// Update Workflow Name
	workflow.name = 'PRZ_GOOGLE_VEO_STUDIO_v1.0';
	workflow.versionId = crypto.randomUUID();

	// Iterate Nodes to find Sora and Replace
	workflow.nodes = workflow.nodes.map((node: any) => {
		if (node.id === 'sora_create_video' || node.name === 'sora_create_video') {
			console.log('   Found Sora Node. Transforming to Google Veo...');

			node.name = 'google_veo_create_video';
			node.parameters = {
				url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-ultra:generateContent?key={{ $env.VITE_GOOGLE_VERTEX_KEY }}',
				method: 'POST',
				authentication: 'header',
				headerParameters: {
					parameters: [
						{
							name: 'Authorization',
							value: 'Bearer {{ $env.VITE_GOOGLE_VERTEX_KEY }}',
						},
					],
				},
				body: '{\n  "instances": [\n    {\n      "prompt": "{{compiled_prompt}}",\n      "negative_prompt": "distorted, blurry, low quality",\n      "frame_rate": 24\n    }\n  ],\n  "parameters": {\n    "sampleCount": 1,\n    "aspectRatio": "16:9"\n  }\n}',
				jsonParameters: true,
			};
		}

		// Update Downstream references (Node Names changed)
		// Note: Simple find/replace in names might break connections if connections map by name.
		// We'll update the name property, but we must also update the connections object.
		return node;
	});

	// Update Connections to point to new node name
	const newConnections: any = {};
	Object.keys(workflow.connections).forEach((key) => {
		let newKey = key === 'sora_create_video' ? 'google_veo_create_video' : key;

		newConnections[newKey] = { main: [] };

		// Loop through outputs
		workflow.connections[key].main.forEach((outputArray: any[]) => {
			const newOutputArray = outputArray.map((conn: any) => {
				if (conn.node === 'sora_create_video') conn.node = 'google_veo_create_video';
				return conn;
			});
			newConnections[newKey].main.push(newOutputArray);
		});
	});

	workflow.connections = newConnections;

	fs.writeFileSync(OUTPUT_FILE, JSON.stringify(workflow, null, 2));
	console.log(`✅ Migration Complete: ${OUTPUT_FILE}`);
}

migrateToGoogle();
