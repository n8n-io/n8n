# README

    add some typescript type and re-export some build-in typescript type

see [index.d.ts](https://github.com/bluelovers/ws-ts-type/tree/master/packages/ts-type/index.d.ts)

## install

```nodemon
npm install ts-type
```

## demo

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

```ts
import { ITSOverwriteReturnType } from '..';

declare function f(a: number): number

declare let c: ITSOverwriteReturnType<typeof f, string>;
// c is (a: number) => string
// c(1).toUpperCase()
```

### Promise / Bluebird / PromiseLike

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

### this

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

## other

- [callable-instance2](https://www.npmjs.com/package/callable-instance2) - create an ES6 class that is callable as a function
- https://github.com/piotrwitek/utility-types
- 

## docs

- http://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-1.html
- https://www.tslang.cn/docs/release-notes/typescript-3.1.html#toc-whats-new
- https://www.logicbig.com/tutorials/misc/typescript.html

## links

- https://github.com/krzkaczor/ts-essentials
- https://github.com/millsp/ts-toolbelt
- https://github.com/type-challenges/type-challenges
- https://github.com/andnp/SimplyTyped
- https://github.com/piotrwitek/utility-types
- 
