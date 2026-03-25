/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type {SnapshotFormat} from '@jest/schemas';

export declare type Colors = {
  comment: {
    close: string;
    open: string;
  };
  content: {
    close: string;
    open: string;
  };
  prop: {
    close: string;
    open: string;
  };
  tag: {
    close: string;
    open: string;
  };
  value: {
    close: string;
    open: string;
  };
};

export declare type CompareKeys =
  | ((a: string, b: string) => number)
  | null
  | undefined;

export declare type Config = {
  callToJSON: boolean;
  compareKeys: CompareKeys;
  colors: Colors;
  escapeRegex: boolean;
  escapeString: boolean;
  indent: string;
  maxDepth: number;
  maxWidth: number;
  min: boolean;
  plugins: Plugins;
  printBasicPrototype: boolean;
  printFunctionName: boolean;
  spacingInner: string;
  spacingOuter: string;
};

export declare const DEFAULT_OPTIONS: {
  callToJSON: true;
  compareKeys: undefined;
  escapeRegex: false;
  escapeString: true;
  highlight: false;
  indent: number;
  maxDepth: number;
  maxWidth: number;
  min: false;
  plugins: never[];
  printBasicPrototype: true;
  printFunctionName: true;
  theme: Required<
    Partial<{
      readonly comment: string;
      readonly content: string;
      readonly prop: string;
      readonly tag: string;
      readonly value: string;
    }>
  >;
};

/**
 * Returns a presentation string of your `val` object
 * @param val any potential JavaScript object
 * @param options Custom settings
 */
declare function format(val: unknown, options?: OptionsReceived): string;
export default format;
export {format};

declare type Indent = (arg0: string) => string;

export declare type NewPlugin = {
  serialize: (
    val: any,
    config: Config,
    indentation: string,
    depth: number,
    refs: Refs,
    printer: Printer,
  ) => string;
  test: Test;
};

export declare type OldPlugin = {
  print: (
    val: unknown,
    print: Print,
    indent: Indent,
    options: PluginOptions,
    colors: Colors,
  ) => string;
  test: Test;
};

export declare interface Options
  extends Omit<RequiredOptions, 'compareKeys' | 'theme'> {
  compareKeys: CompareKeys;
  theme: Required<RequiredOptions['theme']>;
}

export declare type OptionsReceived = PrettyFormatOptions;

declare type Plugin_2 = NewPlugin | OldPlugin;
export {Plugin_2 as Plugin};

declare type PluginOptions = {
  edgeSpacing: string;
  min: boolean;
  spacing: string;
};

export declare type Plugins = Array<Plugin_2>;

export declare const plugins: {
  AsymmetricMatcher: NewPlugin;
  DOMCollection: NewPlugin;
  DOMElement: NewPlugin;
  Immutable: NewPlugin;
  ReactElement: NewPlugin;
  ReactTestComponent: NewPlugin;
};

export declare interface PrettyFormatOptions
  extends Omit<SnapshotFormat, 'compareKeys'> {
  compareKeys?: CompareKeys;
  plugins?: Plugins;
}

declare type Print = (arg0: unknown) => string;

export declare type Printer = (
  val: unknown,
  config: Config,
  indentation: string,
  depth: number,
  refs: Refs,
  hasCalledToJSON?: boolean,
) => string;

export declare type Refs = Array<unknown>;

declare type RequiredOptions = Required<PrettyFormatOptions>;

declare type Test = (arg0: any) => boolean;

export declare type Theme = Options['theme'];

export {};
