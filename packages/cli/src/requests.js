'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.hasSharing = hasSharing;
function hasSharing(workflows) {
	return workflows.some((w) => 'shared' in w);
}
//# sourceMappingURL=requests.js.map
