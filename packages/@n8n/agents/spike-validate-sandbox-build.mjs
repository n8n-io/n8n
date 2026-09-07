// Standalone validation script — NOT part of the feature.
// Proves/disproves the riskiest assumption in the Apps plan: can the real
// n8n-sandbox-service actually run `npm install && npm run build` for a
// minimal Vite+React app? Run against a locally-running sandbox stack:
//   node spike-validate-sandbox-build.mjs
import { SandboxClient } from '@n8n/sandbox-client';

const client = new SandboxClient({
	apiKey: process.env.N8N_SANDBOX_SERVICE_API_KEY ?? 'n8n-sandbox-ci-key',
	baseUrl: process.env.N8N_SANDBOX_SERVICE_URL ?? 'http://localhost:8080',
});

const WORKSPACE = '/home/user/workspace';
const APP_DIR = `${WORKSPACE}/app`;

const files = {
	'package.json': JSON.stringify(
		{
			name: 'spike-app',
			private: true,
			type: 'module',
			scripts: { build: 'vite build' },
			dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
			devDependencies: { '@vitejs/plugin-react': '^4.3.1', vite: '^5.4.0' },
		},
		null,
		2,
	),
	'vite.config.js': `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n`,
	'index.html': `<!doctype html>\n<html>\n<head><meta charset="utf-8" /><title>Spike App</title></head>\n<body>\n<div id="root"></div>\n<script type="module" src="/src/main.jsx"></script>\n</body>\n</html>\n`,
	'src/main.jsx': `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App.jsx';\nReactDOM.createRoot(document.getElementById('root')).render(<App />);\n`,
	'src/App.jsx': `export default function App() {\n  return <h1>Hello from the sandbox-built spike app</h1>;\n}\n`,
};

let sandboxId;
try {
	console.log('[1/5] Creating sandbox...');
	const sandbox = await client.createSandbox();
	sandboxId = sandbox.id;
	console.log('  sandbox id:', sandboxId);

	console.log('[2/5] Writing app files...');
	for (const [rel, content] of Object.entries(files)) {
		const path = `${APP_DIR}/${rel}`;
		await client.mkdir(sandboxId, path.slice(0, path.lastIndexOf('/')), true);
		await client.writeFile(sandboxId, path, content, true);
		console.log('  wrote', rel);
	}

	console.log('[3/5] Running npm install (this may take a while)...');
	const install = await client.exec(sandboxId, {
		command: 'npm install',
		workdir: APP_DIR,
		timeoutMs: 240_000,
		onStdout: (d) => process.stdout.write(d),
		onStderr: (d) => process.stderr.write(d),
	});
	console.log('  install exit code:', install.exitCode, 'success:', install.success);
	if (!install.success) throw new Error('npm install failed');

	console.log('[4/5] Running npm run build...');
	const build = await client.exec(sandboxId, {
		command: 'npm run build',
		workdir: APP_DIR,
		timeoutMs: 120_000,
		onStdout: (d) => process.stdout.write(d),
		onStderr: (d) => process.stderr.write(d),
	});
	console.log('  build exit code:', build.exitCode, 'success:', build.success);
	if (!build.success) throw new Error('npm run build failed');

	console.log('[5/5] Listing dist/ output...');
	const distFiles = await client.listFiles(sandboxId, { path: `${APP_DIR}/dist`, recursive: true });
	console.log('  dist files:', distFiles.map((f) => f.name));

	const indexHtml = await client.readFile(sandboxId, `${APP_DIR}/dist/index.html`);
	console.log('  dist/index.html (first 300 chars):\n', indexHtml.toString('utf8').slice(0, 300));

	console.log('\n✅ HYPOTHESIS CONFIRMED: the sandbox can build a real Vite+React app.');
} catch (error) {
	console.error('\n❌ HYPOTHESIS FAILED:', error);
	process.exitCode = 1;
} finally {
	if (sandboxId) {
		console.log('Cleaning up sandbox', sandboxId);
		await client.deleteSandbox(sandboxId).catch((e) => console.error('cleanup failed:', e));
	}
}
