/**
 * Disclaimer: modules in _shims aren't intended to be imported by SDK users.
 */
import * as shims from './registry.mjs';
import * as auto from "./auto/runtime";
export const init = () => {
  if (!shims.kind) shims.setShims(auto.getRuntime(), { auto: true });
};
export * from './registry.mjs';

init();
