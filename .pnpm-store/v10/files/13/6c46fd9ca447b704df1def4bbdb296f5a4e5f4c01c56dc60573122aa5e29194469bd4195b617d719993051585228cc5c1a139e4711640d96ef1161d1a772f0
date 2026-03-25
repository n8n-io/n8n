// @flow

export default function memoize<V>(fn: string => V): string => V {
  const cache = Object.create(null)

  return (arg: string) => {
    if (cache[arg] === undefined) cache[arg] = fn(arg)
    return cache[arg]
  }
}
