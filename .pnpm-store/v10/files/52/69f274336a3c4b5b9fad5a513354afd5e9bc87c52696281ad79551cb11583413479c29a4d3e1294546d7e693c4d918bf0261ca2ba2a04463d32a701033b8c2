# ts-type

**TypeScript 類型工具庫** / **TypeScript Type Utility Library**

提供豐富的 TypeScript 類型操作工具和重新導出的內建類型，支援雙語註解（繁體中文 + 英文）。

Provides rich TypeScript type manipulation utilities and re-exported built-in types with bilingual comments (Traditional Chinese + English).

see [index.d.ts](https://github.com/bluelovers/ws-ts-type/tree/master/packages/ts-type/index.d.ts)

## 安裝 / Installation

```bash
# npm
npm install ts-type

# yarn
yarn add ts-type

# pnpm
pnpm add ts-type
```

## 範例 / Examples

- [demo](https://github.com/bluelovers/ws-ts-type/tree/master/packages/ts-type/test/demo)
- 

### ITSOverwrite

```ts
export interface A1
{
	s: string
}

export type A2 = ITSOverwrite<A1, {
	s: number,
}>
export declare let a2: A2;
// a2.s is number
```

### ITSOverwriteReturnType

覆寫函數返回值類型 / Overwrite function return type

```ts
import { ITSOverwriteReturnType } from '..';

declare function f(a: number): number

declare let c: ITSOverwriteReturnType<typeof f, string>;
// c is (a: number) => string
// c(1).toUpperCase()
```

### Promise / Bluebird / PromiseLike

Promise 相關類型操作 / Promise related type operations

```nodemon
npm install @types/bluebird ts-type
```

```ts
export declare function p1(a: number): Promise<number>

export declare let p1_v: ITSUnpackedReturnType<typeof p1>;

p1_v.toFixed()

export declare let p2: ITSWrapFunctionPromise<typeof p1>;
export declare let p3: ITSWrapFunctionBluebird<typeof p2>;
export declare let p4: ITSWrapFunctionBluebird<typeof p1>;

p2(1).then(v => v.toFixed())
p3(1).then(v => v.toFixed())
p4(1).then(v => v.toFixed())
```

### this 類型操作 / this Type Operations

操作函數的 this 類型 / Manipulate function's this type

```ts
export declare function t1(this: string, a: number): Promise<number>

export declare let t1_this: ITSUnpackedThisFunction<typeof t1>;

// => t1_this is string
```

```ts
export declare function t2(this: string, a: number): number

export declare let t3: ITSOverwriteThisFunction<number, typeof t2>;

t3 = function ()
{
	this.toFixed() // => this is number

	return 1
}
```

```ts
interface Function2 extends Function
{
	bind<T extends any, F extends (...args: any[]) => any>(this: F, thisArg: T, ...argArray: any[]): ITSOverwriteThisFunction<T, F>;
}

export interface t4 extends Function2
{
	(): string
}

export declare let t5: t4

export let t6 = t5.bind([] as string[])

t6 = function ()
{
	this.includes('') // => this is string[]

	return ''
}
```

## 文檔 / Documentation

詳細的類型工具說明文件請參閱 [docs/](docs/) 目錄。

For detailed type utility documentation, see the [docs/](docs/) directory.

### 分類指南 / Category Guide

- [基礎類型](docs/01-base-types.md) - 基礎類型別名與工具 / Base type aliases and utilities
- [內建類型](docs/02-built-in-types.md) - 重新導出的內建類型 / Re-exported built-in types
- [函數類型工具](docs/03-function-types.md) - 函數類型操作 / Function type operations
- [Promise 類型工具](docs/04-promise-types.md) - Promise 相關類型 / Promise related types
- [陣列與元組類型](docs/05-array-tuple-types.md) - 陣列與元組操作 / Array and tuple operations
- [物件與記錄類型](docs/06-object-record-types.md) - 物件類型操作 / Object type operations
- [字串與數字類型](docs/07-string-number-types.md) - 字串與數字類型操作 / String and number operations
- [邏輯類型工具](docs/08-logic-types.md) - 類型層級邏輯判斷 / Type-level logic

## 其他相關專案 / Related Projects

- [callable-instance2](https://www.npmjs.com/package/callable-instance2) - create an ES6 class that is callable as a function
- https://github.com/piotrwitek/utility-types
- 

## 文件與教學 / Documentation & Tutorials

- http://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-1.html
- https://www.tslang.cn/docs/release-notes/typescript-3.1.html#toc-whats-new
- https://www.logicbig.com/tutorials/misc/typescript.html

## 相關連結 / Related Links

- https://github.com/krzkaczor/ts-essentials
- https://github.com/millsp/ts-toolbelt
- https://github.com/type-challenges/type-challenges
- https://github.com/andnp/SimplyTyped
- https://github.com/piotrwitek/utility-types
- 
