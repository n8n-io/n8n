// Throwaway spike script: writes files + npm install into an EXISTING sandbox
// (reuses one already created via raw curl so we know its container name).
import { SandboxClient } from '@n8n/sandbox-client';

const client = new SandboxClient({
	apiKey: process.env.N8N_SANDBOX_SERVICE_API_KEY ?? 'test',
	baseUrl: process.env.N8N_SANDBOX_SERVICE_URL ?? 'http://localhost:8080',
});

const sandboxId = process.argv[2];
if (!sandboxId) throw new Error('usage: node spike-scaffold-devserver.mjs <sandboxId>');

const APP_DIR = '/home/user/workspace/devapp';

const files = {
	'package.json': JSON.stringify(
		{
			name: 'spike-dev-app',
			private: true,
			type: 'module',
			scripts: { dev: 'vite --host 0.0.0.0 --port 5173' },
			dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
			devDependencies: { '@vitejs/plugin-react': '^4.3.1', vite: '^5.4.0' },
		},
		null,
		2,
	),
	'vite.config.js': `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()], server: { host: true, port: 5173, strictPort: true } });\n`,
	'index.html': `<!doctype html>\n<html>\n<head><meta charset="utf-8" /><title>HMR Spike</title></head>\n<body>\n<div id="root"></div>\n<script type="module" src="/src/main.jsx"></script>\n</body>\n</html>\n`,
	'src/main.jsx': `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App.jsx';\nReactDOM.createRoot(document.getElementById('root')).render(<App />);\n`,
	'src/App.jsx': `export default function App() {\n  return <h1>HMR spike v1</h1>;\n}\n`,
};

console.log('Writing dev-server app files...');
for (const [rel, content] of Object.entries(files)) {
	const filePath = `${APP_DIR}/${rel}`;
	await client.mkdir(sandboxId, filePath.slice(0, filePath.lastIndexOf('/')), true);
	await client.writeFile(sandboxId, filePath, content, true);
}

console.log('npm install...');
const install = await client.exec(sandboxId, {
	command: 'npm install',
	workdir: APP_DIR,
	timeoutMs: 240_000,
});
console.log('install success:', install.success);
if (!install.success) {
	console.error(install.stderr);
	process.exit(1);
}
console.log('Ready. Start the dev server with the raw-curl fire-and-forget script next.');
