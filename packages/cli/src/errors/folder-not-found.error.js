'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.FolderNotFoundError = void 0;
const n8n_workflow_1 = require('n8n-workflow');
class FolderNotFoundError extends n8n_workflow_1.OperationalError {
	constructor(folderId) {
		super(`Could not find the folder: ${folderId}`, {
			level: 'warning',
		});
	}
}
exports.FolderNotFoundError = FolderNotFoundError;
//# sourceMappingURL=folder-not-found.error.js.map
