import { TableOptionsResolved, TableState, Updater } from './types'

export type PartialKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredKeys<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>
export type Overwrite<T, U extends { [TKey in keyof T]?: any }> = Omit<
  T,
  keyof U
> &
  U

export type UnionToIntersection<T> = (
  T extends any ? (x: T) => any : never
) extends (x: infer R) => any
  ? R
  : never

export type IsAny<T, Y, N> = 1 extends 0 & T ? Y : N
export type IsKnown<T, Y, N> = unknown extends T ? N : Y

type ComputeRange<
  N extends number,
  Result extends Array<unknown> = [],
> = Result['length'] extends N
  ? Result
  : ComputeRange<N, [...Result, Result['length']]>
type Index40 = ComputeRange<40>[number]

// Is this type a tuple?
type IsTuple<T> = T extends readonly any[] & { length: infer Length }
  ? Length extends Index40
    ? T
    : never
  : never

// If this type is a tuple, what indices are allowed?
type AllowedIndexes<
  Tuple extends ReadonlyArray<any>,
  Keys extends number = never,
> = Tuple extends readonly []
  ? Keys
  : Tuple extends readonly [infer _, ...infer Tail]
    ? AllowedIndexes<Tail, Keys | Tail['length']>
    : Keys

export type DeepKeys<T, TDepth extends any[] = []> = TDepth['length'] extends 5
  ? never
  : unknown extends T
    ? string
    : T extends readonly any[] & IsTuple<T>
      ? AllowedIndexes<T> | DeepKeysPrefix<T, AllowedIndexes<T>, TDepth>
      : T extends any[]
        ? DeepKeys<T[number], [...TDepth, any]>
        : T extends Date
          ? never
          : T extends object
            ? (keyof T & string) | DeepKeysPrefix<T, keyof T, TDepth>
            : never

type DeepKeysPrefix<
  T,
  TPrefix,
  TDepth extends any[],
> = TPrefix extends keyof T & (number | string)
  ? `${TPrefix}.${DeepKeys<T[TPrefix], [...TDepth, any]> & string}`
  : never

export type DeepValue<T, TProp> =
  T extends Record<string | number, any>
    ? TProp extends `${infer TBranch}.${infer TDeepProp}`
      ? DeepValue<T[TBranch], TDeepProp>
      : T[TProp & string]
    : never

export type NoInfer<T> = [T][T extends any ? 0 : never]

export type Getter<TValue> = <TTValue = TValue>() => NoInfer<TTValue>

///

export function functionalUpdate<T>(updater: Updater<T>, input: T): T {
  return typeof updater === 'function'
    ? (updater as (input: T) => T)(input)
    : updater
}

export function noop() {
  //
}

export function makeStateUpdater<K extends keyof TableState>(
  key: K,
  instance: unknown
) {
  return (updater: Updater<TableState[K]>) => {
    ;(instance as any).setState(<TTableState>(old: TTableState) => {
      return {
        ...old,
        [key]: functionalUpdate(updater, (old as any)[key]),
      }
    })
  }
}

type AnyFunction = (...args: any) => any

export function isFunction<T extends AnyFunction>(d: any): d is T {
  return d instanceof Function
}

export function isNumberArray(d: any): d is number[] {
  return Array.isArray(d) && d.every(val => typeof val === 'number')
}

export function flattenBy<TNode>(
  arr: TNode[],
  getChildren: (item: TNode) => TNode[]
) {
  const flat: TNode[] = []

  const recurse = (subArr: TNode[]) => {
    subArr.forEach(item => {
      flat.push(item)
      const children = getChildren(item)
      if (children?.length) {
        recurse(children)
      }
    })
  }

  recurse(arr)

  return flat
}

export function memo<TDeps extends readonly any[], TDepArgs, TResult>(
  getDeps: (depArgs?: TDepArgs) => [...TDeps],
  fn: (...args: NoInfer<[...TDeps]>) => TResult,
  opts: {
    key: any
    debug?: () => any
    onChange?: (result: TResult) => void
  }
): (depArgs?: TDepArgs) => TResult {
  let deps: any[] = []
  let result: TResult | undefined

  return depArgs => {
    let depTime: number
    if (opts.key && opts.debug) depTime = Date.now()

    const newDeps = getDeps(depArgs)

    const depsChanged =
      newDeps.length !== deps.length ||
      newDeps.some((dep: any, index: number) => deps[index] !== dep)

    if (!depsChanged) {
      return result!
    }

    deps = newDeps

    let resultTime: number
    if (opts.key && opts.debug) resultTime = Date.now()

    result = fn(...newDeps)
    opts?.onChange?.(result)

    if (opts.key && opts.debug) {
      if (opts?.debug()) {
        const depEndTime = Math.round((Date.now() - depTime!) * 100) / 100
        const resultEndTime = Math.round((Date.now() - resultTime!) * 100) / 100
        const resultFpsPercentage = resultEndTime / 16

        const pad = (str: number | string, num: number) => {
          str = String(str)
          while (str.length < num) {
            str = ' ' + str
          }
          return str
        }

        console.info(
          `%c⏱ ${pad(resultEndTime, 5)} /${pad(depEndTime, 5)} ms`,
          `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(
              0,
              Math.min(120 - 120 * resultFpsPercentage, 120)
            )}deg 100% 31%);`,
          opts?.key
        )
      }
    }

    return result!
  }
}

export function getMemoOptions(
  tableOptions: Partial<TableOptionsResolved<any>>,
  debugLevel:
    | 'debugAll'
    | 'debugCells'
    | 'debugTable'
    | 'debugColumns'
    | 'debugRows'
    | 'debugHeaders',
  key: string,
  onChange?: (result: any) => void
) {
  return {
    debug: () => tableOptions?.debugAll ?? tableOptions[debugLevel],
    key: process.env.NODE_ENV === 'development' && key,
    onChange,
  }
}
