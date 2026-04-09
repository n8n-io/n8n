import { t as BindingBuiltinPluginName } from "./binding-BKL2JHoJ.mjs";

//#region src/log/logging.d.ts
type LogLevel = "info" | "debug" | "warn";
type LogLevelOption = LogLevel | "silent";
type LogLevelWithError = LogLevel | "error";
interface RollupLog {
  binding?: string;
  cause?: unknown;
  code?: string;
  exporter?: string;
  frame?: string;
  hook?: string;
  id?: string;
  ids?: string[];
  loc?: {
    column: number;
    file?: string;
    line: number;
  };
  message: string;
  meta?: any;
  names?: string[];
  plugin?: string;
  pluginCode?: unknown;
  pos?: number;
  reexporter?: string;
  stack?: string;
  url?: string;
}
type RollupLogWithString = RollupLog | string;
interface RollupError extends RollupLog {
  name?: string;
  stack?: string;
  watchFiles?: string[];
}
type LogOrStringHandler = (level: LogLevelWithError, log: RollupLogWithString) => void;
//#endregion
//#region src/types/utils.d.ts
type MaybePromise<T> = T | Promise<T>;
type NullValue<T = void> = T | undefined | null | void;
type PartialNull<T> = { [P in keyof T]: T[P] | null };
type MakeAsync<Function_> = Function_ extends ((this: infer This, ...parameters: infer Arguments) => infer Return) ? (this: This, ...parameters: Arguments) => Return | Promise<Return> : never;
type MaybeArray<T> = T | T[];
type StringOrRegExp = string | RegExp;
//#endregion
//#region src/log/log-handler.d.ts
type LoggingFunction = (log: RollupLog | string | (() => RollupLog | string)) => void;
type LoggingFunctionWithPosition = (log: RollupLog | string | (() => RollupLog | string), pos?: number | {
  column: number;
  line: number;
}) => void;
type WarningHandlerWithDefault = (warning: RollupLog, defaultHandler: LoggingFunction) => void;
//#endregion
//#region src/builtin-plugin/utils.d.ts
declare class BuiltinPlugin {
  name: BindingBuiltinPluginName;
  _options?: unknown;
  constructor(name: BindingBuiltinPluginName, _options?: unknown);
}
//#endregion
export { MakeAsync as a, NullValue as c, LogLevel as d, LogLevelOption as f, RollupLogWithString as g, RollupLog as h, WarningHandlerWithDefault as i, PartialNull as l, RollupError as m, LoggingFunction as n, MaybeArray as o, LogOrStringHandler as p, LoggingFunctionWithPosition as r, MaybePromise as s, BuiltinPlugin as t, StringOrRegExp as u };