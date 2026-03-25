// @flow

// Type definitions taken from https://github.com/gcanti/flow-static-land/blob/master/src/Fun.js
type Fn1<A, B> = (a: A, ...rest: Array<void>) => B
type Fn2<A, B, C> = (a: A, b: B, ...rest: Array<void>) => C
type Fn3<A, B, C, D> = (a: A, b: B, c: C, ...rest: Array<void>) => D

type CurriedFn2<A, B, C> = Fn1<A, Fn1<B, C>> & Fn2<A, B, C>
// eslint-disable-next-line no-unused-vars
type CurriedFn3<A, B, C, D> = Fn1<A, CurriedFn2<B, C, D>> & Fn2<A, B, Fn1<C, D>> & Fn3<A, B, C, D>

// eslint-disable-next-line no-unused-vars
declare function curry<A, B, C>(f: Fn2<A, B, C>): CurriedFn2<A, B, C>
// eslint-disable-next-line no-redeclare
declare function curry<A, B, C, D>(f: Fn3<A, B, C, D>): CurriedFn3<A, B, C, D>

function curried(f: Function, length: number, acc: Array<any>): Function {
  return function fn() {
    // eslint-disable-next-line prefer-rest-params
    const combined = acc.concat(Array.prototype.slice.call(arguments))
    return combined.length >= length ? f.apply(this, combined) : curried(f, length, combined)
  }
}

// eslint-disable-next-line no-redeclare
export default function curry(f: Function): Function {
  // eslint-disable-line no-redeclare
  return curried(f, f.length, [])
}
