/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export declare const arrayBufferEquality: (
  a: unknown,
  b: unknown,
) => boolean | undefined;

export declare function emptyObject(obj: unknown): boolean;

export declare const equals: EqualsFunction;

export declare type EqualsFunction = (
  a: unknown,
  b: unknown,
  customTesters?: Array<Tester>,
  strictCheck?: boolean,
) => boolean;

export declare const getObjectSubset: (
  object: any,
  subset: any,
  customTesters?: Array<Tester>,
  seenReferences?: WeakMap<object, boolean>,
) => any;

declare type GetPath = {
  hasEndProp?: boolean;
  endPropIsDefined?: boolean;
  lastTraversedObject: unknown;
  traversedPath: Array<string>;
  value?: unknown;
};

export declare const getPath: (
  object: Record<string, any>,
  propertyPath: string | Array<string>,
) => GetPath;

export declare function isA<T>(typeName: string, value: unknown): value is T;

export declare const isError: (value: unknown) => value is Error;

export declare const isOneline: (
  expected: unknown,
  received: unknown,
) => boolean;

export declare const iterableEquality: (
  a: any,
  b: any,
  customTesters?: Array<Tester>,
  aStack?: Array<any>,
  bStack?: Array<any>,
) => boolean | undefined;

export declare const partition: <T>(
  items: T[],
  predicate: (arg: T) => boolean,
) => [T[], T[]];

export declare const pathAsArray: (propertyPath: string) => Array<any>;

export declare const sparseArrayEquality: (
  a: unknown,
  b: unknown,
  customTesters?: Array<Tester>,
) => boolean | undefined;

export declare const subsetEquality: (
  object: unknown,
  subset: unknown,
  customTesters?: Array<Tester>,
) => boolean | undefined;

export declare type Tester = (
  this: TesterContext,
  a: any,
  b: any,
  customTesters: Array<Tester>,
) => boolean | undefined;

export declare interface TesterContext {
  equals: EqualsFunction;
}

export declare const typeEquality: (a: any, b: any) => boolean | undefined;

export {};
