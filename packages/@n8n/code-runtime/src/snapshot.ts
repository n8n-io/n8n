/**
 * Entry of the V8 startup snapshot (`node --build-snapshot`). It loads the
 * runtime into the heap at build time. A worker that starts from the snapshot
 * skips the module load, which is most of the start time of a worker.
 *
 * The snapshot is built from a single bundled file, because a snapshot entry
 * can only require built-in modules. Run with:
 *   node --snapshot-blob snapshot.blob <runtime dir>
 */
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { startupSnapshot } from 'node:v8';

// A snapshot cannot hold a `node:vm` context. n8n-workflow creates one at
// import for its regex engine, so hide `node:vm` while the modules load and
// create the engine again after the start.
const getBuiltinModule = process.getBuiltinModule;
process.getBuiltinModule = ((id: string) =>
	id === 'node:vm' || id === 'vm' ? undefined : getBuiltinModule(id)) as typeof getBuiltinModule;
/* eslint-disable @typescript-eslint/no-require-imports */
const runTaskModule = require('./run-task') as typeof import('./run-task');
const workerModule = require('./worker') as typeof import('./worker');
const workflowModule = require('n8n-workflow') as typeof import('n8n-workflow');
/* eslint-enable @typescript-eslint/no-require-imports */
process.getBuiltinModule = getBuiltinModule;

startupSnapshot.setDeserializeMainFunction(() => {
	workflowModule.resetSafeRegexEngine();
	// User code resolves modules (for example moment) from the runtime folder.
	const runtimeDir = process.argv[1] ?? '/opt/n8n-code-runtime';
	runTaskModule.setUserRequire(createRequire(path.join(runtimeDir, 'package.json')));
	workerModule.startWorker();
});
