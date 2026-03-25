//#region src/utils/env.d.ts
declare global {
  const Deno: {
    version: {
      deno: string;
    };
    env: {
      get: (name: string) => string | undefined;
    };
  } | undefined;
}
declare const isBrowser: () => boolean;
declare const isWebWorker: () => boolean;
declare const isJsDom: () => boolean;
declare const isDeno: () => boolean;
declare const isNode: () => boolean;
declare const getEnv: () => string;
type RuntimeEnvironment = {
  library: string;
  libraryVersion?: string;
  runtime: string;
  runtimeVersion?: string;
};
declare function getRuntimeEnvironment(): RuntimeEnvironment;
declare function getEnvironmentVariable(name: string): string | undefined;
//#endregion
export { RuntimeEnvironment, getEnv, getEnvironmentVariable, getRuntimeEnvironment, isBrowser, isDeno, isJsDom, isNode, isWebWorker };
//# sourceMappingURL=env.d.ts.map