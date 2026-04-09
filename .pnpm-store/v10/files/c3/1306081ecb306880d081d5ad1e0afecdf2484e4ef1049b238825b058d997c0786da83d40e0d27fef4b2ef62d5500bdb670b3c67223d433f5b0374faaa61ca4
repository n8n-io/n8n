// License for this File only:
//
// MIT License
//
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
// Copyright (c) Vercel, Inc. (https://vercel.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
// to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or substantial portions
// of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
// TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
// THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
// CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

/**
 * Create a union of the given object's values, and optionally specify which keys to get the values from.
 *
 * Please upvote [this issue](https://github.com/microsoft/TypeScript/issues/31438) if you want to have this type as a built-in in TypeScript.
 *
 * @example
 * ```
 * // data.json
 * {
 * 	'foo': 1,
 * 	'bar': 2,
 * 	'biz': 3
 * }
 *
 * // main.ts
 * import type {ValueOf} from 'type-fest';
 * import data = require('./data.json');
 *
 * export function getData(name: string): ValueOf<typeof data> {
 * 	return data[name];
 * }
 *
 * export function onlyBar(name: string): ValueOf<typeof data, 'bar'> {
 * 	return data[name];
 * }
 *
 * // file.ts
 * import {getData, onlyBar} from './main';
 *
 * getData('foo');
 * //=> 1
 *
 * onlyBar('foo');
 * //=> TypeError ...
 *
 * onlyBar('bar');
 * //=> 2
 * ```
 * @see https://github.com/sindresorhus/type-fest/blob/main/source/value-of.d.ts
 */
export type ValueOf<
  ObjectType,
  ValueType extends keyof ObjectType = keyof ObjectType,
> = ObjectType[ValueType];
