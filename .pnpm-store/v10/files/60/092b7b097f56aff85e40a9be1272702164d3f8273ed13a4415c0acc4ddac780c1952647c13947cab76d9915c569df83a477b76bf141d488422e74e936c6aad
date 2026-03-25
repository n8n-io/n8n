export declare enum SelectorType {
  ENV = "env",
  CONFIG = "shared config entry",
}
export declare const stringUnionSelector: <U extends object, K extends keyof U>(
  obj: Record<string, string | undefined>,
  key: string,
  union: U,
  type: SelectorType
) => U[K] | undefined;
