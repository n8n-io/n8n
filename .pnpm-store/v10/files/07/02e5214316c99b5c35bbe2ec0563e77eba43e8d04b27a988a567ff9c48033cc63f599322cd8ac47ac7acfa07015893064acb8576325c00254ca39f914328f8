import { AsyncLocalStorageInterface } from "./globals.cjs";

//#region src/singletons/async_local_storage/index.d.ts
declare class MockAsyncLocalStorage implements AsyncLocalStorageInterface {
  getStore(): any;
  run<T>(_store: any, callback: () => T): T;
  enterWith(_store: any): undefined;
}
declare class AsyncLocalStorageProvider {
  getInstance(): AsyncLocalStorageInterface;
  getRunnableConfig(): any;
  runWithConfig<T>(config: any, callback: () => T, avoidCreatingRootRunTree?: boolean): T;
  initializeGlobalInstance(instance: AsyncLocalStorageInterface): void;
}
declare const AsyncLocalStorageProviderSingleton: AsyncLocalStorageProvider;
//#endregion
export { AsyncLocalStorageProviderSingleton, MockAsyncLocalStorage };
//# sourceMappingURL=index.d.cts.map