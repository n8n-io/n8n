// src/middleware/context-storage/index.ts
import { AsyncLocalStorage } from "node:async_hooks";
var asyncLocalStorage = new AsyncLocalStorage();
var contextStorage = () => {
  return async function contextStorage2(c, next) {
    await asyncLocalStorage.run(c, next);
  };
};
var tryGetContext = () => {
  return asyncLocalStorage.getStore();
};
var getContext = () => {
  const context = tryGetContext();
  if (!context) {
    throw new Error("Context is not available");
  }
  return context;
};
export {
  contextStorage,
  getContext,
  tryGetContext
};
