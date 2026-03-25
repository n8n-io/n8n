"use strict";Object.defineProperty(exports, "__esModule", {value: true});// src/utils/hasConfigurableGlobal.ts
function hasConfigurableGlobal(propertyName) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, propertyName);
  if (typeof descriptor === "undefined") {
    return false;
  }
  if (typeof descriptor.get === "function" && typeof descriptor.get() === "undefined") {
    return false;
  }
  if (typeof descriptor.get === "undefined" && descriptor.value == null) {
    return false;
  }
  if (typeof descriptor.set === "undefined" && !descriptor.configurable) {
    console.error(
      `[MSW] Failed to apply interceptor: the global \`${propertyName}\` property is non-configurable. This is likely an issue with your environment. If you are using a framework, please open an issue about this in their repository.`
    );
    return false;
  }
  return true;
}



exports.hasConfigurableGlobal = hasConfigurableGlobal;
//# sourceMappingURL=chunk-PFGO5BSM.js.map