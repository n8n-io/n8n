/* eslint-disable @typescript-eslint/ban-types */

// DeepPartial implementation taken from the utility-types NPM package, which is
// Copyright (c) 2016 Piotr Witek <piotrek.witek@gmail.com> (http://piotrwitek.github.io)
// and used under the terms of the MIT license
export type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
    ? _DeepPartialArray<U>
    : T extends object
      ? _DeepPartialObject<T>
      : T | undefined;

type _DeepPartialArray<T> = Array<DeepPartial<T>>
type _DeepPartialObject<T> = { [P in keyof T]?: DeepPartial<T[P]> };

export type DistributiveArray<T> = [T] extends [unknown] ? Array<T> : never

// https://stackoverflow.com/a/50375286
export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export type AllKeys<T> = T extends any ? keyof T : never;

export type PickType<T, K extends AllKeys<T>> = T extends { [k in K]?: any }
  ? T[K]
  : undefined;

export type Merge<T extends object> = {
  [k in AllKeys<T>]: PickType<T, k>;
};
