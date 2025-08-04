'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SourceControlContext = void 0;
const permissions_1 = require('@n8n/permissions');
class SourceControlContext {
	constructor(userInternal) {
		this.userInternal = userInternal;
	}
	get user() {
		return this.userInternal;
	}
	hasAccessToAllProjects() {
		return (0, permissions_1.hasGlobalScope)(this.userInternal, 'project:update');
	}
}
exports.SourceControlContext = SourceControlContext;
//# sourceMappingURL=source-control-context.js.map
