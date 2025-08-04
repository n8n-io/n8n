'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.cleanup = exports.init = exports.touchFile = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const fs_1 = require('fs');
const promises_1 = require('fs/promises');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const path_1 = require('path');
const touchFile = async (filePath) => {
	await (0, promises_1.mkdir)((0, path_1.dirname)(filePath), { recursive: true });
	const time = new Date();
	try {
		await (0, promises_1.utimes)(filePath, time, time);
	} catch {
		const fd = await (0, promises_1.open)(filePath, 'w');
		await fd.close();
	}
};
exports.touchFile = touchFile;
const { n8nFolder } = di_1.Container.get(n8n_core_1.InstanceSettings);
const journalFile = (0, path_1.join)(n8nFolder, 'crash.journal');
const init = async () => {
	if (!backend_common_1.inProduction) return;
	if ((0, fs_1.existsSync)(journalFile)) {
		di_1.Container.get(backend_common_1.Logger).error('Last session crashed');
		await (0, n8n_workflow_1.sleep)(10_000);
	}
	await (0, exports.touchFile)(journalFile);
};
exports.init = init;
const cleanup = async () => {
	await (0, promises_1.rm)(journalFile, { force: true });
};
exports.cleanup = cleanup;
//# sourceMappingURL=crash-journal.js.map
