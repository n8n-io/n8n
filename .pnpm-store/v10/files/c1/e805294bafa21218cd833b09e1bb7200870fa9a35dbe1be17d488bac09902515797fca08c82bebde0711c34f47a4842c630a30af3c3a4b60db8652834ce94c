/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type {Global} from '@jest/types';

export declare function bind<EachCallback extends Global.TestCallback>(
  cb: GlobalCallback,
  supportsDone?: boolean,
  needsEachError?: boolean,
): Global.EachTestFn<any>;

declare const each: {
  (table: Global.EachTable, ...data: Global.TemplateData): ReturnType<
    typeof install
  >;
  withGlobal(g: Global): (
    table: Global.EachTable,
    ...data: Global.TemplateData
  ) => {
    describe: {
      (
        title: string,
        suite: Global.EachTestFn<Global.BlockFn>,
        timeout?: number,
      ): any;
      skip: any;
      only: any;
    };
    fdescribe: any;
    fit: any;
    it: {
      (
        title: string,
        test: Global.EachTestFn<Global.TestFn>,
        timeout?: number,
      ): any;
      skip: any;
      only: any;
      concurrent: {
        (
          title: string,
          test: Global.EachTestFn<Global.TestFn>,
          timeout?: number,
        ): any;
        only: any;
        skip: any;
      };
    };
    test: {
      (
        title: string,
        test: Global.EachTestFn<Global.TestFn>,
        timeout?: number,
      ): any;
      skip: any;
      only: any;
      concurrent: {
        (
          title: string,
          test: Global.EachTestFn<Global.TestFn>,
          timeout?: number,
        ): any;
        only: any;
        skip: any;
      };
    };
    xdescribe: any;
    xit: any;
    xtest: any;
  };
};
export default each;

declare type GlobalCallback = (
  testName: string,
  fn: Global.ConcurrentTestFn,
  timeout?: number,
  eachError?: Error,
) => void;

declare const install: (
  g: Global,
  table: Global.EachTable,
  ...data: Global.TemplateData
) => {
  describe: {
    (
      title: string,
      suite: Global.EachTestFn<Global.BlockFn>,
      timeout?: number,
    ): any;
    skip: any;
    only: any;
  };
  fdescribe: any;
  fit: any;
  it: {
    (
      title: string,
      test: Global.EachTestFn<Global.TestFn>,
      timeout?: number,
    ): any;
    skip: any;
    only: any;
    concurrent: {
      (
        title: string,
        test: Global.EachTestFn<Global.TestFn>,
        timeout?: number,
      ): any;
      only: any;
      skip: any;
    };
  };
  test: {
    (
      title: string,
      test: Global.EachTestFn<Global.TestFn>,
      timeout?: number,
    ): any;
    skip: any;
    only: any;
    concurrent: {
      (
        title: string,
        test: Global.EachTestFn<Global.TestFn>,
        timeout?: number,
      ): any;
      only: any;
      skip: any;
    };
  };
  xdescribe: any;
  xit: any;
  xtest: any;
};

export {};
