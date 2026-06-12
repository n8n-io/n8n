'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.combineScopes = combineScopes;
function combineScopes(userScopes, masks) {
	const maskedScopes = Object.fromEntries(Object.entries(userScopes).map((e) => [e[0], [...e[1]]]));
	if (masks?.sharing) {
		if (maskedScopes.project) {
			maskedScopes.project = maskedScopes.project.filter((v) => masks.sharing.includes(v));
		}
		if (maskedScopes.resource) {
			maskedScopes.resource = maskedScopes.resource.filter((v) => masks.sharing.includes(v));
		}
	}
	return new Set(Object.values(maskedScopes).flat());
}
//# sourceMappingURL=combine-scopes.ee.js.map
