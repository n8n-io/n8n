// Demo: replay a recorded CU fixture bundle through the FixtureAdapter — no
// browser, extension, CDP, or daemon. Usage: node replay-fixture-demo.mjs <bundle.json>
import { readFileSync } from 'node:fs';
import { createBrowserTools } from './dist/index.js';

const bundle = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const { tools, connection } = createBrowserTools({ adapter: 'fixture' }, { fixtures: bundle });
await connection.connect();

console.log(`bundle: states=${bundle.states.length}  initial=${bundle.initialStateId}  source=${bundle.sourceThreadId ?? '-'}`);
const snapshot = tools.find((t) => t.name === 'browser_snapshot');
const res = await snapshot.execute({}, { dir: '/tmp' });
const tree = res.structuredContent?.snapshot ?? '';
console.log(`\n>>> browser_snapshot replayed (NO real browser). tree length = ${tree.length}`);
console.log(`>>> first lines of the REAL recorded page the agent would see:\n`);
console.log(tree.split('\n').slice(0, 12).join('\n'));
await connection.disconnect();
