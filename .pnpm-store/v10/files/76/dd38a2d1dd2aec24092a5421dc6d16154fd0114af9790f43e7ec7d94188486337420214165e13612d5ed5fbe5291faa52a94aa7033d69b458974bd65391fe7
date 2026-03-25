import { r as BindingBuiltinPluginName } from "./binding-BTw1cXhU.mjs";

//#region src/types/utils.d.ts
type MaybePromise<T> = T | Promise<T>;
type NullValue<T = void> = T | undefined | null | void;
type PartialNull<T> = { [P in keyof T]: T[P] | null };
type MakeAsync<Function_> = Function_ extends ((this: infer This, ...parameters: infer Arguments) => infer Return) ? (this: This, ...parameters: Arguments) => Return | Promise<Return> : never;
type MaybeArray<T> = T | T[];
type StringOrRegExp = string | RegExp;
//#endregion
//#region src/builtin-plugin/utils.d.ts
declare class BuiltinPlugin {
  name: BindingBuiltinPluginName;
  _options?: unknown;
  constructor(name: BindingBuiltinPluginName, _options?: unknown);
}
//#endregion
export { NullValue as a, MaybePromise as i, MakeAsync as n, PartialNull as o, MaybeArray as r, StringOrRegExp as s, BuiltinPlugin as t };