// Standalone validation script — proves the full loop: agent-shaped file
// writes -> sandbox build -> served static app -> browser fetches real data
// from a real n8n workflow execution.
import { SandboxClient } from '@n8n/sandbox-client';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const client = new SandboxClient({
	apiKey: process.env.N8N_SANDBOX_SERVICE_API_KEY ?? 'test',
	baseUrl: process.env.N8N_SANDBOX_SERVICE_URL ?? 'http://localhost:8080',
});

const WORKSPACE = '/home/user/workspace';
const APP_DIR = `${WORKSPACE}/app`;
const WEBHOOK_URL = 'http://localhost:5678/webhook/spike-hello';
const LOCAL_OUT_DIR = path.resolve(process.cwd(), '../../../spike-served-app');

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
	'vite.config.js': `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()], base: './' });\n`,
	'index.html': `<!doctype html>\n<html>\n<head><meta charset="utf-8" /><title>Spike App</title></head>\n<body>\n<div id="root"></div>\n<script type="module" src="/src/main.jsx"></script>\n</body>\n</html>\n`,
	'src/main.jsx': `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App.jsx';\nReactDOM.createRoot(document.getElementById('root')).render(<App />);\n`,
	// This is the piece that matters: real generated code calling back into a
	// real n8n workflow via a plain fetch (standing in for @n8n/app-sdk's
	// runWorkflow() for this spike), and rendering the real response.
	'src/App.jsx': `import { useEffect, useState } from 'react';

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('${WEBHOOK_URL}')
      .then((res) => res.json())
      .then(setData)
      .catch((err) => setError(String(err)));
  }, []);

  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (!data) return <p>Loading real workflow data...</p>;

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>{data.message}</h1>
      <p>Computed at: {data.computedAt}</p>
      <ul>
        {data.records.map((r) => (
          <li key={r.id}>{r.id}: {r.name}</li>
        ))}
      </ul>
      <p style={{ marginTop: 24, color: '#666' }}>
        This page was built by writing files into a sandbox and running
        <code> npm run build</code> there. The data above came from a real
        n8n workflow execution via a plain fetch call, standing in for
        <code> @n8n/app-sdk</code>'s runWorkflow().
      </p>
    </div>
  );
}
`,
};

let sandboxId;
try {
	console.log('[1/6] Creating sandbox...');
	const sandbox = await client.createSandbox();
	sandboxId = sandbox.id;
	console.log('  sandbox id:', sandboxId);

	console.log('[2/6] Writing app files (fetch call baked in)...');
	for (const [rel, content] of Object.entries(files)) {
		const filePath = `${APP_DIR}/${rel}`;
		await client.mkdir(sandboxId, filePath.slice(0, filePath.lastIndexOf('/')), true);
		await client.writeFile(sandboxId, filePath, content, true);
	}

	console.log('[3/6] npm install...');
	const install = await client.exec(sandboxId, {
		command: 'npm install',
		workdir: APP_DIR,
		timeoutMs: 240_000,
	});
	if (!install.success) throw new Error(`npm install failed:\n${install.stderr}`);
	console.log('  ok');

	console.log('[4/6] npm run build...');
	const build = await client.exec(sandboxId, {
		command: 'npm run build',
		workdir: APP_DIR,
		timeoutMs: 120_000,
	});
	if (!build.success) throw new Error(`npm run build failed:\n${build.stderr}`);
	console.log('  ok');

	console.log('[5/6] Copying dist/ out of the sandbox to', LOCAL_OUT_DIR);
	const entries = await client.listFiles(sandboxId, { path: `${APP_DIR}/dist`, recursive: true });
	const fileEntries = entries.filter((e) => !e.isDir);
	await mkdir(LOCAL_OUT_DIR, { recursive: true });
	for (const entry of fileEntries) {
		const remotePath = `${APP_DIR}/dist/${entry.name}`;
		const content = await client.readFile(sandboxId, remotePath);
		const localPath = path.join(LOCAL_OUT_DIR, entry.name);
		await mkdir(path.dirname(localPath), { recursive: true });
		await writeFile(localPath, content);
		console.log('  copied', entry.name);
	}

	console.log('[6/6] Done. Serve locally with:');
	console.log(`  npx serve ${LOCAL_OUT_DIR} -l 4300`);
	console.log('\n✅ Build+extract succeeded. Open the served page in a real browser to confirm the fetch renders real workflow data.');
} catch (error) {
	console.error('\n❌ FAILED:', error);
	process.exitCode = 1;
} finally {
	if (sandboxId) {
		await client.deleteSandbox(sandboxId).catch((e) => console.error('cleanup failed:', e));
	}
}
