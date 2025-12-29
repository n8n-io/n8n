import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables strictly from the local .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Allow all CORS for dev convenience
app.use(express.json());

// API: Get Keys
app.get('/api/keys', (req, res) => {
	const keys = [];

	// Note: These env vars must match what is in the .env file (NO VITE_ prefix)
	if (process.env.N8N_CORE_KEY) {
		keys.push({
			id: '1',
			name: 'Root Admin Access',
			service: 'n8n Core',
			key: process.env.N8N_CORE_KEY,
			status: 'Active',
			created: new Date().toISOString().split('T')[0],
		});
	}
	if (process.env.NOTION_KEY) {
		keys.push({
			id: '2',
			name: 'Master Control DB',
			service: 'Notion API',
			key: process.env.NOTION_KEY,
			status: 'Active',
			created: new Date().toISOString().split('T')[0],
		});
	}
	if (process.env.GOOGLE_VERTEX_KEY) {
		keys.push({
			id: '3',
			name: 'Omni Agent Brain',
			service: 'Google Vertex (Gemini)',
			key: process.env.GOOGLE_VERTEX_KEY,
			status: 'Active',
			created: new Date().toISOString().split('T')[0],
		});
	}
	if (process.env.OPENAI_SORA_KEY) {
		keys.push({
			id: '4',
			name: 'God Mode (Physics Engine)',
			service: 'OpenAI SORA 2',
			key: process.env.OPENAI_SORA_KEY,
			status: 'Active',
			created: new Date().toISOString().split('T')[0],
		});
	}
	if (process.env.GOOGLE_VEO_KEY) {
		keys.push({
			id: '5',
			name: 'God Mode (Director)',
			service: 'Google VEO 3.1',
			key: process.env.GOOGLE_VEO_KEY,
			status: 'Active',
			created: new Date().toISOString().split('T')[0],
		});
	}
	if (process.env.PARALLEL_WEB_SYSTEMS_KEY) {
		keys.push({
			id: '6',
			name: 'Parallel Web Systems',
			service: 'PWS API',
			key: process.env.PARALLEL_WEB_SYSTEMS_KEY,
			status: 'Active',
			created: new Date().toISOString().split('T')[0],
		});
	}

	res.json(keys);
});

// Start Server
app.listen(PORT, () => {
	console.log(`bff_server_running: http://localhost:${PORT}`);
});
