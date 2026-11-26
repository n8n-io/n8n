/** Entry of the V8 startup snapshot. A process that starts from it skips loading the runtime modules. */
import { startupSnapshot } from 'node:v8';

// A snapshot cannot hold a `vm` context. n8n-workflow creates one at import for its
// regex engine, so hide `vm` while the modules load and create the engine at start.
const getBuiltinModule = process.getBuiltinModule;
process.getBuiltinModule = (id: string) =>
	id === 'node:vm' || id === 'vm' ? undefined : getBuiltinModule(id);
/* eslint-disable @typescript-eslint/no-require-imports -- imports would load before `vm` is hidden */
const workflow = require('n8n-workflow') as typeof import('n8n-workflow');
const runtime = require('./index') as typeof import('./index');
/* eslint-enable @typescript-eslint/no-require-imports */
process.getBuiltinModule = getBuiltinModule;

startupSnapshot.setDeserializeMainFunction(() => {
	workflow.resetSafeRegexEngine();
	runtime.startRuntime();
});
