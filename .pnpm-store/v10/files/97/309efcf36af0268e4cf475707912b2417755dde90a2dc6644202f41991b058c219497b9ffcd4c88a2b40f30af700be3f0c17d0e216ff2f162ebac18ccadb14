/*
  Copyright © 2019 Andrew Powell

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of this Source Code Form.
*/

import * as postcss from "postcss";

// Even though the concrete classes extend PostCSS classes, we can't extend
// PostCSS Node types here because they refer to statements that aren't
// compatible with our value nodes. This unfortunately means that we need to
// replicate a bunch of PostCSS's method declarations here.

export interface NodeBase {
  // Inherited from postcss.ContainerBase, but with our Node type.
  next(): ChildNode | void;
  prev(): ChildNode | void;
  before(newNode: ChildNode | object | string | ChildNode[]): this;
  after(newNode: ChildNode | object | string | ChildNode[]): this;
  root(): Root;
  replaceWith(...nodes: Array<ChildNode | object>): this;

  // Inherited from postcss.ContainerBase with no changes.
  source?: postcss.Source;
  raws: any;
  toString(stringifier?: Stringifier | Syntax): string;
  error(
    message: string,
    options?: postcss.NodeErrorOptions
  ): postcss.CssSyntaxError;
  warn(
    result: postcss.Result,
    text: string,
    opts?: postcss.WarningOptions
  ): void;
  remove(): this;
  clone(overrides?: object): this;
  cloneBefore(overrides?: object): this;
  cloneAfter(overrides?: object): this;
  raw(prop: string, defaultType?: string): any;
}

export interface ContainerBase extends NodeBase {
  walkFuncs(callback: (decl: Func, index: number) => any): boolean | void;
  walkInterpolations(
    callback: (interpolation: Interpolation, index: number) => any
  ): boolean | void;
  walkNumerics(
    callback: (numeric: Numeric, index: number) => any
  ): boolean | void;
  walkOperators(
    callback: (operator: Operator, index: number) => any
  ): boolean | void;
  walkPunctuations(
    callback: (punctuation: Punctuation, index: number) => any
  ): boolean | void;
  walkQuoteds(callback: (quoted: Quoted, index: number) => any): boolean | void;
  walkUnicodeRanges(
    callback: (unicodeRange: UnicodeRange, index: number) => any
  ): boolean | void;
  walkWords(callback: (word: Word, index: number) => any): boolean | void;
  walkType(
    type: string,
    callback: (node: ChildNode, index: number) => any
  ): boolean | void;

  // Inherited from postcss.ContainerBase, but with our Node type.
  nodes: ChildNode[];
  first?: ChildNode;
  last?: ChildNode;
  index(child: ChildNode | number): number;
  every(
    callback: (node: ChildNode, index: number, nodes: ChildNode[]) => any,
    thisArg?: any
  ): boolean;
  some(
    callback: (node: ChildNode, index: number, nodes: ChildNode[]) => boolean,
    thisArg?: any
  ): boolean;
  each(callback: (node: ChildNode, index: number) => any): boolean | void;
  walk(callback: (node: ChildNode, index: number) => any): boolean | void;
  walkAtWords(callback: (atWord: AtWord, index: number) => any): boolean | void;
  walkComments(
    callback: (comment: Comment, index: number) => any
  ): boolean | void;
  prepend(...nodes: Array<ChildNode | object | string>): this;
  append(...nodes: Array<ChildNode | object | string>): this;
  insertBefore(
    oldNode: ChildNode | number,
    newNode: ChildNode | object | string
  ): this;
  insertAfter(
    oldNode: ChildNode | number,
    newNode: ChildNode | object | string
  ): this;
  removeChild(child: ChildNode | number): this;

  // Inherited from postcss.ContainerBase with no changes.
  clone(overrides?: object): this;
  remove(): this;
  removeAll(): this;
}

export interface Root extends ContainerBase {
  type: "root";
  parent: undefined;
  toResult(options?: {
    to?: string;
    map?: postcss.SourceMapOptions;
  }): postcss.Result;
}

export type Node = Root | ChildNode;

export type ChildNode =
  | AtWord
  | Comment
  | Func
  | Interpolation
  | Numeric
  | Operator
  | Punctuation
  | Quoted
  | UnicodeRange
  | Word;

export type Container = Root | Func | Interpolation;

export interface AtWord extends ContainerBase {
  type: "atrule";
  parent: Container;
  name: string;
  params: string;
}

export interface Comment extends NodeBase {
  type: "comment";
  parent: Container;
  inline: boolean;
  text: string;
}

export interface Func extends ContainerBase {
  type: "func";
  parent: Container;
  isColor: boolean;
  isVar: boolean;
  name: string;
  params: string;
}

export interface Interpolation extends ContainerBase {
  type: "interpolation";
  parent: Container;
  params: string;
  prefix: string;
}

export interface Numeric extends NodeBase {
  type: "numeric";
  parent: Container;
  unit: string;
  value: string;
}

export interface Operator extends NodeBase {
  type: "operator";
  parent: Container;
  value: string;
}

export interface Punctuation extends NodeBase {
  type: "punctuation";
  parent: Container;
  value: string;
}

export interface Quoted extends NodeBase {
  type: "quoted";
  parent: Container;
  quote: string;
  value: string;
  contents: string;
}

export interface UnicodeRange extends NodeBase {
  type: "unicodeRange";
  parent: Container;
  name: string;
}

export interface Word extends NodeBase {
  type: "word";
  parent: Container;
  isColor: boolean;
  isHex: boolean;
  isUrl: boolean;
  isVariable: boolean;
  value: string;
}

export function parse(css: string, options?: ParseOptions): Root;

export interface ParseOptions {
  ignoreUnknownWords?: boolean;
  interpolation?: boolean | InterpolationOptions;
  variables?: VariablesOptions;
}

export interface InterpolationOptions {
  prefix: string;
}

export interface VariablesOptions {
  prefixes: string[];
}

interface Syntax {
  stringify?: Stringifier;
}

interface Builder {
  (part: string, node?: Node, type?: "start" | "end"): void;
}

export interface Stringifier {
  (node: Node, builder: Builder): void;
}

export const stringify: Stringifier;

export function nodeToString(node: Node): string;
