/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export declare function extract(contents: string): string;

export declare function parse(docblock: string): Pragmas;

export declare function parseWithComments(docblock: string): {
  comments: string;
  pragmas: Pragmas;
};

declare type Pragmas = Record<string, string | Array<string>>;

declare function print_2({
  comments,
  pragmas,
}: {
  comments?: string;
  pragmas?: Pragmas;
}): string;
export {print_2 as print};

export declare function strip(contents: string): string;

export {};
