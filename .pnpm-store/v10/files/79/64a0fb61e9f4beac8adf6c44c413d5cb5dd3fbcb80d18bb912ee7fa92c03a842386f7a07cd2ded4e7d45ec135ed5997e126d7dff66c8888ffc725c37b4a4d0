/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type {Circus} from '@jest/types';
import type {Global} from '@jest/types';

export declare const afterAll: THook;

export declare const afterEach: THook;

export declare const beforeAll: THook;

export declare const beforeEach: THook;

declare const _default: {
  afterAll: THook;
  afterEach: THook;
  beforeAll: THook;
  beforeEach: THook;
  describe: {
    (blockName: Global.BlockNameLike, blockFn: Global.BlockFn): void;
    each: Global.EachTestFn<any>;
    only: {
      (blockName: Global.BlockNameLike, blockFn: Global.BlockFn): void;
      each: Global.EachTestFn<any>;
    };
    skip: {
      (blockName: Global.BlockNameLike, blockFn: Global.BlockFn): void;
      each: Global.EachTestFn<any>;
    };
  };
  it: Global.It;
  test: Global.It;
};
export default _default;

export declare const describe: {
  (blockName: Circus.BlockNameLike, blockFn: Circus.BlockFn): void;
  each: Global.EachTestFn<any>;
  only: {
    (blockName: Circus.BlockNameLike, blockFn: Circus.BlockFn): void;
    each: Global.EachTestFn<any>;
  };
  skip: {
    (blockName: Circus.BlockNameLike, blockFn: Circus.BlockFn): void;
    each: Global.EachTestFn<any>;
  };
};

declare type Event_2 = Circus.Event;
export {Event_2 as Event};

export declare const getState: () => Circus.State;

export declare const it: Global.It;

export declare const resetState: () => void;

export declare const run: () => Promise<Circus.RunResult>;

export declare const setState: (state: Circus.State) => Circus.State;

export declare type State = Circus.State;

export declare const test: Global.It;

declare type THook = (fn: Circus.HookFn, timeout?: number) => void;

export {};
