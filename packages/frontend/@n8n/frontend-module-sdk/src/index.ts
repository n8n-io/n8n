export type * from './types';

export { defineFrontendModule } from './defineFrontendModule';
export { assertUniqueRouteNames } from './routeNames';
export { declareCapability } from './declareCapability';

export * as modalRegistry from './registries/modalRegistry';
export * from './registries/resourceRegistry';
export * as pushHandlerRegistry from './registries/pushHandlerRegistry';
export * as commandRegistry from './registries/commandRegistry';
export * as componentRegistry from './registries/componentRegistry';
export * as parameterInputRegistry from './registries/parameterInputRegistry';
export * as capabilityRegistry from './registries/capabilityRegistry';

// Namespaced so a token does not clash with a same-named local const in the shell.
export * as capabilities from './capabilities';
