Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const carrier = require('./carrier.js');
const scope = require('./scope.js');

/** Get the default current scope. */
function getDefaultCurrentScope() {
  return carrier.getGlobalSingleton('defaultCurrentScope', () => new scope.Scope());
}

/** Get the default isolation scope. */
function getDefaultIsolationScope() {
  return carrier.getGlobalSingleton('defaultIsolationScope', () => new scope.Scope());
}

exports.getDefaultCurrentScope = getDefaultCurrentScope;
exports.getDefaultIsolationScope = getDefaultIsolationScope;
//# sourceMappingURL=defaultScopes.js.map
