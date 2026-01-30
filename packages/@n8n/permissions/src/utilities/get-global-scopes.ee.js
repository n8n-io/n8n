'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getGlobalScopes = void 0;
const getGlobalScopes = (principal) => principal.role.scopes.map((scope) => scope.slug) ?? [];
exports.getGlobalScopes = getGlobalScopes;
//# sourceMappingURL=get-global-scopes.ee.js.map
