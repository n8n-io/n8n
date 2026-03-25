import { r as runBaseTests } from '../chunks/base.DslwPSCy.js';
import { a as createThreadsRpcOptions } from '../chunks/utils.BfxieIyZ.js';
import 'vite-node/client';
import '../chunks/execute.BpmIjFTD.js';
import 'node:fs';
import 'node:url';
import 'node:vm';
import '@vitest/utils/error';
import 'pathe';
import 'vite-node/utils';
import '../path.js';
import 'node:path';
import '@vitest/mocker';
import 'node:module';
import '@vitest/utils';
import '../chunks/utils.CgTj3MsC.js';

class ThreadsBaseWorker {
	getRpcOptions(ctx) {
		return createThreadsRpcOptions(ctx);
	}
	runTests(state) {
		return runBaseTests("run", state);
	}
	collectTests(state) {
		return runBaseTests("collect", state);
	}
}
const worker = new ThreadsBaseWorker();

export { worker as default };
