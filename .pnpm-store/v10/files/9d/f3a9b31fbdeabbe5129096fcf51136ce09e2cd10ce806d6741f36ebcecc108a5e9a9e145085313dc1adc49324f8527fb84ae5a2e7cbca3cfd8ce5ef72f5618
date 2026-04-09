// Type definitions for logform 2.x
// Project: https://github.com/winstonjs/logform
// Definitions by: DABH <https://github.com/DABH>
// Definitions: https://github.com/winstonjs/logform
// TypeScript Version: 2.2
import {LEVEL, MESSAGE, SPLAT} from 'triple-beam'

export interface TransformableInfo {
  level: string;
  message: unknown;
  [LEVEL]?: string;
  [MESSAGE]?: unknown;
  [SPLAT]?: unknown;
  [key: string | symbol]: unknown;
}

export type TransformFunction = (info: TransformableInfo, opts?: unknown) => TransformableInfo | boolean;
export type Colors = { [key: string]: string | string[] }; // tslint:disable-line interface-over-type-literal
export type FormatWrap = (opts?: unknown) => Format;

export class Format {
  constructor(opts?: object);

  options?: object;
  transform: TransformFunction;
}

export class Colorizer extends Format {
  constructor(opts?: object);

  createColorize: (opts?: object) => Colorizer;
  addColors: (colors: Colors) => Colors;
  colorize: (level: string, message: string) => string;
}

export function format(transform: TransformFunction): FormatWrap;

export function levels(config: object): object;

export namespace format {
  function align(): Format;
  function cli(opts?: CliOptions): Format;
  function colorize(opts?: ColorizeOptions): Colorizer;
  function combine(...formats: Format[]): Format;
  function errors(opts?: object): Format;
  function json(opts?: JsonOptions): Format;
  function label(opts?: LabelOptions): Format;
  function logstash(): Format;
  function metadata(opts?: MetadataOptions): Format;
  function ms(): Format;
  function padLevels(opts?: PadLevelsOptions): Format;
  function prettyPrint(opts?: PrettyPrintOptions): Format;
  function printf(templateFunction: (info: TransformableInfo) => string): Format;
  function simple(): Format;
  function splat(): Format;
  function timestamp(opts?: TimestampOptions): Format;
  function uncolorize(opts?: UncolorizeOptions): Format;
}

export interface CliOptions extends ColorizeOptions, PadLevelsOptions { }

export interface ColorizeOptions {
  /**
   * If set to `true` the color will be applied to the `level`.
   */
  level?: boolean;
  /**
   * If set to `true` the color will be applied to the `message` and `level`.
   */
  all?: boolean;
  /**
   * If set to `true` the color will be applied to the `message`.
   */
  message?: boolean;
  /**
   * An object containing the colors for the log levels. For example: `{ info: 'blue', error: 'red' }`.
   */
  colors?: Record<string, string | string[]>;
}

export interface JsonOptions {
  /**
   * A function that influences how the `info` is stringified.
   */
  replacer?: (this: unknown, key: string, value: unknown) => unknown;
  /**
   * The number of white space used to format the json.
   */
  space?: number;

  // The following options come from safe-stable-stringify
  // https://github.com/BridgeAR/safe-stable-stringify/blob/main/index.d.ts

  /**
   * If `true`, bigint values are converted to a number. Otherwise, they are ignored.
   * This option is ignored by default as Logform stringifies BigInt in the default replacer.
   * @default true
   */
  bigint?: boolean,
  /**
   * Defines the value for circular references.
   * Set to `undefined`, circular properties are not serialized (array entries are replaced with null).
   * Set to `Error`, to throw on circular references.
   * @default "[Circular]"
   */
  circularValue?: string | null | TypeErrorConstructor | ErrorConstructor,
  /**
   * If `true`, guarantee a deterministic key order instead of relying on the insertion order.
   * @default true
   */
  deterministic?: boolean,
  /**
   * Maximum number of entries to serialize per object (at least one).
   * The serialized output contains information about how many entries have not been serialized.
   * Ignored properties are counted as well (e.g., properties with symbol values).
   * Using the array replacer overrules this option.
   * @default Infinity
   */
  maximumBreadth?: number,
  /**
   * Maximum number of object nesting levels (at least 1) that will be serialized.
   * Objects at the maximum level are serialized as `"[Object]"` and arrays as `"[Array]"`.
   * @default Infinity
   */
  maximumDepth?: number,
}

export interface LabelOptions {
  /**
   * A label to be added before the message.
   */
  label?: string;
  /**
   * If set to `true` the `label` will be added to `info.message`. If set to `false` the `label`
   * will be added as `info.label`.
   */
  message?: boolean;
}

export interface MetadataOptions {
  /**
   * The name of the key used for the metadata object. Defaults to `metadata`.
   */
  key?: string;
  /**
   * An array of keys that should not be added to the metadata object.
   */
  fillExcept?: string[];
  /**
   * An array of keys that will be added to the metadata object.
   */
  fillWith?: string[];
}

export interface PadLevelsOptions {
  /**
   * Log levels. Defaults to `configs.npm.levels` from [triple-beam](https://github.com/winstonjs/triple-beam)
   * module.
   */
  levels?: Record<string, number>;
}

export interface PrettyPrintOptions {
  /**
   * A `number` that specifies the maximum depth of the `info` object being stringified by
   * `util.inspect`. Defaults to `2`.
   */
  depth?: number;
  /**
   * Colorizes the message if set to `true`. Defaults to `false`.
   */
  colorize?: boolean;
}

export interface TimestampOptions {
  /**
   * Either the format as a string accepted by the [fecha](https://github.com/taylorhakes/fecha)
   * module or a function that returns a formatted date. If no format is provided `new
   * Date().toISOString()` will be used.
   */
  format?: string | (() => string);
  /**
   * The name of an alias for the timestamp property, that will be added to the `info` object.
   */
  alias?: string;
}

export interface UncolorizeOptions {
  /**
   * Disables the uncolorize format for `info.level` if set to `false`.
   */
  level?: boolean;
  /**
   * Disables the uncolorize format for `info.message` if set to `false`.
   */
  message?: boolean;
  /**
   * Disables the uncolorize format for `info[MESSAGE]` if set to `false`.
   */
  raw?: boolean;
}
