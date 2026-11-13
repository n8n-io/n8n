/**
 * Bootstrap of the worker without a startup snapshot. It turns on the V8
 * compile cache before it loads the runtime. The image ships a warm cache.
 */
import * as path from 'node:path';

const nodeModule = require('node:module') as { enableCompileCache?: (dir: string) => unknown };
try {
	nodeModule.enableCompileCache?.(path.join(__dirname, '..', '.compile-cache'));
} catch {
	// The cache is an optimization only.
}

(require('./worker') as typeof import('./worker')).startWorker();
