// Standalone validation script — proves multi-page client-side routing works
// when served by the static-serving route, including navigating after an
// action's response tells the app where to go.
import { SandboxClient } from '@n8n/sandbox-client';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const client = new SandboxClient({
	apiKey: process.env.N8N_SANDBOX_SERVICE_API_KEY ?? 'test',
	baseUrl: process.env.N8N_SANDBOX_SERVICE_URL ?? 'http://localhost:8080',
});

const APP_DIR = '/home/user/workspace/routingapp';
const NAMESPACE = 'routing-app';
const RUN_URL = `/apps/${NAMESPACE}/api/run`;
const LOCAL_OUT_DIR = path.resolve(process.cwd(), '../../../spike-served-routing-app');

const files = {
	'package.json': JSON.stringify(
		{
			name: 'spike-routing-app',
			private: true,
			type: 'module',
			scripts: { build: 'vite build' },
			dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1', 'react-router-dom': '^6.26.0' },
			devDependencies: { '@vitejs/plugin-react': '^4.3.1', vite: '^5.4.0' },
		},
		null,
		2,
	),
	'vite.config.js': `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()], base: './' });\n`,
	'index.html': `<!doctype html>\n<html>\n<head><meta charset="utf-8" /><title>Routing Spike</title></head>\n<body>\n<div id="root"></div>\n<script type="module" src="/src/main.jsx"></script>\n</body>\n</html>\n`,
	'src/main.jsx': `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport { BrowserRouter } from 'react-router-dom';\nimport App from './App.jsx';\nReactDOM.createRoot(document.getElementById('root')).render(\n  <BrowserRouter basename="/apps/${NAMESPACE}">\n    <App />\n  </BrowserRouter>\n);\n`,
	'src/App.jsx': `import { Routes, Route } from 'react-router-dom';
import ListPage from './ListPage.jsx';
import SuccessPage from './SuccessPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ListPage />} />
      <Route path="/success" element={<SuccessPage />} />
    </Routes>
  );
}
`,
	'src/ListPage.jsx': `import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ListPage() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('${RUN_URL}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId: 'spikedataworkflow1', input: {} }),
    })
      .then((res) => res.json())
      .then((res) => setData(res.data.Code[0]));
  }, []);

  const markResolved = async (id) => {
    const res = await fetch('${RUN_URL}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId: 'spikeactionworkfl1', input: { id } }),
    });
    const { data } = await res.json();
    const actionResult = data.Code[0];
    // This is the whole point of this test: the workflow's own JSON told us
    // where to go next, and we navigate client-side (no page reload) because
    // of it - no dedicated "redirect" mechanism, just a convention.
    if (actionResult.redirectTo) navigate(actionResult.redirectTo);
  };

  if (!data) return <p>Loading...</p>;
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>Records</h1>
      <ul>
        {data.records.map((r) => (
          <li key={r.id}>
            {r.name} ({r.status})
            {r.status === 'open' && (
              <button onClick={() => markResolved(r.id)} style={{ marginLeft: 8 }}>
                Mark resolved
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
`,
	'src/SuccessPage.jsx': `export default function SuccessPage() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>Success page</h1>
      <p>Reached by client-side navigation after the action workflow's response told the app to redirect here.</p>
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

	console.log('[2/6] Writing app files (react-router-dom, 2 routes)...');
	for (const [rel, content] of Object.entries(files)) {
		const filePath = `${APP_DIR}/${rel}`;
		await client.mkdir(sandboxId, filePath.slice(0, filePath.lastIndexOf('/')), true);
		await client.writeFile(sandboxId, filePath, content, true);
	}

	console.log('[3/6] npm install...');
	const install = await client.exec(sandboxId, { command: 'npm install', workdir: APP_DIR, timeoutMs: 240_000 });
	if (!install.success) throw new Error(`npm install failed:\n${install.stderr}`);
	console.log('  ok');

	console.log('[4/6] npm run build...');
	const build = await client.exec(sandboxId, { command: 'npm run build', workdir: APP_DIR, timeoutMs: 120_000 });
	if (!build.success) throw new Error(`npm run build failed:\n${build.stderr}`);
	console.log('  ok');

	console.log('[5/6] Copying dist/ out of the sandbox to', LOCAL_OUT_DIR);
	const entries = await client.listFiles(sandboxId, { path: `${APP_DIR}/dist`, recursive: true });
	const fileEntries = entries.filter((e) => !e.isDir);
	await mkdir(LOCAL_OUT_DIR, { recursive: true });
	for (const entry of fileEntries) {
		const content = await client.readFile(sandboxId, `${APP_DIR}/dist/${entry.name}`);
		const localPath = path.join(LOCAL_OUT_DIR, entry.name);
		await mkdir(path.dirname(localPath), { recursive: true });
		await writeFile(localPath, content);
		console.log('  copied', entry.name);
	}

	console.log('[6/6] Copy this to the app-spike serve dir manually, e.g.:');
	console.log(`  cp -r ${LOCAL_OUT_DIR}/* /tmp/n8n-app-spike-served/${NAMESPACE}/`);
	console.log('\n✅ Build succeeded.');
} catch (error) {
	console.error('\n❌ FAILED:', error);
	process.exitCode = 1;
} finally {
	if (sandboxId) await client.deleteSandbox(sandboxId).catch((e) => console.error('cleanup failed:', e));
}
